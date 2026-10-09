/**
 * Mount one `dsh-mcp-client` instance per server saved from the Web settings page.
 *
 * @module @pipiduck/dsh-mcp-setting
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import {
  parseMcpJson, type McpSettingSettings, type McpSettingStatusSettings, type McpServerStatus, type ParsedMcpServer,
} from './model.ts'

export const name = 'dsh-mcp-setting'

/** Settings document, the loader that starts each MCP client, and the tool catalog used for status. */
export const inject = ['settings', 'loader', 'tools']

export const MCP_SETTING_NAMESPACE = 'dsh-mcp-setting'
export const MCP_SETTING_STATUS_NAMESPACE = 'dsh-mcp-setting-status'

export const SettingsSchema: z<McpSettingSettings> = z.object({
  configJson: z.string().default(''),
})

const StatusSchema: z<McpSettingStatusSettings> = z.object({
  servers: z.array(z.object({
    serverName: z.string().required(),
    transport: z.string().default(''),
    target: z.string().default(''),
    state: z.union([z.const('connecting'), z.const('connected'), z.const('error')]).default('connecting'),
    detail: z.string().default(''),
    toolCount: z.number().default(0),
    tools: z.array(z.object({
      name: z.string().required(),
      description: z.string().default(''),
    })).default([]),
  })).default([]),
})

const EMPTY: McpSettingSettings = { configJson: '' }
const EMPTY_STATUS: McpSettingStatusSettings = { servers: [] }

interface LiveServer {
  id: string
  fingerprint: string
}

interface LoaderApi {
  create(options: { id: string, name: string, config: Record<string, unknown> }): Promise<string>
  remove(id: string): Promise<void>
}

interface ToolsApi {
  schemas(): ReadonlyArray<{ name: string, description?: string }>
}

/** Start, replace, and stop MCP client rows to match the saved list. */
export function apply(ctx: Context): void {
  const host = ctx as Context & { loader: LoaderApi, tools: ToolsApi, settings: { replace(ns: string, section: object): Promise<void> } }
  const live = new Map<string, LiveServer>()
  const failures = new Map<string, string>()
  let source = (): McpSettingSettings => EMPTY
  let chain: Promise<void> = Promise.resolve()
  let published = ''

  const publish = (servers: readonly ParsedMcpServer[], errors: ReadonlyMap<string, string>): void => {
    const next = { servers: statusRows(servers, live, errors, host.tools) }
    const encoded = JSON.stringify(next)
    if (encoded === published) return
    published = encoded
    void host.settings.replace(MCP_SETTING_STATUS_NAMESPACE, next).catch((error: unknown) => {
      published = ''
      ctx.logger.error(error)
    })
  }

  const reconcile = (settings: McpSettingSettings): void => {
    chain = chain.then(async () => {
      const servers = parseMcpJson(settings.configJson)
      await sync(host.loader, live, failures, servers, message => { ctx.logger.error(message) })
      publish(servers, failures)
    }).catch((error: unknown) => {
      ctx.logger.error(error)
    })
  }

  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.installSection(ctx, MCP_SETTING_STATUS_NAMESPACE, StatusSchema, EMPTY_STATUS, {
      setSource: () => {},
      onChange: () => {},
    })
    settingsCtx.settings.installSection(ctx, MCP_SETTING_NAMESPACE, SettingsSchema, EMPTY, {
      validate: value => { parseMcpJson(value.configJson) },
      setSource: (current) => { source = current },
      onChange: () => { reconcile(source()) },
    })
  })

  ctx.effect(() => {
    const timer = setInterval(() => { publish(parseMcpJson(source().configJson), failures) }, 3000)
    const nodeTimer = timer as unknown as { unref?: () => void }
    nodeTimer.unref?.()
    return () => {
      clearInterval(timer)
      const stopping = [...live.values()].map(entry => host.loader.remove(entry.id))
      live.clear()
      return Promise.all(stopping).then(() => undefined)
    }
  }, 'dsh-mcp-setting: status and unload')
}

function statusRows(
  servers: readonly ParsedMcpServer[],
  live: ReadonlyMap<string, LiveServer>,
  failures: ReadonlyMap<string, string>,
  tools: ToolsApi,
): McpServerStatus[] {
  const names = tools.schemas()
  return servers.map((server) => {
    const target = typeof server.config.url === 'string'
      ? server.config.url
      : typeof server.config.command === 'string' ? server.config.command : ''
    const transport = typeof server.config.transport === 'string' ? server.config.transport : ''
    const prefix = `mcp__${server.serverName}__`
    const tools = names
      .filter(tool => tool.name.startsWith(prefix))
      .map(tool => ({
        name: tool.name.slice(prefix.length),
        description: tool.description ?? '',
      }))
    const toolCount = tools.length
    const base = { serverName: server.serverName, transport, target, toolCount, tools }
    const failure = failures.get(server.serverName)
    if (failure !== undefined) {
      return { ...base, state: 'error' as const, detail: failure }
    }
    if (!live.has(server.serverName)) {
      return { ...base, state: 'connecting' as const, detail: '' }
    }
    if (toolCount > 0) {
      return { ...base, state: 'connected' as const, detail: '' }
    }
    return { ...base, state: 'error' as const, detail: '没有发现工具，连接可能失败' }
  })
}

async function sync(
  loader: LoaderApi,
  live: Map<string, LiveServer>,
  failures: Map<string, string>,
  servers: readonly ParsedMcpServer[],
  report: (message: string) => void,
): Promise<void> {
  const wanted = new Set(servers.map(server => server.serverName))
  for (const [serverName, entry] of [...live]) {
    if (wanted.has(serverName)) continue
    await loader.remove(entry.id)
    live.delete(serverName)
    failures.delete(serverName)
  }
  for (const server of servers) {
    const { config } = server
    const fingerprint = JSON.stringify(config)
    const current = live.get(server.serverName)
    if (current?.fingerprint === fingerprint) continue
    if (current !== undefined) {
      await loader.remove(current.id)
      live.delete(server.serverName)
    }
    const id = `dsh-mcp-setting-${server.serverName}`
    try {
      await loader.create({ id, name: '@deepseek-ai/dsh-mcp-client', config })
      failures.delete(server.serverName)
      live.set(server.serverName, { id, fingerprint })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.set(server.serverName, message)
      report(`dsh-mcp-setting: 没能挂上 ${server.serverName}：${message}`)
    }
  }
}

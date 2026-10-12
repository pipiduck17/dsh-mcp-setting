/**
 * Mount one `dsh-mcp-client` instance per server saved from the Web settings page.
 *
 * @module @pipiduck/dsh-mcp-setting
 */

import type { Context, Volatile } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import {
  parseMcpJson, type McpSettingSettings, type McpSettingStatusSettings, type McpServerStatus, type ParsedMcpServer,
} from './model.ts'

export const name = 'dsh-mcp-setting'

/** Settings document, the loader that starts each MCP client, and the tool catalog used for status. */
export const inject = ['loader', 'tools']

export const MCP_SETTING_ENTRY = 'dsh-mcp-setting'

/** Saved JSON plus the live server list the page reads back. */
export interface Config {
  configJson: Volatile<string>
  servers: Volatile<McpServerStatus[]>
}

const ServerStatusSchema = z.object({
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
})

export const Config: z<Config> = z.object({
  configJson: z.string().default('').volatile(),
  servers: z.array(ServerStatusSchema).default([]).volatile(),
})

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

/**
 * 按已保存的 JSON，为每台服务器保持一行 `dsh-mcp-client`。
 *
 * 设置页只存文本。这个函数把文本变成正在运行的客户端，并把连接状态写回去给页面读。
 * @param ctx - 宿主插件上下文。`inject` 提供 loader、tools。
 */
export function apply(ctx: Context, config: Config): void {
  const host = ctx as Context & { loader: LoaderApi, tools: ToolsApi }
  // 当前已挂上的服务器。fingerprint 是该服务器配置的 JSON。
  const live = new Map<string, LiveServer>()
  // 每台服务器最近一次 create() 失败。之后创建成功会删掉这条记录。
  const failures = new Map<string, string>()
  const source = (): McpSettingSettings => ({ configJson: config.configJson.get() })
  // 挂载排队执行，避免连续两次保存把同一台服务器创建两次。
  let chain: Promise<void> = Promise.resolve()
  // 上次写入的状态 JSON。轮询结果没变就不再写设置。
  let published = ''

  /** 用已挂上的服务器和当前工具目录，重写状态段。 */
  const publish = (servers: readonly ParsedMcpServer[], errors: ReadonlyMap<string, string>): void => {
    const next = { servers: statusRows(servers, live, errors, host.tools) }
    const encoded = JSON.stringify(next)
    if (encoded === published) return
    published = encoded
    const settings = ctx.get('settings') as { update(ns: string, patch: object): Promise<void> } | undefined
    if (!settings) {
      published = ''
      return
    }
    // 只合并 servers，避免状态刷新盖掉用户正在保存的 JSON。
    void settings.update(MCP_SETTING_ENTRY, { servers: next.servers }).catch((error: unknown) => {
      published = ''
      ctx.logger.error(error)
    })
  }

  /** 解析已保存的 JSON，按名单挂上或卸掉客户端，然后发布状态。 */
  const reconcile = (settings: McpSettingSettings): void => {
    chain = chain.then(async () => {
      const servers = parseMcpJson(settings.configJson)
      await sync(host.loader, live, failures, servers, message => { ctx.logger.error(message) })
      publish(servers, failures)
    }).catch((error: unknown) => {
      ctx.logger.error(error)
    })
  }

  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })
  ctx.on('loader/volatile-update', (paths: readonly (readonly string[])[]) => {
    if (!paths.some(path => path[0] === 'configJson')) return
    reconcile(source())
  })
  reconcile(source())

  ctx.effect(() => {
    // 客户端挂上之后工具才可能出现。插件卸掉前持续刷新状态。
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

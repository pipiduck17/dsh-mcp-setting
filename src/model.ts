/** One server taken from a Cursor-style `mcp.json` object. */

export interface ParsedMcpServer {
  /** Object key, used as `mcp__<serverName>__…`. */
  serverName: string
  /** Config passed to one `@deepseek-ai/dsh-mcp-client` instance. */
  config: Record<string, unknown>
}

/** Settings section: the JSON text the page edits. */
export interface McpSettingSettings {
  configJson: string
}

/** Live view of one saved server. The host writes this; the page only reads it. */
export interface McpServerStatus {
  serverName: string
  /** `stdio` or `streamable-http`. */
  transport: string
  /** Command or URL, for the status row. */
  target: string
  state: 'connecting' | 'connected' | 'error'
  /** Error text when `state` is `error`; otherwise empty. */
  detail: string
  /** Tools currently registered as `mcp__<serverName>__*`. */
  toolCount: number
  /** Registered tools, with the `mcp__<serverName>__` prefix removed from `name`. */
  tools: Array<{ name: string, description: string }>
}

/** Status section published by the host. */
export interface McpSettingStatusSettings {
  servers: McpServerStatus[]
}

const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/

/**
 * Read a Cursor MCP snippet.
 *
 * Accepts `{ "name": { "url" | "command" } }`, a full `{ "mcpServers": { … } }`
 * document, or a fragment that is only `"name": { … }` without the outer braces.
 * @param text - the textarea contents.
 * @returns one client config per server. Empty text is an empty list.
 */
export function parseMcpJson(text: string): ParsedMcpServer[] {
  const trimmed = text.trim()
  if (trimmed.length === 0) return []
  const value = parseJsonObject(trimmed)
  const table = unwrapServers(value)
  return Object.entries(table).map(([serverName, entry]) => {
    if (!SERVER_NAME.test(serverName)) {
      throw new Error(`服务器名「${serverName}」只能用字母、数字、下划线和短横线，最长 32 个字符`)
    }
    return { serverName, config: toClientConfig(serverName, entry) }
  })
}

function parseJsonObject(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    // A copied mcp.json entry is `"name": { … }` and is not a JSON value by itself.
  }
  try {
    return JSON.parse(`{${text}}`) as unknown
  } catch (error) {
    throw new Error(`JSON 无法解析：${error instanceof Error ? error.message : String(error)}`)
  }
}

function unwrapServers(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('需要一个 JSON 对象，键是服务器名')
  const nested = value.mcpServers
  const table = nested === undefined ? value : nested
  if (!isRecord(table)) throw new Error('mcpServers 需要是一个对象')
  return table
}

function toClientConfig(serverName: string, entry: unknown): Record<string, unknown> {
  if (!isRecord(entry)) throw new Error(`${serverName} 的配置需要是一个对象`)
  const type = typeof entry.type === 'string' ? entry.type : undefined
  if (type === 'sse') throw new Error(`${serverName} 用了 sse，这里只支持 stdio 和带 url 的 HTTP`)
  if (typeof entry.command === 'string' || type === 'stdio') {
    if (typeof entry.command !== 'string' || entry.command.trim().length === 0) {
      throw new Error(`${serverName} 需要填写 command`)
    }
    return {
      transport: 'stdio',
      serverName,
      command: entry.command,
      args: stringList(entry.args, `${serverName} 的 args`),
      env: stringRecord(entry.env, `${serverName} 的 env`),
      cwd: typeof entry.cwd === 'string' ? entry.cwd : '',
      failOnStartupError: false,
    }
  }
  if (typeof entry.url === 'string' || type === 'http' || type === 'streamable-http') {
    if (typeof entry.url !== 'string' || entry.url.trim().length === 0) {
      throw new Error(`${serverName} 需要填写 url`)
    }
    return {
      transport: 'streamable-http',
      serverName,
      url: entry.url,
      headers: stringRecord(entry.headers, `${serverName} 的 headers`),
      failOnStartupError: false,
    }
  }
  throw new Error(`${serverName} 需要 url，或者 command`)
}

function stringList(value: unknown, label: string): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`${label} 需要是字符串数组`)
  }
  return value
}

function stringRecord(value: unknown, label: string): Record<string, string> {
  if (value === undefined) return {}
  if (!isRecord(value) || Object.values(value).some(item => typeof item !== 'string')) {
    throw new Error(`${label} 需要是字符串字段`)
  }
  return value as Record<string, string>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

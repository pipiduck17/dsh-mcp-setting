/**
 * Settings page that stores Cursor-style MCP JSON.
 *
 * @module @siasywang/dsh-mcp-setting/client
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import { parseMcpJson, type McpSettingSettings, type McpSettingStatusSettings } from './model.ts'

const NS = 'settings.dshMcpSetting'

const PLACEHOLDER = `{
  "iWiki": {
    "url": "https://prod.mcp.it.woa.com/app_iwiki_mcp/mcp3",
    "headers": {
      "Authorization": "Bearer <token>"
    }
  }
}`

const zh = {
  nav: 'MCP',
  intro: '配置MCP，保存后下一轮对话可用',
  save: '保存',
  saving: '保存中…',
  saved: '已保存',
  unavailable: '当前页面不能把设置写到本机。用 127.0.0.1 打开后再保存。',
  none: '还没有已保存的 MCP。',
  connecting: '连接中',
  connected: '已连接',
  error: '失败',
  tools: '{count} 个工具',
  edit: '编辑',
  closeEdit: '完成',
  format: '格式化',
  attention: '需要关注',
  connectedGroup: '已连接',
  expand: '展开',
  collapse: '收起',
  toolsPending: '工具名称还在同步。',
} as const

const en: Record<keyof typeof zh, string> = {
  nav: 'MCP',
  intro: 'Configure MCP. Saved servers are available on the next turn.',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved',
  unavailable: 'This page cannot store settings on the host. Open it through 127.0.0.1, then save.',
  none: 'No saved MCP servers yet.',
  connecting: 'Connecting',
  connected: 'Connected',
  error: 'Failed',
  tools: '{count} tools',
  edit: 'Edit',
  closeEdit: 'Done',
  format: 'Format',
  attention: 'Needs attention',
  connectedGroup: 'Connected',
  expand: 'Expand',
  collapse: 'Collapse',
  toolsPending: 'Tool names are still syncing.',
}

export const inject = ['slots', 'locale', 'settingsScope']

/** Register the MCP settings page. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const disposeZh = ctx.locale.register(NS, 'zh', zh)
    const disposeEn = ctx.locale.register(NS, 'en', en)
    return () => {
      disposeZh()
      disposeEn()
    }
  }, 'dsh-mcp-setting: dictionaries')
  const t = ctx.locale.bind(NS as never) as (key: keyof typeof zh, params?: Record<string, unknown>) => string
  const scope = ctx.settingsScope.bind<McpSettingSettings>({ namespace: 'dsh-mcp-setting' })
  const status = ctx.settingsScope.bind<McpSettingStatusSettings>({ namespace: 'dsh-mcp-setting-status' })
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'dsh-mcp-setting',
    order: 30,
    label: () => t('nav'),
    inject: () => ({ scope, status, t }),
  }, McpSection))
}

interface SectionProps {
  close: () => void
  scope: SettingsScope<McpSettingSettings>
  status: SettingsScope<McpSettingStatusSettings>
  t: (key: keyof typeof zh, params?: Record<string, unknown>) => string
}

/** Pretty-print Cursor MCP JSON, including a `"name": { … }` fragment. */
function formatMcpJson(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length === 0) return ''
  let value: unknown
  try {
    value = JSON.parse(trimmed) as unknown
  } catch {
    value = JSON.parse(`{${trimmed}}`) as unknown
  }
  return JSON.stringify(value, null, 2)
}

type JsonKind = 'key' | 'string' | 'number' | 'keyword' | 'punct' | 'plain'

const JSON_COLOR: Record<JsonKind, string | undefined> = {
  key: 'var(--shiki-token-function)',
  string: 'var(--shiki-token-string)',
  number: 'var(--shiki-token-constant)',
  keyword: 'var(--shiki-token-keyword)',
  punct: 'var(--shiki-token-punctuation)',
  plain: undefined,
}

/** Split JSON text into colored pieces. Incomplete text stays colored up to the break. */
function tokenizeJson(source: string): Array<{ kind: JsonKind, text: string }> {
  const tokens: Array<{ kind: JsonKind, text: string }> = []
  let index = 0
  while (index < source.length) {
    const char = source[index] ?? ''
    if (char === '"') {
      const start = index
      index += 1
      while (index < source.length) {
        if (source[index] === '\\') {
          index += 2
          continue
        }
        if (source[index] === '"') {
          index += 1
          break
        }
        index += 1
      }
      let look = index
      while (look < source.length && /\s/.test(source[look] ?? '')) look += 1
      tokens.push({ kind: source[look] === ':' ? 'key' : 'string', text: source.slice(start, index) })
      continue
    }
    if (/\s/.test(char)) {
      const start = index
      index += 1
      while (index < source.length && /\s/.test(source[index] ?? '')) index += 1
      tokens.push({ kind: 'plain', text: source.slice(start, index) })
      continue
    }
    if ('{}[]:,'.includes(char)) {
      tokens.push({ kind: 'punct', text: char })
      index += 1
      continue
    }
    if (/[-0-9]/.test(char)) {
      const start = index
      index += 1
      while (index < source.length && /[0-9.eE+-]/.test(source[index] ?? '')) index += 1
      tokens.push({ kind: 'number', text: source.slice(start, index) })
      continue
    }
    if (/[a-z]/i.test(char)) {
      const start = index
      index += 1
      while (index < source.length && /[a-z]/i.test(source[index] ?? '')) index += 1
      const text = source.slice(start, index)
      const kind = text === 'true' || text === 'false' || text === 'null' ? 'keyword' : 'plain'
      tokens.push({ kind, text })
      continue
    }
    tokens.push({ kind: 'plain', text: char })
    index += 1
  }
  return tokens
}

const JSON_TEXT: CSSProperties = {
  margin: 0,
  padding: '10px 12px',
  border: 0,
  fontFamily: 'var(--dsw-font-markdown-code-font-family), ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 13,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
  tabSize: 2,
  scrollbarGutter: 'stable',
}

/** Editable JSON field. The colored layer sits under a transparent textarea. */
function JsonEditor({
  value,
  placeholder,
  onChange,
}: {
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const colorRef = useRef<HTMLPreElement>(null)
  const shown = value.length > 0 ? value : placeholder
  const syncScroll = (): void => {
    const area = areaRef.current
    const color = colorRef.current
    if (area === null || color === null) return
    color.scrollTop = area.scrollTop
    color.scrollLeft = area.scrollLeft
  }
  return (
    <div style={{
      position: 'relative',
      border: '1px solid color-mix(in srgb, currentColor 16%, transparent)',
      borderRadius: 10,
      background: 'var(--shiki-background, var(--dsw-alias-markdown-code-block))',
      overflow: 'hidden',
    }}>
      <pre
        ref={colorRef}
        aria-hidden
        style={{
          ...JSON_TEXT,
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          color: 'var(--shiki-foreground, var(--dsw-alias-label-primary))',
          opacity: value.length > 0 ? 1 : 0.45,
        }}
      >
        {tokenizeJson(shown).map((token, tokenIndex) => (
          <span key={tokenIndex} style={{ color: JSON_COLOR[token.kind] }}>{token.text}</span>
        ))}
      </pre>
      <textarea
        ref={areaRef}
        value={value}
        rows={16}
        spellCheck={false}
        onScroll={syncScroll}
        style={{
          ...JSON_TEXT,
          position: 'relative',
          width: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          overflow: 'auto',
          color: 'transparent',
          caretColor: 'var(--shiki-foreground, var(--dsw-alias-label-primary))',
          background: 'transparent',
        }}
        onChange={event => { onChange(event.target.value) }}
      />
    </div>
  )
}

function McpSection({ scope, status, t }: SectionProps) {
  const snapshot = useSyncExternalStore(listener => scope.subscribe(listener), () => scope.getSnapshot())
  const statusSnapshot = useSyncExternalStore(listener => status.subscribe(listener), () => status.getSnapshot())
  const rows = statusSnapshot.value?.servers ?? []
  const attention = rows.filter(row => row.state !== 'connected')
  const connected = rows.filter(row => row.state === 'connected')
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (snapshot.value === undefined || editing) return
    setText(snapshot.value.configJson)
  }, [snapshot.value, editing])

  const openEditor = (): void => {
    const raw = snapshot.value?.configJson ?? text
    try {
      setText(formatMcpJson(raw))
    } catch {
      setText(raw)
    }
    setNotice('')
    setEditing(true)
  }

  const format = (): void => {
    try {
      setText(formatMcpJson(text))
      setNotice('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    }
  }

  const save = (): void => {
    setNotice('')
    let formatted = text
    try {
      parseMcpJson(text)
      formatted = formatMcpJson(text)
      setText(formatted)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
      return
    }
    setSaving(true)
    void scope.set('configJson', formatted).then(() => {
      setSaving(false)
      setNotice(t('saved'))
      setEditing(false)
    }, (error: unknown) => {
      setSaving(false)
      setNotice(error instanceof Error ? error.message : String(error))
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button type="button" onClick={() => { editing ? setEditing(false) : openEditor() }}>
          {editing ? t('closeEdit') : t('edit')}
        </button>
      </div>
      {rows.length === 0 ? <p style={{ margin: 0 }}>{t('none')}</p> : (
        <>
          <ServerGroup title={`${t('attention')} ${attention.length}`} rows={attention} t={t} />
          <ServerGroup title={`${t('connectedGroup')} ${connected.length}`} rows={connected} t={t} />
        </>
      )}
      {snapshot.writable === false && snapshot.status !== 'loading' && (
        <p style={{ margin: 0 }}>{t('unavailable')}</p>
      )}
      {editing && (
        <>
          <p style={{ margin: 0 }}>{t('intro')}</p>
          <JsonEditor
            value={text}
            placeholder={PLACEHOLDER}
            onChange={next => {
              setNotice('')
              setText(next)
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={format}>{t('format')}</button>
            <button type="button" disabled={saving || snapshot.writable === false} onClick={save}>
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </>
      )}
      {notice.length > 0 && <p style={{ margin: 0 }}>{notice}</p>}
    </div>
  )
}

function ServerGroup({
  title,
  rows,
  t,
}: {
  title: string
  rows: McpSettingStatusSettings['servers']
  t: SectionProps['t']
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())
  if (rows.length === 0) return null
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <ul style={{
        listStyle: 'none',
        margin: 0,
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid color-mix(in srgb, currentColor 16%, transparent)',
        borderRadius: 10,
      }}>
        {rows.map(row => {
          const tools = row.tools ?? []
          const expanded = open.has(row.serverName)
          const canExpand = row.state === 'connected'
          return (
            <li key={row.serverName} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden style={{
                  width: 8,
                  height: 8,
                  flex: '0 0 auto',
                  borderRadius: 99,
                  background: row.state === 'connected' ? '#3fb950' : row.state === 'connecting' ? '#d29922' : '#f85149',
                }} />
                <strong style={{ flex: '1 1 auto' }}>{row.serverName}</strong>
                {canExpand && (
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => {
                      setOpen(current => {
                        const next = new Set(current)
                        if (next.has(row.serverName)) next.delete(row.serverName)
                        else next.add(row.serverName)
                        return next
                      })
                    }}
                    style={{ flex: '0 0 auto', width: 'auto' }}
                  >
                    {expanded ? t('collapse') : t('expand')}
                  </button>
                )}
              </span>
              <span style={{ paddingLeft: 16, opacity: 0.8 }}>
                {row.state === 'connected'
                  ? t('tools', { count: row.toolCount })
                  : row.detail.length > 0 ? row.detail : t(row.state)}
              </span>
              {expanded && (
                tools.length === 0
                  ? <div style={{ paddingLeft: 16, opacity: 0.7 }}>{t('toolsPending')}</div>
                  : (
                    <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {tools.map(tool => (
                        <li key={tool.name}>
                          <div>{tool.name}</div>
                          {tool.description.length > 0 && (
                            <div style={{ opacity: 0.7, fontSize: 12 }}>{tool.description}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

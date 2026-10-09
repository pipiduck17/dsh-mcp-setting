window.__ModuleLoader__.load({
	id: "@siasywang/dsh-mcp-setting",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.tsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");

// src/model.ts
var SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/;
function parseMcpJson(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  const value = parseJsonObject(trimmed);
  const table = unwrapServers(value);
  return Object.entries(table).map(([serverName, entry]) => {
    if (!SERVER_NAME.test(serverName)) {
      throw new Error(`\u670D\u52A1\u5668\u540D\u300C${serverName}\u300D\u53EA\u80FD\u7528\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u4E0B\u5212\u7EBF\u548C\u77ED\u6A2A\u7EBF\uFF0C\u6700\u957F 32 \u4E2A\u5B57\u7B26`);
    }
    return { serverName, config: toClientConfig(serverName, entry) };
  });
}
function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
  }
  try {
    return JSON.parse(`{${text}}`);
  } catch (error) {
    throw new Error(`JSON \u65E0\u6CD5\u89E3\u6790\uFF1A${error instanceof Error ? error.message : String(error)}`);
  }
}
function unwrapServers(value) {
  if (!isRecord(value)) throw new Error("\u9700\u8981\u4E00\u4E2A JSON \u5BF9\u8C61\uFF0C\u952E\u662F\u670D\u52A1\u5668\u540D");
  const nested = value.mcpServers;
  const table = nested === void 0 ? value : nested;
  if (!isRecord(table)) throw new Error("mcpServers \u9700\u8981\u662F\u4E00\u4E2A\u5BF9\u8C61");
  return table;
}
function toClientConfig(serverName, entry) {
  if (!isRecord(entry)) throw new Error(`${serverName} \u7684\u914D\u7F6E\u9700\u8981\u662F\u4E00\u4E2A\u5BF9\u8C61`);
  const type = typeof entry.type === "string" ? entry.type : void 0;
  if (type === "sse") throw new Error(`${serverName} \u7528\u4E86 sse\uFF0C\u8FD9\u91CC\u53EA\u652F\u6301 stdio \u548C\u5E26 url \u7684 HTTP`);
  if (typeof entry.command === "string" || type === "stdio") {
    if (typeof entry.command !== "string" || entry.command.trim().length === 0) {
      throw new Error(`${serverName} \u9700\u8981\u586B\u5199 command`);
    }
    return {
      transport: "stdio",
      serverName,
      command: entry.command,
      args: stringList(entry.args, `${serverName} \u7684 args`),
      env: stringRecord(entry.env, `${serverName} \u7684 env`),
      cwd: typeof entry.cwd === "string" ? entry.cwd : "",
      failOnStartupError: false
    };
  }
  if (typeof entry.url === "string" || type === "http" || type === "streamable-http") {
    if (typeof entry.url !== "string" || entry.url.trim().length === 0) {
      throw new Error(`${serverName} \u9700\u8981\u586B\u5199 url`);
    }
    return {
      transport: "streamable-http",
      serverName,
      url: entry.url,
      headers: stringRecord(entry.headers, `${serverName} \u7684 headers`),
      failOnStartupError: false
    };
  }
  throw new Error(`${serverName} \u9700\u8981 url\uFF0C\u6216\u8005 command`);
}
function stringList(value, label) {
  if (value === void 0) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} \u9700\u8981\u662F\u5B57\u7B26\u4E32\u6570\u7EC4`);
  }
  return value;
}
function stringRecord(value, label) {
  if (value === void 0) return {};
  if (!isRecord(value) || Object.values(value).some((item) => typeof item !== "string")) {
    throw new Error(`${label} \u9700\u8981\u662F\u5B57\u7B26\u4E32\u5B57\u6BB5`);
  }
  return value;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/client.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var NS = "settings.dshMcpSetting";
var PLACEHOLDER = `{
  "iWiki": {
    "url": "https://prod.mcp.it.woa.com/app_iwiki_mcp/mcp3",
    "headers": {
      "Authorization": "Bearer <token>"
    }
  }
}`;
var zh = {
  nav: "MCP",
  intro: "\u914D\u7F6EMCP\uFF0C\u4FDD\u5B58\u540E\u4E0B\u4E00\u8F6E\u5BF9\u8BDD\u53EF\u7528",
  save: "\u4FDD\u5B58",
  saving: "\u4FDD\u5B58\u4E2D\u2026",
  saved: "\u5DF2\u4FDD\u5B58",
  unavailable: "\u5F53\u524D\u9875\u9762\u4E0D\u80FD\u628A\u8BBE\u7F6E\u5199\u5230\u672C\u673A\u3002\u7528 127.0.0.1 \u6253\u5F00\u540E\u518D\u4FDD\u5B58\u3002",
  none: "\u8FD8\u6CA1\u6709\u5DF2\u4FDD\u5B58\u7684 MCP\u3002",
  connecting: "\u8FDE\u63A5\u4E2D",
  connected: "\u5DF2\u8FDE\u63A5",
  error: "\u5931\u8D25",
  tools: "{count} \u4E2A\u5DE5\u5177",
  edit: "\u7F16\u8F91",
  closeEdit: "\u5B8C\u6210",
  format: "\u683C\u5F0F\u5316",
  attention: "\u9700\u8981\u5173\u6CE8",
  connectedGroup: "\u5DF2\u8FDE\u63A5",
  expand: "\u5C55\u5F00",
  collapse: "\u6536\u8D77",
  toolsPending: "\u5DE5\u5177\u540D\u79F0\u8FD8\u5728\u540C\u6B65\u3002"
};
var en = {
  nav: "MCP",
  intro: "Configure MCP. Saved servers are available on the next turn.",
  save: "Save",
  saving: "Saving\u2026",
  saved: "Saved",
  unavailable: "This page cannot store settings on the host. Open it through 127.0.0.1, then save.",
  none: "No saved MCP servers yet.",
  connecting: "Connecting",
  connected: "Connected",
  error: "Failed",
  tools: "{count} tools",
  edit: "Edit",
  closeEdit: "Done",
  format: "Format",
  attention: "Needs attention",
  connectedGroup: "Connected",
  expand: "Expand",
  collapse: "Collapse",
  toolsPending: "Tool names are still syncing."
};
var inject = ["slots", "locale", "settingsScope"];
function apply(ctx) {
  ctx.effect(() => {
    const disposeZh = ctx.locale.register(NS, "zh", zh);
    const disposeEn = ctx.locale.register(NS, "en", en);
    return () => {
      disposeZh();
      disposeEn();
    };
  }, "dsh-mcp-setting: dictionaries");
  const t = ctx.locale.bind(NS);
  const scope = ctx.settingsScope.bind({ namespace: "dsh-mcp-setting" });
  const status = ctx.settingsScope.bind({ namespace: "dsh-mcp-setting-status" });
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "dsh-mcp-setting",
    order: 30,
    label: () => t("nav"),
    inject: () => ({ scope, status, t })
  }, McpSection));
}
function formatMcpJson(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "";
  let value;
  try {
    value = JSON.parse(trimmed);
  } catch {
    value = JSON.parse(`{${trimmed}}`);
  }
  return JSON.stringify(value, null, 2);
}
var JSON_COLOR = {
  key: "var(--shiki-token-function)",
  string: "var(--shiki-token-string)",
  number: "var(--shiki-token-constant)",
  keyword: "var(--shiki-token-keyword)",
  punct: "var(--shiki-token-punctuation)",
  plain: void 0
};
function tokenizeJson(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index] ?? "";
    if (char === '"') {
      const start = index;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === '"') {
          index += 1;
          break;
        }
        index += 1;
      }
      let look = index;
      while (look < source.length && /\s/.test(source[look] ?? "")) look += 1;
      tokens.push({ kind: source[look] === ":" ? "key" : "string", text: source.slice(start, index) });
      continue;
    }
    if (/\s/.test(char)) {
      const start = index;
      index += 1;
      while (index < source.length && /\s/.test(source[index] ?? "")) index += 1;
      tokens.push({ kind: "plain", text: source.slice(start, index) });
      continue;
    }
    if ("{}[]:,".includes(char)) {
      tokens.push({ kind: "punct", text: char });
      index += 1;
      continue;
    }
    if (/[-0-9]/.test(char)) {
      const start = index;
      index += 1;
      while (index < source.length && /[0-9.eE+-]/.test(source[index] ?? "")) index += 1;
      tokens.push({ kind: "number", text: source.slice(start, index) });
      continue;
    }
    if (/[a-z]/i.test(char)) {
      const start = index;
      index += 1;
      while (index < source.length && /[a-z]/i.test(source[index] ?? "")) index += 1;
      const text = source.slice(start, index);
      const kind = text === "true" || text === "false" || text === "null" ? "keyword" : "plain";
      tokens.push({ kind, text });
      continue;
    }
    tokens.push({ kind: "plain", text: char });
    index += 1;
  }
  return tokens;
}
var JSON_TEXT = {
  margin: 0,
  padding: "10px 12px",
  border: 0,
  fontFamily: "var(--dsw-font-markdown-code-font-family), ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  overflowWrap: "break-word",
  tabSize: 2,
  scrollbarGutter: "stable"
};
function JsonEditor({
  value,
  placeholder,
  onChange
}) {
  const areaRef = (0, import_react.useRef)(null);
  const colorRef = (0, import_react.useRef)(null);
  const shown = value.length > 0 ? value : placeholder;
  const syncScroll = () => {
    const area = areaRef.current;
    const color = colorRef.current;
    if (area === null || color === null) return;
    color.scrollTop = area.scrollTop;
    color.scrollLeft = area.scrollLeft;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
    position: "relative",
    border: "1px solid color-mix(in srgb, currentColor 16%, transparent)",
    borderRadius: 10,
    background: "var(--shiki-background, var(--dsw-alias-markdown-code-block))",
    overflow: "hidden"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "pre",
      {
        ref: colorRef,
        "aria-hidden": true,
        style: {
          ...JSON_TEXT,
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          color: "var(--shiki-foreground, var(--dsw-alias-label-primary))",
          opacity: value.length > 0 ? 1 : 0.45
        },
        children: tokenizeJson(shown).map((token, tokenIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: JSON_COLOR[token.kind] }, children: token.text }, tokenIndex))
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "textarea",
      {
        ref: areaRef,
        value,
        rows: 16,
        spellCheck: false,
        onScroll: syncScroll,
        style: {
          ...JSON_TEXT,
          position: "relative",
          width: "100%",
          boxSizing: "border-box",
          resize: "vertical",
          overflow: "auto",
          color: "transparent",
          caretColor: "var(--shiki-foreground, var(--dsw-alias-label-primary))",
          background: "transparent"
        },
        onChange: (event) => {
          onChange(event.target.value);
        }
      }
    )
  ] });
}
function McpSection({ scope, status, t }) {
  const snapshot = (0, import_react.useSyncExternalStore)((listener) => scope.subscribe(listener), () => scope.getSnapshot());
  const statusSnapshot = (0, import_react.useSyncExternalStore)((listener) => status.subscribe(listener), () => status.getSnapshot());
  const rows = statusSnapshot.value?.servers ?? [];
  const attention = rows.filter((row) => row.state !== "connected");
  const connected = rows.filter((row) => row.state === "connected");
  const [text, setText] = (0, import_react.useState)("");
  const [editing, setEditing] = (0, import_react.useState)(false);
  const [notice, setNotice] = (0, import_react.useState)("");
  const [saving, setSaving] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    if (snapshot.value === void 0 || editing) return;
    setText(snapshot.value.configJson);
  }, [snapshot.value, editing]);
  const openEditor = () => {
    const raw = snapshot.value?.configJson ?? text;
    try {
      setText(formatMcpJson(raw));
    } catch {
      setText(raw);
    }
    setNotice("");
    setEditing(true);
  };
  const format = () => {
    try {
      setText(formatMcpJson(text));
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };
  const save = () => {
    setNotice("");
    let formatted = text;
    try {
      parseMcpJson(text);
      formatted = formatMcpJson(text);
      setText(formatted);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      return;
    }
    setSaving(true);
    void scope.set("configJson", formatted).then(() => {
      setSaving(false);
      setNotice(t("saved"));
      setEditing(false);
    }, (error) => {
      setSaving(false);
      setNotice(error instanceof Error ? error.message : String(error));
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", justifyContent: "flex-start" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
      editing ? setEditing(false) : openEditor();
    }, children: editing ? t("closeEdit") : t("edit") }) }),
    rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { margin: 0 }, children: t("none") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ServerGroup, { title: `${t("attention")} ${attention.length}`, rows: attention, t }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ServerGroup, { title: `${t("connectedGroup")} ${connected.length}`, rows: connected, t })
    ] }),
    snapshot.writable === false && snapshot.status !== "loading" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { margin: 0 }, children: t("unavailable") }),
    editing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { margin: 0 }, children: t("intro") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        JsonEditor,
        {
          value: text,
          placeholder: PLACEHOLDER,
          onChange: (next) => {
            setNotice("");
            setText(next);
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: format, children: t("format") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: saving || snapshot.writable === false, onClick: save, children: saving ? t("saving") : t("save") })
      ] })
    ] }),
    notice.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { margin: 0 }, children: notice })
  ] });
}
function ServerGroup({
  title,
  rows,
  t
}) {
  const [open, setOpen] = (0, import_react.useState)(() => /* @__PURE__ */ new Set());
  if (rows.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontWeight: 600 }, children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { style: {
      listStyle: "none",
      margin: 0,
      padding: 4,
      display: "flex",
      flexDirection: "column",
      border: "1px solid color-mix(in srgb, currentColor 16%, transparent)",
      borderRadius: 10
    }, children: rows.map((row) => {
      const tools = row.tools ?? [];
      const expanded = open.has(row.serverName);
      const canExpand = row.state === "connected";
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { style: { display: "flex", flexDirection: "column", gap: 4, padding: "10px 12px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": true, style: {
            width: 8,
            height: 8,
            flex: "0 0 auto",
            borderRadius: 99,
            background: row.state === "connected" ? "#3fb950" : row.state === "connecting" ? "#d29922" : "#f85149"
          } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { style: { flex: "1 1 auto" }, children: row.serverName }),
          canExpand && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              "aria-expanded": expanded,
              onClick: () => {
                setOpen((current) => {
                  const next = new Set(current);
                  if (next.has(row.serverName)) next.delete(row.serverName);
                  else next.add(row.serverName);
                  return next;
                });
              },
              style: { flex: "0 0 auto", width: "auto" },
              children: expanded ? t("collapse") : t("expand")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { paddingLeft: 16, opacity: 0.8 }, children: row.state === "connected" ? t("tools", { count: row.toolCount }) : row.detail.length > 0 ? row.detail : t(row.state) }),
        expanded && (tools.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { paddingLeft: 16, opacity: 0.7 }, children: t("toolsPending") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { style: { listStyle: "none", margin: "4px 0 0", padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 6 }, children: tools.map((tool) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: tool.name }),
          tool.description.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { opacity: 0.7, fontSize: 12 }, children: tool.description })
        ] }, tool.name)) }))
      ] }, row.serverName);
    }) })
  ] });
}

		return module.exports;
	}
});

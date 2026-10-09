# dsh-mcp-setting

`@siasywang/dsh-mcp-setting` 在 Web 设置里支持可视化增删 MCP 服务器。

保存后，这个插件按 JSON 里的每一台服务器，在当前进程挂上一行 `@deepseek-ai/dsh-mcp-client`。那一行负责连接这一台服务器。从 JSON 里删掉一台，对应那一行会卸掉。不用重启 `dsh web`。

调试时开两个终端，都在仓库根目录：

```sh
pnpm dsh web --patch plugin/dsh-mcp-setting/dev.patch.yml
node plugin/dsh-mcp-setting/build.mjs --watch
```

保存 `plugin/dsh-mcp-setting/src` 里的宿主文件会热替换该插件。保存 `src/client.tsx` 会重写 `lib/client.js`，页面上的 MCP 区块自己换掉。稳定后再装打包产物：

```sh
node plugin/dsh-mcp-setting/build.mjs
pnpm dsh plugin --profile web add file:./plugin/dsh-mcp-setting
```

打开设置里的 **MCP**，粘贴 Cursor `mcp.json` 的服务器对象。有 `url` 走 HTTP，有 `command` 走本地命令。服务器名会变成工具名前缀 `mcp__服务器名__工具名`。

通过 `127.0.0.1` 打开才能把列表写进本机设置。用局域网地址打开时，页面上的保存不会落到 Host。

# dsh-mcp-setting

支持在 dsh Web 的设置页动态配置MCP服务器，并实时生效

## 能力概览

1. 查看服务器列表。绿点是已连接，红点是连接异常

![MCP 服务器列表](assets/mcp-list.png)

2. 查看MCP工具与说明

![展开后的工具列表](assets/mcp-tools.png)

3. JSON格式配置MCP（同cursor）

![JSON 配置](assets/mcp-editor.png)

## 安装

 npm 安装：

```sh
pnpm dsh plugin --profile web add @pipiduck/dsh-mcp-setting --registry https://registry.npmjs.org/
```

或者直接拉源码下来跑：

```sh
node plugin/dsh-mcp-setting/build.mjs
pnpm dsh plugin --profile web add file:./plugin/dsh-mcp-setting
```

启动时不要再加 `--patch`，否则会和装好的插件各挂一行：

```sh
pnpm dsh web
```

## 非本机部署

用 IP 或域名打开时，dsh 默认不把设置页的输入写进磁盘，需要放行web端修改 `~/.dsh/settings.yaml` 的限制。

要让服务器上的页面也能保存，改 deepseek-harness 里这两处，然后重新构建客户端并重启 `dsh web`。

`packages/client/ui-settings/src/client/index.ts`：设置一律写入 Host，不再按本机地址丢掉。

```ts
const persistence = ctx.remote.$host.isLoopback ? 'host' : 'memory'
```

改成：

```ts
const persistence = 'host'
```

`packages/client/ui-settings-general/src/client/index.ts`：远程页面也显示「打开配置文件」。

```ts
const documentController = ctx.remote.$host.isLoopback
  ? new SettingsDocumentStore(ctx, ctx.settingsScope.describe())
  : undefined
```

改成：

```ts
const documentController = new SettingsDocumentStore(ctx, ctx.settingsScope.describe())
```

改完后执行，重新编译设置页源码：

```sh
pnpm exec tsdown --config packages/client/ui-settings/tsdown.config.ts
pnpm exec tsdown --config packages/client/ui-settings-general/tsdown.config.ts
```
## 调试

支持热更新调试。在 deepseek-harness 仓库根目录开两个终端：

```sh
pnpm dsh web --patch plugin/dsh-mcp-setting/dev.patch.yml
node plugin/dsh-mcp-setting/build.mjs --watch
```

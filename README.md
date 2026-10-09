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

## 调试

支持热更新调试。在 deepseek-harness 仓库根目录开两个终端：

```sh
pnpm dsh web --patch plugin/dsh-mcp-setting/dev.patch.yml
node plugin/dsh-mcp-setting/build.mjs --watch
```

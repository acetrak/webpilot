# WebPilot

English version: [README.en.md](./README.en.md)

## 介绍

WebPilot 是一款基于 Chrome Manifest V3 的浏览器扩展，通过侧边栏连接你运行在本机的 OpenCode 服务。你可以在浏览网页的同时与 AI 对话，并在一个工作区中管理多个会话。WebPilot 本身不提供 AI 模型或云端后端；对话请求发送到你配置的 OpenCode 服务。

> 什么是 OpenCode？
>
> [OpenCode](https://opencode.ai/) 是一款开源 AI 编码代理，支持终端、桌面应用和 IDE 等使用方式，并可连接不同的 AI 模型提供商。WebPilot 通过 OpenCode 的本地 HTTP 服务发送对话请求；OpenCode 负责连接模型并管理会话。了解更多：[OpenCode 官方文档](https://opencode.ai/docs/zh-cn/) ·

### 界面截图

| 网页问答 | 多网页问答 |
| --- | --- |
| ![在网页上下文中提问](./screenshot/%E7%BD%91%E9%A1%B5%E9%97%AE%E7%AD%9401.png) | ![添加多个网站作为上下文](./screenshot/%E5%A4%9A%E4%B8%AA%E7%BD%91%E9%A1%B5%E9%97%AE%E7%AD%9401.png) |
| ![网页上下文回答](./screenshot/%E7%BD%91%E9%A1%B5%E9%97%AE%E7%AD%9402.png) | ![多个网页上下文回答](./screenshot/%E5%A4%9A%E4%B8%AA%E7%BD%91%E9%A1%B5%E9%97%AE%E7%AD%9402.png) |

| 技能与模型 |
| --- |
| ![技能和模型支持](./screenshot/%E6%8A%80%E8%83%BD-%E6%A8%A1%E5%9E%8B%E6%94%AF%E6%8C%81.png) |

### 主要功能

- **侧边栏 AI 对话**：在浏览器中打开 WebPilot，与本地 OpenCode 服务进行流式对话；切换会话时可保留各会话的草稿和运行状态。
- **会话管理**：创建新会话、浏览已有插件会话、切换会话，以及删除不再需要的会话。
- **模型选择**：根据 OpenCode 服务提供的模型目录选择模型和可用变体。
- **网页上下文**：由你主动开启后，WebPilot 会在发送消息时读取当前网页的标题、网址和正文内容，将整理后的内容附加到该条提问中。不会自动读取或发送网页内容；网页上下文按需使用，不会自动附加到后续消息。
- **连接配置**：配置 OpenCode 服务地址、端口及可选密码，并查看连接状态。默认服务地址为 `http://127.0.0.1:4096`。
- **个性化界面**：支持浅色、深色和跟随系统的主题，以及英语、简体中文、繁体中文、日语、韩语、法语和西班牙语界面。
- **技能支持**: 支持使用你的任何技能

### 隐私与数据

WebPilot 需要连接到你配置的 OpenCode 服务才能进行对话。只有在你主动启用网页上下文时，扩展才会提取当前网页内容，并将其随提问发送给该服务。服务地址、端口和密码保存在扩展本地存储中；请确保 OpenCode 服务运行在你信任的环境中。

## 环境要求

- Node.js 22 或更高版本
- pnpm 包管理器
- 本地运行的 OpenCode 服务，默认监听 `127.0.0.1:4096`

使用以下命令启动服务：

```bash
opencode serve --hostname 127.0.0.1 --port 4096
```

之后你会得到

```bash
server listening on http://127.0.0.1:4096
server password LPKMpoSrMZaRbmQtRbBC4mXW25Z00lVpkleXYrmiuvs
```

将 http://127.0.0.1:4096 和 password 配置到插件即可

## 本地开发

```bash
pnpm install
pnpm dev
```

在 Chrome 中打开 `chrome://extensions`，启用开发者模式，然后加载未打包扩展目录 `build/chrome-mv3-dev`。

## 检查、构建与打包

```bash
pnpm ts-check
pnpm build
pnpm package
```

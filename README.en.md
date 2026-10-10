# WebPilot

简体中文版本：[README.md](./README.md)

## Introduction

WebPilot is a Chrome extension built with Manifest V3. It connects to an OpenCode server running on your machine and provides an in-browser side panel for AI conversations. You can browse the web while chatting and manage multiple conversations in one workspace. WebPilot does not provide AI models or a hosted backend; chat requests are sent to the OpenCode server you configure.

### What is OpenCode?

[OpenCode](https://opencode.ai/) is an open-source AI coding agent available in the terminal, as a desktop app, and through IDE integrations. It can connect to different AI model providers. WebPilot sends chat requests to OpenCode's local HTTP server, which connects to the model provider and manages sessions. Learn more in the [official documentation](https://opencode.ai/docs/) and the [server documentation](https://opencode.ai/docs/server/).

### Screenshots

| Webpage chat | Multiple webpages |
| --- | --- |
| ![Chat with webpage context](./screenshot/%E7%BD%91%E9%A1%B5%E9%97%AE%E7%AD%9401.png) | ![Add multiple websites as context](./screenshot/%E5%A4%9A%E4%B8%AA%E7%BD%91%E9%A1%B5%E9%97%AE%E7%AD%9401.png) |
| ![Response with webpage context](./screenshot/%E7%BD%91%E9%A1%B5%E9%97%AE%E7%AD%9402.png) | ![Response with multiple webpage contexts](./screenshot/%E5%A4%9A%E4%B8%AA%E7%BD%91%E9%A1%B5%E9%97%AE%E7%AD%9402.png) |

| Skills and models |
| --- |
| ![Skills and model support](./screenshot/%E6%8A%80%E8%83%BD-%E6%A8%A1%E5%9E%8B%E6%94%AF%E6%8C%81.png) |

### Features

- **Side-panel chat**: Have streaming conversations with your local OpenCode server. Drafts and in-progress sessions remain available when you switch between chats.
- **Session management**: Create conversations, browse and switch between existing WebPilot sessions, and delete sessions you no longer need.
- **Model selection**: Choose from the models and supported variants exposed by your OpenCode server.
- **Webpage context**: When you explicitly enable this feature, WebPilot reads the current page's title, URL, and main content when you send a message, then includes the cleaned content with that prompt. Page content is not collected or sent automatically, and is not automatically attached to later messages.
- **Connection settings**: Configure the OpenCode server address, port, and optional password, and check the connection status. The default server address is `http://127.0.0.1:4096`.
- **Personalization**: Choose light, dark, or system theme. The interface is available in English, Simplified Chinese, Traditional Chinese, Japanese, Korean, French, and Spanish.
- **Skills support**: Use skills configured in your OpenCode environment during conversations.

### Privacy and Data

WebPilot must connect to your configured OpenCode server to provide chat functionality. It extracts webpage content only when you enable webpage context, and sends that content to the configured server along with your prompt. The server address, port, and password are stored in the extension's local storage. Run OpenCode only in an environment you trust.

## Requirements

- Node.js 22 or later
- pnpm
- A local OpenCode server listening at `127.0.0.1:4096`

Start the server with:

```bash
opencode serve --hostname 127.0.0.1 --port 4096
```

After the server starts, configure WebPilot with `http://127.0.0.1:4096` and the server password, if authentication is enabled.

## Development

```bash
pnpm install
pnpm dev
```

Load `build/chrome-mv3-dev` as an unpacked extension from `chrome://extensions`.

## Build and package

```bash
pnpm ts-check
pnpm build
pnpm package
```

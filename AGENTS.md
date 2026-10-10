# WebPilot 开发指南

本文件适用于整个仓库，供维护项目的 AI 编码代理和开发者参考。

## 项目定位

WebPilot 是基于 Plasmo 的 Chrome Manifest V3 浏览器侧边栏扩展，通过本地
OpenCode 服务提供 AI 对话、历史会话、模型与变体选择、网页上下文和用量展示。

- 对外产品品牌统一为 **WebPilot**；npm 包名为 `webpilot`。
- OpenCode 是实际后端服务名称，不要把 SDK、认证用户名、API 类型和技术说明中的
  OpenCode 全部替换为 WebPilot。
- 本项目不是 Vite 应用。入口、扩展清单和打包由 Plasmo 管理。

## 技术栈与命令

React 18、TypeScript 5、Plasmo 0.90、Tailwind CSS 3、Base UI、
`@assistant-ui/react`、Zustand、RxJS、i18next / react-i18next。
侧栏路由使用 Wouter 的 hash location。
Markdown 展示使用 markdown-it 和 DOMPurify，网页转换使用 Turndown。

使用 pnpm，并保留 `pnpm-lock.yaml` 与 `pnpm-workspace.yaml` 的构建许可配置。
README 推荐 Node.js 22 或更新版本；发布工作流使用 Node.js 22、pnpm 11。

| 命令 | 用途 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 按锁文件安装依赖 |
| `pnpm dev` | 启动 Plasmo 开发模式 |
| `pnpm ts-check` | TypeScript 类型检查 |
| `pnpm build` | 构建生产扩展 |
| `pnpm package` | 生成扩展 ZIP |

在 `chrome://extensions` 中开启开发者模式，加载 `build/chrome-mv3-dev`。
生产目录为 `build/chrome-mv3-prod`，ZIP 为 `build/chrome-mv3-prod.zip`。
当前没有配置自动化测试或 lint 脚本，不要声称存在这些验证。

## 代码地图

| 路径 | 职责 |
| --- | --- |
| `src/sidepanel.tsx` | Chrome Side Panel 页面入口 |
| `src/background.ts` | 点击扩展图标时打开侧边栏 |
| `src/components/workspace-chat.tsx` | 每个会话的挂载、可见性及 store 回调绑定 |
| `src/components/assistant-chat.tsx` | 历史恢复、assistant-ui runtime、发送消息、自动标题、模型和网页上下文 |
| `src/components/assistant-ui/elements/thread.aui.tsx` | 消息展示、空会话布局、输入框、编辑与消息操作 |
| `src/components/assistant-ui/elements/session-question-form.aui.tsx` | OpenCode session form 问题表单和答复/取消交互 |
| `src/components/assistant-ui/elements/markdown-text.tsx` | Markdown 渲染和 HTML 净化 |
| `src/components/model-picker.tsx` | 模型、变体及“使用网页”控件 |
| `src/components/session-list.tsx` | 从后端加载、选择和删除插件会话 |
| `src/components/theme-provider.tsx` | 浅色、深色、系统主题状态和本地保存 |
| `src/components/theme-picker.tsx` | 主题切换菜单 |
| `src/pages/login/page.tsx` | OpenCode 密码验证 Dialog 页面 |
| `src/pages/setting/page.tsx` | OpenCode 地址、端口和连接设置页 |
| `src/pages/home/page.tsx` | 聊天首页、导航抽屉和工作区布局 |
| `src/components/ui` | Base UI 等基础组件封装 |
| `src/lib/stores/session-workspace.ts` | Zustand 工作区状态和会话操作 |
| `src/lib/api/session.ts` | OpenCode 会话、模型、表单、流式消息、取消和用量 API |
| `src/lib/client.ts` | OpenCode 客户端地址和认证 |
| `src/lib/opencode-endpoint.ts` | 默认 endpoint、站点权限申请和认证挑战头过滤规则 |
| `src/lib/page-extractor.ts` | 活动网页提取、清理和 Markdown 转换 |
| `src/lib/i18n.ts` | 七种语言资源、语言选择和持久化 |
| `src/styles/index.css` | 主题变量、全局样式及 Markdown 样式 |
| `src/types/chrome-side-panel.d.ts` | Chrome 侧边栏 API 类型补充 |
| `package.json` | 包信息、命令、依赖和 Plasmo 扩展清单配置 |
| `.github/workflows` | 发布和商店提交工作流 |

TypeScript 路径别名 `@/*` 指向 `src/*`。新增代码优先使用该别名。
路由使用 `wouter/use-hash-location`，由 `/login`、`/` 和 `/settings` 管理登录、聊天和设置，
不要依赖 History API 或改变扩展页面 pathname。
已认证的聊天工作区在设置路由下保持挂载，避免切换页面时丢失草稿或中断流式响应。
`session-browser.tsx` 和 `session-detail.tsx` 是独立会话视图组件；
当前入口主要使用抽屉中的 `SessionList` 和 `WorkspaceChat`。

## 会话与消息约束

- Zustand store 管理 `chats`、`activeChatID` 和 `busyByChatID`，没有持久化中间件。
  本地空会话和工作区状态不是后端历史会话；后端会话在首条消息发送时创建。
- 每个已打开会话有独立 runtime 和输入状态。非活动会话通过 `hidden` 隐藏但保持挂载，
  避免切换时丢失草稿或中断流式响应；页面只能显示当前会话的输入框。
- `AssistantChat` 固定首次挂载时的 `restoredSessionID`。
  新会话绑定后端 ID 后，不要因此重建 runtime 或重复恢复历史。
- 空会话中欢迎语和输入区域居中；有消息后输入区域位于聊天区域底部。
  工作区通过 `h-dvh`、`flex-1` 和 `min-h-0` 使用剩余高度，不要恢复固定聊天框高度。
- 插件会话带有 metadata 标记 `opencodeWebExtension: true`，历史列表按此标记过滤。
  后端标题前缀为 `【插件会话】`，界面展示时去除前缀。
  修改这些标识需要考虑已有会话兼容性。
- 通用标题根据首条用户提问生成，压缩空白并限制为 36 个字符；复用已有标题辅助函数。
- 流式事件经 RxJS 共享订阅，必须按 `sessionID` 过滤。
  发送链路包含切换模型、发送 prompt、等待完成以及读取最终响应和用量。
  保留 AbortSignal、订阅清理和服务端 interrupt 的行为。
- 默认模型目前为 `github-copilot` / `gpt-6-luna`；模型目录加载后可能选择可用替代模型。
  不要仅为了品牌或样式修改模型配置。
- 关闭面板时，运行中的会话需要确认并中断；不要只检查当前可见会话是否繁忙。

## 主题、语言与组件约定

- 支持 `light`、`dark`、`system`，通过根元素 class 控制 Tailwind `dark:` 样式。
  保存键为 `webpilot.theme`；系统模式需要监听系统配色变化并清理监听器。
- 深色主题使用中性黑灰色，不使用暗蓝色。优先复用语义颜色变量；
  硬编码浅色背景、文字、边框或状态色时必须提供适当的深色样式。
- 弹出菜单和抽屉可能通过 Portal 挂载，主题 class 应放在文档根元素。
- Base UI 的 `DropdownMenuLabel` 必须位于 `DropdownMenuGroup` 或对应 radio group 内。
  使用现有封装的 API，不要直接套用其他组件库的 `asChild` 用法。
- 新增面向用户的文案使用 `t(...)`，并同步维护英语、简体中文、繁体中文、
  日语、韩语、法语和西班牙语。非 React 模块使用现有 i18n 实例。
- `TranslationShape<typeof en>` 约束各语言资源结构。语言保存键
  `opencode.language` 是已有兼容标识，不要无迁移地重命名。
- 遵循已有 TypeScript、函数组件、分号和双引号风格。
  优先复用 UI 封装和业务辅助函数，不添加不必要的类型断言或重复逻辑。

## 网页内容、认证与权限

- 网页上下文是用户主动开启的功能，不要自动采集或发送活动页面内容。
- Side Panel 页面通过 `chrome.tabs.query` 和 `chrome.scripting.executeScript` 提取活动页面，
  优先选择 `article`、`main`，最后使用 `body`。
- 当前提取 HTML 上限为 100000 字符，转换后的 Markdown 上限为 30000 字符。
  保留脚本、表单、输入框及隐藏内容清理和失败提示。
- Markdown 禁用原始 HTML 和图片，再经 DOMPurify 净化。
  保留安全链接协议检查以及外链的 `noopener noreferrer`，不要直接渲染未净化内容。
- 服务默认地址为 `http://127.0.0.1:4096`。清单权限目前包括
  `activeTab`、`scripting`、`sidePanel`、`declarativeNetRequest`、`storage`；HTTPS 为主机权限，
  自定义 HTTP 地址通过可选主机权限在用户确认后按 origin 请求。DNR 仅移除已配置
  OpenCode origin 的 `WWW-Authenticate` 响应头。修改权限时说明实际需要，避免无关扩权。
- 不要在代码、日志、文档或提交中添加、复制或暴露密码和认证头。
  OpenCode 地址、端口和服务密码由 Zustand 持久化到扩展页面的 `localStorage`；
  该存储仅按扩展来源隔离，不是加密凭据库，不能视为安全秘密存储。

## 工作流

- `release.yml`：推送到 `main` 或手动触发，执行类型检查、构建、打包并发布 GitHub Release。
  标签格式为 `v<version>-build.<run_number>`，附件为
  `webpilot-chrome-<tag>.zip` 和固定名称 `webpilot-chrome.zip`。
- `submit.yml`：手动触发，使用 `PlasmoHQ/bpp@v3` 和 `SUBMIT_KEYS` 提交商店。
  当前仍配置 Node.js 16 和旧版本 Actions，与发布工作流环境不同；
  修改此文件前核对版本兼容性，不要把这两个环境视为已经统一。
- 本地可验证构建和打包，但不要在未经授权时触发发布或商店提交。

## 修改与验证

先阅读相关实现和工作区状态，保留用户已有改动；仅修改当前任务相关文件。
不要手工编辑 `build`、`.plasmo`、`node_modules` 或生成的 TypeScript 缓存。
依赖变化时通过 pnpm 同步锁文件，不手工改写依赖解析结果。

代码变更后运行 `pnpm ts-check`；涉及入口、样式、依赖或扩展清单时运行
`pnpm build`；涉及打包流程时补充 `pnpm package`。纯文档变更无需构建。
清理自己产生的缓存改动，但不要覆盖已有用户改动。

UI 行为变更应在实际扩展中关注：空会话居中、发送后底部输入、
会话切换只显示一个输入框、草稿和流式状态保留、历史恢复与删除、
取消响应、网页上下文失败提示、主题切换与系统变化、多语言以及窄侧边栏布局。


## 注意事项

- 优先使用`components/ui`里面的组件
- className聚合使用`lib/utils`下的`cn`
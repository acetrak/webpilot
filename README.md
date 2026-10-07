# WebPilot

WebPilot is a browser side panel for chatting with a local OpenCode server. It
can optionally include the active webpage as context in your prompts.

## Requirements

- Node.js 22 or later
- pnpm
- A local OpenCode server listening at `127.0.0.1:4096`

Start the server with:

```bash
opencode serve --hostname 127.0.0.1 --port 4096
```

If the server requires a password, set `OPENCODE_SERVER_PASSWORD` in
`.env.local`.

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

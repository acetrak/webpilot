import { OpenCode } from "../../node_modules/@opencode/client/dist/promise/index.js";

const PASSWORD = "SFSdtT1WLU4k7_3V-ah4nWtK5yAPxYNiMUbVYkX7elo";

function createClient() {
  if (!PASSWORD) {
    throw new Error(
      "Set OPENCODE_SERVER_PASSWORD in .env.local to the OpenCode server password.",
    );
  }

  const credentials = new TextEncoder().encode(`opencode:${PASSWORD}`);
  const authorization = `Basic ${btoa(String.fromCharCode(...credentials))}`;

  return OpenCode.make({
    baseUrl: "http://127.0.0.1:4096",
    headers: { authorization },
  });
}

export const client = createClient();

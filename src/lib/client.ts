import { OpenCode } from "../../node_modules/@opencode/client/dist/promise/index.js";
import { DEFAULT_OPENCODE_BASE_URL } from "@/lib/opencode-endpoint";
import { useOpenCodeAuthStore } from "@/lib/stores/opencode-auth";

async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const { password, baseUrl } = useOpenCodeAuthStore.getState();
  if (!password) {
    throw new Error("OpenCode server password is required.");
  }

  const requestUrl = new URL(
    input instanceof Request ? input.url : input.toString(),
  );
  if (requestUrl.origin === new URL(DEFAULT_OPENCODE_BASE_URL).origin) {
    const endpoint = new URL(baseUrl);
    requestUrl.protocol = endpoint.protocol;
    requestUrl.host = endpoint.host;
  }
  const request = new Request(
    requestUrl,
    input instanceof Request ? new Request(input, init) : init,
  );

  const credentials = new TextEncoder().encode(`opencode:${password}`);
  const authorization = `Basic ${btoa(String.fromCharCode(...credentials))}`;
  const headers = new Headers(request.headers);
  headers.set("authorization", authorization);

  const authenticatedRequest = new Request(requestUrl, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.clone().text(),
    signal: request.signal,
    credentials: "omit",
  });
  const response = await fetch(authenticatedRequest);
  if (response.status === 401) {
    const authStore = useOpenCodeAuthStore.getState();
    if (authStore.password === password && authStore.baseUrl === baseUrl) {
      authStore.requirePassword();
    }
  }
  return response;
}

export const client = OpenCode.make({
  baseUrl: DEFAULT_OPENCODE_BASE_URL,
  fetch: authenticatedFetch,
});

export const DEFAULT_OPENCODE_HOST = "http://127.0.0.1";
export const DEFAULT_OPENCODE_PORT = "4096";
export const DEFAULT_OPENCODE_BASE_URL = `${DEFAULT_OPENCODE_HOST}:${DEFAULT_OPENCODE_PORT}`;

export function splitOpenCodeBaseUrl(baseUrl: string) {
  try {
    const endpoint = new URL(baseUrl);
    return {
      address: `${endpoint.protocol}//${endpoint.hostname}`,
      port: endpoint.port || DEFAULT_OPENCODE_PORT,
    };
  } catch {
    return { address: DEFAULT_OPENCODE_HOST, port: DEFAULT_OPENCODE_PORT };
  }
}

export function buildOpenCodeBaseUrl(address: string, port: string) {
  let endpoint: URL;
  try {
    endpoint = new URL(address.trim());
  } catch {
    return null;
  }

  if (
    !["http:", "https:"].includes(endpoint.protocol) ||
    !endpoint.hostname ||
    endpoint.username ||
    endpoint.password ||
    (endpoint.pathname !== "/" && endpoint.pathname !== "") ||
    endpoint.search ||
    endpoint.hash ||
    !/^\d+$/.test(port) ||
    Number(port) < 1 ||
    Number(port) > 65535
  ) {
    return null;
  }

  return `${endpoint.protocol}//${endpoint.hostname}:${port}`;
}

export async function configureOpenCodeEndpoint(
  baseUrl: string,
  options: { requestPermission?: boolean } = {},
) {
  const endpoint = new URL(baseUrl);
  const origins = [`${endpoint.protocol}//${endpoint.hostname}/*`];
  const isRequiredByManifest =
    endpoint.protocol === "https:" || endpoint.hostname === "127.0.0.1";
  const hasPermission = isRequiredByManifest
    ? true
    : options.requestPermission
      ? await chrome.permissions.request({ origins })
      : await chrome.permissions.contains({ origins });

  if (!hasPermission) {
    return false;
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          responseHeaders: [
            {
              header: "www-authenticate",
              operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
            },
          ],
        },
        condition: {
          urlFilter: `|${endpoint.origin}/`,
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          ],
        },
      },
    ],
  });

  return true;
}

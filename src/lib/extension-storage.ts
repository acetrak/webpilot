export async function getExtensionStorageItem(key: string) {
  const items = await chrome.storage.local.get(key);
  return typeof items[key] === "string" ? items[key] : null;
}

export async function setExtensionStorageItem(key: string, value: string) {
  await chrome.storage.local.set({ [key]: value });
}

export async function removeExtensionStorageItem(key: string) {
  await chrome.storage.local.remove(key);
}
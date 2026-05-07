import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("authorBridge", {
  auth: {
    status: () => ipcRenderer.invoke("auth:status"),
    setPassword: (password: string) => ipcRenderer.invoke("auth:set-password", password),
    verify: (password: string) => ipcRenderer.invoke("auth:verify", password)
  },
  listmonk: {
    getConfig: () => ipcRenderer.invoke("listmonk:get-config"),
    setConfig: (cfg: { url: string; user: string; token: string }) =>
      ipcRenderer.invoke("listmonk:set-config", cfg),
    fetch: <T = unknown>(path: string) =>
      ipcRenderer.invoke("listmonk:fetch", path) as Promise<T>,
    request: <T = unknown>(method: string, path: string, body?: unknown) =>
      ipcRenderer.invoke("listmonk:request", { method, path, body }) as Promise<T>
  },
  anthropic: {
    getConfig: () => ipcRenderer.invoke("anthropic:get-config"),
    setKey: (key: string) => ipcRenderer.invoke("anthropic:set-key", key),
    draftNewsletter: (args: { pen: string; notes: string }) =>
      ipcRenderer.invoke("anthropic:draft-newsletter", args)
  },
  encrypt: (plaintext: string) => ipcRenderer.invoke("safe-storage:encrypt", plaintext),
  decrypt: (ciphertextB64: string) => ipcRenderer.invoke("safe-storage:decrypt", ciphertextB64)
});

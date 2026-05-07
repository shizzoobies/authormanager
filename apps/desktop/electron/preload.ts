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
  github: {
    getConfig: () => ipcRenderer.invoke("github:get-config"),
    setToken: (token: string) => ipcRenderer.invoke("github:set-token", token),
    putFile: (args: { pen: string; path: string; contentBase64: string; message: string }) =>
      ipcRenderer.invoke("github:put-file", args),
    getFile: (args: { pen: string; path: string }) =>
      ipcRenderer.invoke("github:get-file", args) as Promise<
        { sha: string; content: string } | null
      >
  },
  encrypt: (plaintext: string) => ipcRenderer.invoke("safe-storage:encrypt", plaintext),
  decrypt: (ciphertextB64: string) => ipcRenderer.invoke("safe-storage:decrypt", ciphertextB64)
});

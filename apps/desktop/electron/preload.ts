import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("authorBridge", {
  auth: {
    status: () => ipcRenderer.invoke("auth:status") as Promise<{ hasPassword: boolean }>,
    setPassword: (password: string) =>
      ipcRenderer.invoke("auth:set-password", password) as Promise<boolean>,
    verify: (password: string) =>
      ipcRenderer.invoke("auth:verify", password) as Promise<boolean>
  },
  listmonk: {
    getConfig: () =>
      ipcRenderer.invoke("listmonk:get-config") as Promise<{
        url: string;
        user: string;
        hasToken: boolean;
      }>,
    setConfig: (cfg: { url: string; user: string; token: string }) =>
      ipcRenderer.invoke("listmonk:set-config", cfg) as Promise<boolean>,
    fetch: <T = unknown>(path: string) =>
      ipcRenderer.invoke("listmonk:fetch", path) as Promise<T>
  },
  encrypt: (plaintext: string) => ipcRenderer.invoke("safe-storage:encrypt", plaintext),
  decrypt: (ciphertextB64: string) => ipcRenderer.invoke("safe-storage:decrypt", ciphertextB64)
});

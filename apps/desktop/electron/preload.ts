import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("authorBridge", {
  encrypt: (plaintext: string) => ipcRenderer.invoke("safe-storage:encrypt", plaintext),
  decrypt: (ciphertextB64: string) => ipcRenderer.invoke("safe-storage:decrypt", ciphertextB64)
});

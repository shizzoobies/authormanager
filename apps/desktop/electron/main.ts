import { app, BrowserWindow, ipcMain, safeStorage } from "electron";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("safe-storage:encrypt", (_e, plaintext: string) => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("safeStorage unavailable");
  return safeStorage.encryptString(plaintext).toString("base64");
});

ipcMain.handle("safe-storage:decrypt", (_e, ciphertextB64: string) => {
  const buf = Buffer.from(ciphertextB64, "base64");
  return safeStorage.decryptString(buf);
});

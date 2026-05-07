import { app, BrowserWindow, ipcMain, safeStorage } from "electron";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";

let mainWindow: BrowserWindow | null = null;

const userDataDir = () => app.getPath("userData");
const storePath = () => path.join(userDataDir(), "author-store.enc");

interface Store {
  passwordHash?: string;
  listmonkUrl?: string;
  listmonkUser?: string;
  listmonkToken?: string;
}

function readStore(): Store {
  try {
    if (!fs.existsSync(storePath())) return {};
    const raw = fs.readFileSync(storePath());
    if (raw.length === 0) return {};
    if (safeStorage.isEncryptionAvailable()) {
      const json = safeStorage.decryptString(raw);
      return JSON.parse(json) as Store;
    }
    return JSON.parse(raw.toString("utf8")) as Store;
  } catch (err) {
    console.error("[store] read failed", err);
    return {};
  }
}

function writeStore(store: Store): void {
  const json = JSON.stringify(store);
  const buf = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json)
    : Buffer.from(json, "utf8");
  fs.mkdirSync(userDataDir(), { recursive: true });
  fs.writeFileSync(storePath(), buf, { mode: 0o600 });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: "#0f0f12",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const indexPath = path.resolve(__dirname, "..", "..", "dist", "index.html");
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error(`[did-fail-load] ${code} ${desc} url=${url} attempted=${indexPath}`);
  });
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    console.error(`[render-process-gone]`, details);
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Auth IPC
ipcMain.handle("auth:status", () => {
  const s = readStore();
  return { hasPassword: Boolean(s.passwordHash) };
});

ipcMain.handle("auth:set-password", async (_e, password: string) => {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const hash = await bcrypt.hash(password, 12);
  const s = readStore();
  s.passwordHash = hash;
  writeStore(s);
  return true;
});

ipcMain.handle("auth:verify", async (_e, password: string) => {
  const s = readStore();
  if (!s.passwordHash) return false;
  return bcrypt.compare(password, s.passwordHash);
});

// Listmonk config IPC
ipcMain.handle("listmonk:get-config", () => {
  const s = readStore();
  return {
    url: s.listmonkUrl ?? "https://mail.alexihart.com",
    user: s.listmonkUser ?? "",
    hasToken: Boolean(s.listmonkToken)
  };
});

ipcMain.handle(
  "listmonk:set-config",
  (_e, cfg: { url: string; user: string; token: string }) => {
    const s = readStore();
    s.listmonkUrl = cfg.url.replace(/\/$/, "");
    s.listmonkUser = cfg.user;
    s.listmonkToken = cfg.token;
    writeStore(s);
    return true;
  }
);

function listmonkAuthHeader(s: Store): string {
  return "Basic " + Buffer.from(`${s.listmonkUser}:${s.listmonkToken}`).toString("base64");
}

ipcMain.handle("listmonk:fetch", async (_e, pathStr: string) => {
  const s = readStore();
  if (!s.listmonkUrl || !s.listmonkUser || !s.listmonkToken) {
    throw new Error("Listmonk credentials not configured.");
  }
  const url = `${s.listmonkUrl}${pathStr}`;
  const res = await fetch(url, {
    headers: { authorization: listmonkAuthHeader(s) }
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Listmonk ${res.status}: ${text.slice(0, 200)}`);
  }
  return text ? JSON.parse(text) : null;
});

// Legacy safeStorage helpers (kept for backward compat)
ipcMain.handle("safe-storage:encrypt", (_e, plaintext: string) => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("safeStorage unavailable");
  return safeStorage.encryptString(plaintext).toString("base64");
});

ipcMain.handle("safe-storage:decrypt", (_e, ciphertextB64: string) => {
  const buf = Buffer.from(ciphertextB64, "base64");
  return safeStorage.decryptString(buf);
});

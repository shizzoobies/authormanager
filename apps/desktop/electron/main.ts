import { app, BrowserWindow, ipcMain, safeStorage } from "electron";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import Anthropic from "@anthropic-ai/sdk";

let mainWindow: BrowserWindow | null = null;

const userDataDir = () => app.getPath("userData");
const storePath = () => path.join(userDataDir(), "author-store.enc");

interface Store {
  passwordHash?: string;
  listmonkUrl?: string;
  listmonkUser?: string;
  listmonkToken?: string;
  anthropicApiKey?: string;
}

function readStore(): Store {
  try {
    if (!fs.existsSync(storePath())) return {};
    const raw = fs.readFileSync(storePath());
    if (raw.length === 0) return {};
    if (safeStorage.isEncryptionAvailable()) {
      return JSON.parse(safeStorage.decryptString(raw)) as Store;
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

// ---------- Auth ----------
ipcMain.handle("auth:status", () => ({ hasPassword: Boolean(readStore().passwordHash) }));

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

// ---------- Listmonk ----------
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
    if (cfg.token) s.listmonkToken = cfg.token;
    writeStore(s);
    return true;
  }
);

function listmonkAuthHeader(s: Store): string {
  return "Basic " + Buffer.from(`${s.listmonkUser}:${s.listmonkToken}`).toString("base64");
}

async function listmonkRequest(method: string, pathStr: string, body?: unknown): Promise<unknown> {
  const s = readStore();
  if (!s.listmonkUrl || !s.listmonkUser || !s.listmonkToken) {
    throw new Error("Listmonk credentials not configured.");
  }
  const url = `${s.listmonkUrl}${pathStr}`;
  const init: RequestInit = {
    method,
    headers: {
      authorization: listmonkAuthHeader(s),
      ...(body ? { "content-type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  };
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Listmonk ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

ipcMain.handle("listmonk:fetch", (_e, pathStr: string) => listmonkRequest("GET", pathStr));
ipcMain.handle("listmonk:request", (_e, args: { method: string; path: string; body?: unknown }) =>
  listmonkRequest(args.method, args.path, args.body)
);

// ---------- Anthropic ----------
ipcMain.handle("anthropic:get-config", () => {
  return { hasKey: Boolean(readStore().anthropicApiKey) };
});

ipcMain.handle("anthropic:set-key", (_e, key: string) => {
  const s = readStore();
  s.anthropicApiKey = key;
  writeStore(s);
  return true;
});

const HOUSE_RULES = `
House rules for all generated copy:
- Never use em dashes. Use commas, semicolons, parentheses, or shorter sentences instead.
- Stay strictly inside the assigned pen-name voice.
- Never reference the other pen name. Never imply they share an author.
- Address subscribers warmly and personally, never generically.
`.trim();

const VOICES: Record<"alexi-hart" | "alexandra-knight", string> = {
  "alexi-hart": `
You are writing as Alexi Hart, a contemporary romance author.

Voice:
- Warm, witty, conversational. Sounds like writing a chatty letter to a close friend.
- Light banter, playful asides, low-stakes flirting with the reader.
- Comfort, emotional honesty, swoony anticipation. Heat present but not the headline.
- References everyday details (coffee, late-night writing, real life slipping into the work).

Audience:
- Contemporary romance readers, often Kindle Unlimited subscribers.
- They want softness and humor as much as the romance hooks.

Never:
- Use em dashes.
- Slip into darker, paranormal, or reverse-harem registers.
- Mention or hint at any other pen name.
`.trim(),
  "alexandra-knight": `
You are writing as Alexandra Knight, a paranormal reverse-harem romance author.

Voice:
- Darker, atmospheric, sensual. Mood-forward and intense.
- Tension and danger sit just under the surface of every line.
- Confident. Indulgent. Unafraid of the dramatic image.
- Reverse-harem readers expect swagger, plural pronouns for the love interests, and a sense of escalating obsession.

Audience:
- Paranormal romance and RH readers, Kindle Unlimited heavy.
- They come for atmosphere, slow-burn possessiveness, and stakes.

Never:
- Use em dashes.
- Slip into a soft, cozy contemporary tone.
- Mention or hint at any other pen name.
`.trim()
};

ipcMain.handle(
  "anthropic:draft-newsletter",
  async (
    _e,
    args: { pen: "alexi-hart" | "alexandra-knight"; notes: string }
  ) => {
    const s = readStore();
    if (!s.anthropicApiKey) throw new Error("Anthropic API key not configured.");

    const client = new Anthropic({ apiKey: s.anthropicApiKey });
    const system = `${VOICES[args.pen]}\n\n${HOUSE_RULES}\n\nReturn your response as a JSON object with two string fields: subject and body. The body field must be valid HTML, suitable for an email. Use simple tags only: p, strong, em, a, ul, li, h2. No inline styles, no scripts. Keep the email under 350 words.`;

    const userMsg = args.notes.trim()
      ? `Draft this month's newsletter. Author notes:\n\n${args.notes}`
      : `Draft this month's newsletter. The author has not provided specific context, so write a warm general update appropriate to the voice.`;

    const resp = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: userMsg }]
    });

    const text = resp.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // Extract JSON object from the text (model sometimes wraps in code fences).
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse model response: " + text.slice(0, 200));
    const parsed = JSON.parse(jsonMatch[0]) as { subject: string; body: string };
    return parsed;
  }
);

// ---------- Legacy safeStorage (kept for compat) ----------
ipcMain.handle("safe-storage:encrypt", (_e, plaintext: string) => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("safeStorage unavailable");
  return safeStorage.encryptString(plaintext).toString("base64");
});

ipcMain.handle("safe-storage:decrypt", (_e, ciphertextB64: string) => {
  return safeStorage.decryptString(Buffer.from(ciphertextB64, "base64"));
});

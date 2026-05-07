import { useEffect, useState } from "react";
import { bridge } from "../bridge";

export function Settings() {
  const [url, setUrl] = useState("https://mail.alexihart.com");
  const [user, setUser] = useState("");
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    bridge.listmonk.getConfig().then((c) => {
      setUrl(c.url);
      setUser(c.user);
      setHasToken(c.hasToken);
    });
    bridge.anthropic.getConfig().then((c) => setHasAnthropicKey(c.hasKey));
  }, []);

  async function saveListmonk(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!token && !hasToken) throw new Error("API token required on first setup.");
      await bridge.listmonk.setConfig({ url, user, token: token || "" });
      setSavedAt(new Date());
      setToken("");
      setHasToken(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveAnthropic(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!anthropicKey.trim()) throw new Error("API key required.");
      await bridge.anthropic.setKey(anthropicKey.trim());
      setHasAnthropicKey(true);
      setAnthropicKey("");
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setError(null);
    setBusy(true);
    try {
      const res = await bridge.listmonk.fetch<{ data: unknown }>("/api/health");
      setSavedAt(new Date());
      alert("Listmonk reachable. " + (res ? "Health check passed." : "Connected."));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings">
      <section className="settings-section">
        <h2>Listmonk connection</h2>
        <p className="muted small">
          Required for the Dashboard, Newsletter Studio, and any per-list operations.
        </p>
        <form onSubmit={saveListmonk} className="settings-form">
          <label>
            <span>Listmonk URL</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label>
            <span>API user</span>
            <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="api" />
          </label>
          <label>
            <span>API token</span>
            <input
              value={token}
              type="password"
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasToken ? "•••••••• (set, leave blank to keep)" : "paste token"}
            />
          </label>
          <div className="row">
            <button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn-secondary" onClick={testConnection} disabled={busy}>
              Test connection
            </button>
          </div>
        </form>
      </section>

      <section className="settings-section">
        <h2>Anthropic API key</h2>
        <p className="muted small">
          Required to draft newsletters via Claude. Get a key at{" "}
          <span className="code">console.anthropic.com</span>.
        </p>
        <form onSubmit={saveAnthropic} className="settings-form">
          <label>
            <span>API key</span>
            <input
              value={anthropicKey}
              type="password"
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder={hasAnthropicKey ? "•••••••• (set, paste new to replace)" : "sk-ant-..."}
            />
          </label>
          <div className="row">
            <button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save key"}
            </button>
          </div>
        </form>
      </section>

      {error ? <p className="login-error">{error}</p> : null}
      {savedAt ? <p className="small muted">Saved at {savedAt.toLocaleTimeString()}</p> : null}
    </div>
  );
}

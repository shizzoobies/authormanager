import { useEffect, useState } from "react";
import { bridge } from "../bridge";

export function Settings() {
  const [url, setUrl] = useState("https://mail.alexihart.com");
  const [user, setUser] = useState("");
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    bridge.listmonk.getConfig().then((c) => {
      setUrl(c.url);
      setUser(c.user);
      setHasToken(c.hasToken);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const useToken = token || (hasToken ? "" : "");
      if (!useToken && !hasToken) {
        throw new Error("Token required on first setup.");
      }
      await bridge.listmonk.setConfig({
        url,
        user,
        token: token || ""
      });
      setSavedAt(new Date());
      setToken("");
      setHasToken(true);
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
      const res = await bridge.listmonk.fetch<{ data: { version: string } }>("/api/health");
      setSavedAt(new Date());
      alert(`Listmonk reachable. Version: ${(res as any).data?.version ?? "unknown"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings">
      <h2>Listmonk connection</h2>
      <p className="muted small">
        Required for the Dashboard, Newsletter Studio, and any per-list operations.
      </p>
      <form onSubmit={save} className="settings-form">
        <label>
          <span>Listmonk URL</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mail.alexihart.com" />
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
            placeholder={hasToken ? "•••••••• (set — leave blank to keep)" : "paste token"}
          />
        </label>
        {error ? <p className="login-error">{error}</p> : null}
        <div className="row">
          <button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn-secondary" onClick={testConnection} disabled={busy}>
            Test connection
          </button>
        </div>
        {savedAt ? <p className="small muted">Saved at {savedAt.toLocaleTimeString()}</p> : null}
      </form>
    </div>
  );
}

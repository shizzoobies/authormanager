import { useEffect, useState } from "react";
import { bridge } from "../bridge";

type Mode = "loading" | "create" | "unlock";

export function Login({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    bridge.auth.status().then((s) => setMode(s.hasPassword ? "unlock" : "create"));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await bridge.auth.setPassword(password);
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const ok = await bridge.auth.verify(password);
      if (!ok) {
        setError("Incorrect password.");
        setPassword("");
        return;
      }
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (mode === "loading") {
    return <div className="login-shell"><p>Loading…</p></div>;
  }

  if (mode === "create") {
    return (
      <div className="login-shell">
        <div className="login-card">
          <h1 className="login-title">Author Control Center</h1>
          <p className="login-subtitle">First time setup. Choose a local password to lock the app.</p>
          <form onSubmit={handleCreate} className="login-form">
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                minLength={8}
              />
            </label>
            <label>
              <span>Confirm password</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
              />
            </label>
            {error ? <p className="login-error">{error}</p> : null}
            <button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create password"}
            </button>
          </form>
          <p className="login-footnote">
            Stored encrypted on this machine via the OS keychain. There is no recovery if you forget it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1 className="login-title">Author Control Center</h1>
        <p className="login-subtitle">Welcome back.</p>
        <form onSubmit={handleUnlock} className="login-form">
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" disabled={busy}>
            {busy ? "Unlocking…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}

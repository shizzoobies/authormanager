import { useState } from "react";

export function Login({ onAuthed }: { onAuthed: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Phase 1 placeholder. Real impl will check bcrypt hash from electron-store.
    if (password.length === 0) {
      setError("Password required");
      return;
    }
    setError(null);
    onAuthed();
  }

  return (
    <div style={{ padding: 32, fontFamily: "system-ui" }}>
      <h1>Author Control Center</h1>
      <form onSubmit={submit}>
        <label>
          Local password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", marginTop: 8, padding: 8, width: 280 }}
          />
        </label>
        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
        <button type="submit" style={{ marginTop: 16, padding: "8px 16px" }}>
          Unlock
        </button>
      </form>
    </div>
  );
}

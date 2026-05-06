import { useState } from "react";

type ModuleKey = "dashboard" | "publisher" | "newsletter" | "social" | "releases" | "settings";

const modules: { key: ModuleKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "publisher", label: "Content Publisher" },
  { key: "newsletter", label: "Newsletter Studio" },
  { key: "social", label: "Social Scheduler" },
  { key: "releases", label: "Release Manager" },
  { key: "settings", label: "Settings" }
];

export function Shell() {
  const [active, setActive] = useState<ModuleKey>("dashboard");
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui" }}>
      <nav style={{ width: 220, background: "#111", color: "#eee", padding: 16 }}>
        <h2 style={{ fontSize: 14, textTransform: "uppercase", opacity: 0.6 }}>Modules</h2>
        {modules.map((m) => (
          <button
            key={m.key}
            onClick={() => setActive(m.key)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: 8,
              marginTop: 4,
              background: active === m.key ? "#333" : "transparent",
              color: "#eee",
              border: "none",
              cursor: "pointer"
            }}
          >
            {m.label}
          </button>
        ))}
      </nav>
      <main style={{ flex: 1, padding: 24 }}>
        <h1>{modules.find((m) => m.key === active)?.label}</h1>
        <p style={{ opacity: 0.6 }}>Module placeholder. Phase 3 fills this in.</p>
        {active === "settings" ? <SettingsPanel /> : null}
      </main>
    </div>
  );
}

function SettingsPanel() {
  // Auto-update toggle ships off by default per project decision.
  const [autoUpdate, setAutoUpdate] = useState(false);
  return (
    <section style={{ marginTop: 24 }}>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={autoUpdate}
          onChange={(e) => setAutoUpdate(e.target.checked)}
        />
        Enable auto-updates
      </label>
      <p style={{ opacity: 0.6, marginTop: 4 }}>
        Off by default. Toggle on to receive new desktop builds automatically.
      </p>
    </section>
  );
}

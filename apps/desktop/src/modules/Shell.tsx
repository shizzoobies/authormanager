import { useEffect, useState } from "react";
import { Dashboard } from "./Dashboard";
import { Settings } from "./Settings";
import { NewsletterStudio } from "./NewsletterStudio";
import { ContentPublisher } from "./ContentPublisher";
import { ReleaseManager } from "./ReleaseManager";
import { bridge } from "../bridge";

type ModuleKey = "dashboard" | "publisher" | "newsletter" | "social" | "releases" | "settings";

const modules: { key: ModuleKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "newsletter", label: "Newsletter Studio", icon: "✉️" },
  { key: "publisher", label: "Content Publisher", icon: "📝" },
  { key: "releases", label: "Release Manager", icon: "📚" },
  { key: "social", label: "Social Scheduler", icon: "📣" },
  { key: "settings", label: "Settings", icon: "⚙️" }
];

export function Shell() {
  const [active, setActive] = useState<ModuleKey>("dashboard");
  const [needsConfig, setNeedsConfig] = useState(false);

  useEffect(() => {
    bridge.listmonk.getConfig().then((c) => {
      if (!c.hasToken) {
        setNeedsConfig(true);
        setActive("settings");
      }
    });
  }, []);

  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <p className="brand-eyebrow">Author</p>
          <p className="brand-title">Control Center</p>
        </div>
        {modules.map((m) => (
          <button
            key={m.key}
            onClick={() => setActive(m.key)}
            className={`nav-item ${active === m.key ? "nav-item-active" : ""}`}
          >
            <span className="nav-icon">{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </nav>
      <main className="main">
        {needsConfig && active === "settings" ? (
          <div className="banner">
            <strong>Welcome.</strong> Add your Listmonk API credentials below to unlock the dashboard.
          </div>
        ) : null}
        {active === "dashboard" ? <Dashboard /> : null}
        {active === "newsletter" ? <NewsletterStudio /> : null}
        {active === "publisher" ? <ContentPublisher /> : null}
        {active === "releases" ? <ReleaseManager /> : null}
        {active === "settings" ? <Settings /> : null}
        {active === "social" ? <Placeholder name="Social Scheduler" /> : null}
      </main>
    </div>
  );
}

function Placeholder({ name }: { name: string }) {
  return (
    <div className="placeholder">
      <h1>{name}</h1>
      <p className="muted">Phase 4 module — Meta and X API tokens needed.</p>
    </div>
  );
}

import { useEffect, useState } from "react";
import { bridge } from "../bridge";

interface ListmonkList {
  id: number;
  name: string;
  type: string;
  optin: string;
  subscriber_count: number;
  subscriber_statuses: Record<string, number>;
}

interface Campaign {
  id: number;
  name: string;
  subject: string;
  status: string;
  created_at: string;
  sent_at?: string | null;
  to_send?: number;
  sent?: number;
  views?: number;
  clicks?: number;
}

const PEN_LISTS = [
  { pen: "alexi-hart", label: "Alexi Hart", listId: 3 },
  { pen: "alexandra-knight", label: "Alexandra Knight", listId: 4 }
] as const;

export function Dashboard() {
  const [lists, setLists] = useState<Record<number, ListmonkList>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const listsRes = await bridge.listmonk.fetch<{ data: { results: ListmonkList[] } }>(
        "/api/lists?per_page=100"
      );
      const byId: Record<number, ListmonkList> = {};
      for (const l of listsRes.data.results) byId[l.id] = l;
      setLists(byId);

      const campRes = await bridge.listmonk.fetch<{ data: { results: Campaign[] } }>(
        "/api/campaigns?per_page=10"
      );
      setCampaigns(campRes.data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Live numbers from Listmonk.</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary">
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error ? (
        <div className="card-error">
          <strong>Could not load stats.</strong>
          <p className="muted small">{error}</p>
          <p className="small">
            Check Settings to make sure your Listmonk URL, API user, and token are saved.
          </p>
        </div>
      ) : null}

      <div className="grid-2">
        {PEN_LISTS.map((p) => {
          const list = lists[p.listId];
          const confirmed = list?.subscriber_statuses?.confirmed ?? 0;
          const unconfirmed = list?.subscriber_statuses?.unconfirmed ?? 0;
          const blocklisted = list?.subscriber_statuses?.blocklisted ?? 0;
          const total = list?.subscriber_count ?? 0;
          const lastCampaign = campaigns
            .filter((c) => c.status === "finished" && c.sent_at)
            .sort((a, b) => (b.sent_at ?? "").localeCompare(a.sent_at ?? ""))[0];

          return (
            <section key={p.pen} className="pen-card">
              <header>
                <h2>{p.label}</h2>
                <span className={`pen-tag pen-tag-${p.pen}`}>{p.pen}</span>
              </header>
              <div className="stat-row">
                <Stat label="Total" value={total} />
                <Stat label="Confirmed" value={confirmed} primary />
                <Stat label="Unconfirmed" value={unconfirmed} muted />
                <Stat label="Blocked" value={blocklisted} muted />
              </div>
              {lastCampaign ? (
                <div className="last-campaign">
                  <p className="small muted">Last campaign sent</p>
                  <p className="strong">{lastCampaign.name}</p>
                  <p className="small muted">
                    {new Date(lastCampaign.sent_at ?? "").toLocaleString()} — sent to{" "}
                    {lastCampaign.sent ?? lastCampaign.to_send ?? "?"} • {lastCampaign.views ?? 0}{" "}
                    views • {lastCampaign.clicks ?? 0} clicks
                  </p>
                </div>
              ) : (
                <p className="small muted">No campaigns sent yet.</p>
              )}
            </section>
          );
        })}
      </div>

      <section className="recent">
        <h2>Recent campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="small muted">Nothing yet. Drafts and scheduled sends will appear here.</p>
        ) : (
          <ul className="campaign-list">
            {campaigns.slice(0, 8).map((c) => (
              <li key={c.id}>
                <div>
                  <p className="strong">{c.name}</p>
                  <p className="small muted">{c.subject}</p>
                </div>
                <div className="campaign-meta">
                  <span className={`pill pill-${c.status}`}>{c.status}</span>
                  <span className="small muted">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  primary,
  muted
}: {
  label: string;
  value: number;
  primary?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`stat ${primary ? "stat-primary" : ""} ${muted ? "stat-muted" : ""}`}>
      <p className="stat-value">{value.toLocaleString()}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}

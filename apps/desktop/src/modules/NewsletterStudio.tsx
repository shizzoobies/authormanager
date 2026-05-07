import { useEffect, useState } from "react";
import { bridge, type PenSlug } from "../bridge";

const PENS: { value: PenSlug; label: string; listId: number }[] = [
  { value: "alexi-hart", label: "Alexi Hart", listId: 3 },
  { value: "alexandra-knight", label: "Alexandra Knight", listId: 4 }
];

type Status = "idle" | "drafting" | "ready" | "sending" | "sent" | "error";

interface Draft {
  subject: string;
  body: string;
}

export function NewsletterStudio() {
  const [pen, setPen] = useState<PenSlug>("alexi-hart");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hasAnthropicKey, setHasAnthropicKey] = useState<boolean | null>(null);
  const [sentCampaignId, setSentCampaignId] = useState<number | null>(null);

  useEffect(() => {
    bridge.anthropic.getConfig().then((c) => setHasAnthropicKey(c.hasKey));
  }, []);

  async function generate() {
    setStatus("drafting");
    setError(null);
    try {
      const d = await bridge.anthropic.draftNewsletter({ pen, notes });
      setDraft(d);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  async function send(mode: "send" | "draft") {
    if (!draft) return;
    setStatus("sending");
    setError(null);
    try {
      const listId = PENS.find((p) => p.value === pen)!.listId;
      const created = (await bridge.listmonk.request<{ data: { id: number } }>(
        "POST",
        "/api/campaigns",
        {
          name: `${draft.subject} (${new Date().toISOString().slice(0, 10)})`,
          subject: draft.subject,
          lists: [listId],
          type: "regular",
          content_type: "html",
          body: draft.body,
          messenger: "email"
        }
      )).data;

      if (mode === "send") {
        await bridge.listmonk.request("PUT", `/api/campaigns/${created.id}/status`, {
          status: "running"
        });
      }
      setSentCampaignId(created.id);
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  function reset() {
    setDraft(null);
    setStatus("idle");
    setError(null);
    setSentCampaignId(null);
  }

  if (hasAnthropicKey === null) return null;

  if (!hasAnthropicKey) {
    return (
      <div className="newsletter">
        <h1>Newsletter Studio</h1>
        <div className="card-error">
          <strong>Anthropic API key required.</strong>
          <p className="muted small">
            Add your Anthropic API key in Settings to draft newsletters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="newsletter">
      <header className="dashboard-header">
        <div>
          <h1>Newsletter Studio</h1>
          <p className="muted">Draft, preview, and send newsletters per pen name.</p>
        </div>
        {status === "ready" || status === "sent" ? (
          <button className="btn-secondary" onClick={reset}>
            Start over
          </button>
        ) : null}
      </header>

      {status === "sent" ? (
        <div className="card-success">
          <strong>Campaign created.</strong>
          <p className="small muted">
            Listmonk campaign id {sentCampaignId}. Check the Dashboard for delivery stats.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="card-error">
          <strong>Error.</strong>
          <p className="muted small">{error}</p>
        </div>
      ) : null}

      {status === "idle" || status === "drafting" || status === "error" ? (
        <section className="form-card">
          <label>
            <span>Pen name</span>
            <div className="pen-toggle">
              {PENS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`pen-toggle-btn ${pen === p.value ? "pen-toggle-btn-active" : ""}`}
                  onClick={() => setPen(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </label>
          <label>
            <span>Notes for this newsletter (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="What's new since the last newsletter? New release, bonus chapter, behind-the-scenes, anything you want the model to weave in."
            />
          </label>
          <button onClick={generate} disabled={status === "drafting"}>
            {status === "drafting" ? "Drafting…" : "Generate draft"}
          </button>
        </section>
      ) : null}

      {(status === "ready" || status === "sending") && draft ? (
        <section className="draft-card">
          <h2>Preview</h2>
          <label>
            <span>Subject</span>
            <input
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            />
          </label>
          <label>
            <span>Body (HTML)</span>
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={14}
              className="draft-body"
            />
          </label>
          <details className="rendered-preview">
            <summary>Rendered preview</summary>
            <div className="rendered" dangerouslySetInnerHTML={{ __html: draft.body }} />
          </details>
          <div className="row">
            <button onClick={() => send("send")} disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : `Send now to ${PENS.find((p) => p.value === pen)?.label}`}
            </button>
            <button
              className="btn-secondary"
              onClick={() => send("draft")}
              disabled={status === "sending"}
            >
              Save as draft in Listmonk
            </button>
          </div>
          <p className="small muted">
            Sending creates a Listmonk campaign and immediately starts it. Save as draft if you want to schedule or polish further inside Listmonk.
          </p>
        </section>
      ) : null}
    </div>
  );
}

import { useEffect, useState } from "react";
import { bridge, type PenSlug } from "../bridge";

const PENS: { value: PenSlug; label: string }[] = [
  { value: "alexi-hart", label: "Alexi Hart" },
  { value: "alexandra-knight", label: "Alexandra Knight" }
];

type Collection = "blog" | "members";
type Status = "idle" | "saving" | "saved" | "error";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toBase64(s: string): string {
  return window.btoa(unescape(encodeURIComponent(s)));
}

export function ContentPublisher() {
  const [pen, setPen] = useState<PenSlug>("alexi-hart");
  const [collection, setCollection] = useState<Collection>("blog");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hasGithub, setHasGithub] = useState<boolean | null>(null);
  const [committedSha, setCommittedSha] = useState<string | null>(null);

  useEffect(() => {
    bridge.github.getConfig().then((c) => setHasGithub(c.hasToken));
  }, []);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    setCommittedSha(null);

    try {
      if (!title.trim()) throw new Error("Title is required.");
      if (!slug.trim()) throw new Error("Slug is required.");
      if (!body.trim()) throw new Error("Body is required.");

      const frontmatter =
        collection === "members"
          ? `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndate: ${date}\nmembers_only: true\npen_name: ${pen}\n---\n\n`
          : `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndate: ${date}\npen_name: ${pen}\n---\n\n`;

      const fileContent = frontmatter + body.trim() + "\n";
      const repoPath = `src/content/${collection}/${slug}.mdx`;

      const result = (await bridge.github.putFile({
        pen,
        path: repoPath,
        contentBase64: toBase64(fileContent),
        message: `content: ${collection}/${slug}`
      })) as { content?: { sha?: string } };

      setCommittedSha(result?.content?.sha ?? "");
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  function reset() {
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setBody("");
    setStatus("idle");
    setCommittedSha(null);
  }

  if (hasGithub === null) return null;
  if (!hasGithub) {
    return (
      <div className="newsletter">
        <h1>Content Publisher</h1>
        <div className="card-error">
          <strong>GitHub token required.</strong>
          <p className="muted small">Add a personal access token in Settings to publish content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="newsletter">
      <header className="dashboard-header">
        <div>
          <h1>Content Publisher</h1>
          <p className="muted">Write blog or members-only MDX and commit it to the site repo.</p>
        </div>
        {status === "saved" ? (
          <button className="btn-secondary" onClick={reset}>
            New post
          </button>
        ) : null}
      </header>

      {status === "saved" ? (
        <div className="card-success">
          <strong>Published.</strong>
          <p className="small muted">
            Committed to <span className="code">src/content/{collection}/{slug}.mdx</span>. Cloudflare
            Pages will rebuild automatically.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="card-error">
          <strong>Error.</strong>
          <p className="muted small">{error}</p>
        </div>
      ) : null}

      <form onSubmit={publish} className="form-card">
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
          <span>Collection</span>
          <div className="pen-toggle">
            <button
              type="button"
              className={`pen-toggle-btn ${collection === "blog" ? "pen-toggle-btn-active" : ""}`}
              onClick={() => setCollection("blog")}
            >
              Blog (public)
            </button>
            <button
              type="button"
              className={`pen-toggle-btn ${collection === "members" ? "pen-toggle-btn-active" : ""}`}
              onClick={() => setCollection("members")}
            >
              Members only
            </button>
          </div>
        </label>

        <label>
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <div className="form-row-2">
          <label>
            <span>Slug</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugTouched(true);
              }}
              required
            />
          </label>
          <label>
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        <label>
          <span>Body (Markdown)</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            placeholder="Write your post in Markdown. Frontmatter is generated for you."
            className="draft-body"
            required
          />
        </label>

        <div className="row">
          <button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Publishing…" : "Publish to repo"}
          </button>
        </div>

        <p className="small muted">
          Commits <span className="code">src/content/{collection}/{slug || "[slug]"}.mdx</span> to the
          {pen === "alexi-hart" ? " Alexi Hart" : " Alexandra Knight"} site repository on the main
          branch.
        </p>
      </form>
    </div>
  );
}

import { useEffect, useState } from "react";
import { bridge, type PenSlug } from "../bridge";

const PENS: { value: PenSlug; label: string }[] = [
  { value: "alexi-hart", label: "Alexi Hart" },
  { value: "alexandra-knight", label: "Alexandra Knight" }
];

interface CatalogEntry {
  slug: string;
  title: string;
  release_date: string;
  blurb: string;
  amazon_url?: string;
  cover?: string;
}

type Catalog = { books: CatalogEntry[] };

type Status = "idle" | "saving" | "saved" | "error";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function toBase64(s: string): string {
  return window.btoa(unescape(encodeURIComponent(s)));
}

export function ReleaseManager() {
  const [pen, setPen] = useState<PenSlug>("alexi-hart");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [blurb, setBlurb] = useState("");
  const [amazonUrl, setAmazonUrl] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hasGithub, setHasGithub] = useState<boolean | null>(null);

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

    try {
      if (!title.trim()) throw new Error("Title is required.");
      if (!slug.trim()) throw new Error("Slug is required.");
      if (!blurb.trim()) throw new Error("Blurb is required.");

      let coverPath: string | undefined;
      if (cover) {
        const ext = cover.name.split(".").pop()?.toLowerCase() || "png";
        coverPath = `public/covers/${slug}.${ext}`;
        const b64 = await fileToBase64(cover);
        await bridge.github.putFile({
          pen,
          path: coverPath,
          contentBase64: b64,
          message: `cover: ${slug}`
        });
      }

      const catalogPath = "src/data/catalog.json";
      const existing = await bridge.github.getFile({ pen, path: catalogPath });
      const catalog: Catalog = existing
        ? (JSON.parse(existing.content) as Catalog)
        : { books: [] };
      const entry: CatalogEntry = {
        slug,
        title: title.trim(),
        release_date: date,
        blurb: blurb.trim(),
        ...(amazonUrl.trim() ? { amazon_url: amazonUrl.trim() } : {}),
        ...(cover
          ? { cover: `/covers/${slug}.${cover.name.split(".").pop()?.toLowerCase() || "png"}` }
          : {})
      };
      const idx = catalog.books.findIndex((b) => b.slug === slug);
      if (idx >= 0) catalog.books[idx] = entry;
      else catalog.books.push(entry);
      catalog.books.sort((a, b) => b.release_date.localeCompare(a.release_date));

      await bridge.github.putFile({
        pen,
        path: catalogPath,
        contentBase64: toBase64(JSON.stringify(catalog, null, 2) + "\n"),
        message: `release: ${title.trim()}`
      });
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
    setBlurb("");
    setAmazonUrl("");
    setCover(null);
    setStatus("idle");
  }

  if (hasGithub === null) return null;
  if (!hasGithub) {
    return (
      <div className="newsletter">
        <h1>Release Manager</h1>
        <div className="card-error">
          <strong>GitHub token required.</strong>
          <p className="muted small">Add a personal access token in Settings to publish releases.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="newsletter">
      <header className="dashboard-header">
        <div>
          <h1>Release Manager</h1>
          <p className="muted">Add a new book to the site catalog and upload its cover.</p>
        </div>
        {status === "saved" ? (
          <button className="btn-secondary" onClick={reset}>
            Add another
          </button>
        ) : null}
      </header>

      {status === "saved" ? (
        <div className="card-success">
          <strong>Release published.</strong>
          <p className="small muted">
            Catalog and cover committed to the {pen === "alexi-hart" ? "Alexi Hart" : "Alexandra Knight"} repo. Cloudflare Pages will rebuild.
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
            <span>Release date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        <label>
          <span>Blurb</span>
          <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={5} required />
        </label>

        <label>
          <span>Amazon URL (optional)</span>
          <input
            type="url"
            value={amazonUrl}
            onChange={(e) => setAmazonUrl(e.target.value)}
            placeholder="https://www.amazon.com/dp/..."
          />
        </label>

        <label>
          <span>Cover image (optional)</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          />
          {cover ? (
            <p className="small muted">
              {cover.name} ({Math.round(cover.size / 1024)} KB)
            </p>
          ) : null}
        </label>

        <div className="row">
          <button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Publishing…" : "Publish release"}
          </button>
        </div>

        <p className="small muted">
          Updates <span className="code">src/data/catalog.json</span>
          {cover ? (
            <>
              {" "}
              and uploads cover to{" "}
              <span className="code">
                public/covers/{slug || "[slug]"}.{cover.name.split(".").pop()?.toLowerCase() || "png"}
              </span>
            </>
          ) : null}
          .
        </p>
      </form>
    </div>
  );
}

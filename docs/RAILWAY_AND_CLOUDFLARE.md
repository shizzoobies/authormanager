# Railway + Cloudflare setup walkthrough

This document gets the Phase 2 stack live: Postgres, Listmonk, the API,
and the two custom domains (`alexihart.com` and `alex-knight.com`).

Read once end-to-end before you start. Total time: ~45 minutes.

---

## Part 1 — Railway

### 1.1 Create the project

1. Go to https://railway.app and sign in.
2. Click **New Project** -> **Empty Project**.
3. Name it `author-platform`.

### 1.2 Add Postgres

1. Inside the project, click **+ New** -> **Database** -> **Add PostgreSQL**.
2. Wait for it to provision. Click into the service.
3. **Variables** tab: copy the value of `DATABASE_URL`. You'll paste it into the API service in step 1.4.

### 1.3 Deploy Listmonk

1. Click **+ New** -> **Empty Service**. Name it `listmonk`.
2. Click into the service -> **Settings** tab.
3. Under **Source**, click **Connect Image**. Use:
   ```
   listmonk/listmonk:latest
   ```
4. **Networking** -> **Generate Domain** so Listmonk gets a public URL like `listmonk-production-xxxx.up.railway.app`. Copy this URL.
5. **Variables** tab. Add these. The values reference the Postgres service via Railway's reference syntax (start typing `${{` and Railway will autocomplete):
   ```
   LISTMONK_app__address = 0.0.0.0:9000
   LISTMONK_db__host     = ${{Postgres.PGHOST}}
   LISTMONK_db__port     = ${{Postgres.PGPORT}}
   LISTMONK_db__user     = ${{Postgres.PGUSER}}
   LISTMONK_db__password = ${{Postgres.PGPASSWORD}}
   LISTMONK_db__database = ${{Postgres.PGDATABASE}}
   LISTMONK_db__ssl_mode = require
   PORT                  = 9000
   ```
6. **Deployments** tab. The first deploy will fail because Listmonk needs its database initialized.
7. **Settings** -> **Service** -> set **Custom Start Command** to:
   ```
   ./listmonk --install --yes && ./listmonk
   ```
   This runs the schema install once, then boots Listmonk normally.
8. Redeploy. Once it's green, change the start command back to just `./listmonk` (otherwise it tries to install on every restart).
9. Open the public URL. You'll be prompted to set an admin email + password. **Save these in your password manager.**

### 1.4 Configure Listmonk inside the admin UI

1. **Subscribers** -> **Lists** -> **+ New**:
   - Create `alexi-hart-readers` (Public, Single opt-in)
   - Create `alexandra-knight-readers` (Public, Single opt-in)
   - **Note the numeric IDs** of each list (visible in the URL when you click the list, e.g. `/admin/lists/3`). You'll need them as env vars.
2. **Settings** -> **API users** -> **+ New**:
   - User: `api`
   - Role: full access (or create a custom role with subscribers + lists + transactional permissions)
   - Generate a token. Copy it.
3. **Settings** -> **SMTP** -> set up an outgoing SMTP. Use your domain's email or a transactional provider:
   - Easiest path: Resend (https://resend.com), free tier covers 3000/mo. Add `alexihart.com` as a verified sending domain there, then plug Resend's SMTP into Listmonk.
   - From address: e.g. `hello@alexihart.com` and `hello@alex-knight.com`. (Listmonk supports per-list "from" addresses.)
4. **Campaigns** -> **Templates** -> create two transactional templates:
   - Name: `confirm-alexi-hart`. Body: an HTML email that uses `{{ .Tx.Data.confirm_url }}` as the call-to-action link.
   - Name: `confirm-alexandra-knight`. Same shape, darker copy.
   The API calls these by name in `apps/api/src/lib/email.ts`.

### 1.5 Deploy the API

1. Back in the Railway project, click **+ New** -> **GitHub Repo** -> select `shizzoobies/authormanager`.
2. Railway creates a service. Click into it.
3. **Settings** tab:
   - **Root Directory**: `apps/api`
   - **Build Command**: `pnpm install --frozen-lockfile=false && pnpm prisma:generate && pnpm build`
   - **Start Command**: `pnpm prisma migrate deploy && pnpm start`
   - **Watch Paths**: `apps/api/**` (only redeploy when API code changes)
4. **Networking** -> **Generate Domain**. Copy the resulting URL (e.g. `author-api-production-xxxx.up.railway.app`).
5. **Variables** tab. Paste in:
   ```
   NODE_ENV                       = production
   PORT                           = 4000
   DATABASE_URL                   = ${{Postgres.DATABASE_URL}}
   JWT_SECRET                     = (run "openssl rand -hex 32" locally and paste)
   JWT_COOKIE_DOMAIN              = (leave blank for now; we set this after CF custom domain)
   LISTMONK_URL                   = https://listmonk-production-xxxx.up.railway.app
   LISTMONK_API_USER              = api
   LISTMONK_API_TOKEN             = (the token from 1.4 step 2)
   LISTMONK_LIST_ALEXI_HART       = (the numeric list id)
   LISTMONK_LIST_ALEXANDRA_KNIGHT = (the numeric list id)
   ALEXI_HART_DOMAIN              = https://alexihart.com
   ALEXANDRA_KNIGHT_DOMAIN        = https://alex-knight.com
   MAGNET_URL_ALEXI_HART          = (leave blank for now; we add R2 signed URLs later)
   MAGNET_URL_ALEXANDRA_KNIGHT    = (leave blank)
   ```
6. Redeploy. Once green, hit `https://<api-url>/health`. You should see `{"status":"ok"}`.

### 1.6 First migration

The API's start command includes `prisma migrate deploy`, but that needs an actual migration file. From your local machine, with the Railway DATABASE_URL in your local `.env`:

```
cd platform/apps/api
pnpm prisma migrate dev --name init
git add prisma/migrations && git commit -m "feat: initial migration" && git push
```

Railway redeploys, runs the migration, and you're good.

---

## Part 2 — Cloudflare

You said you have `alexihart.com` and `alex-knight.com` already on Cloudflare. We need to (a) point them at Cloudflare Pages and (b) optionally route `api.alexihart.com` to the Railway API so cookies work cross-site.

### 2.1 Custom domains on Cloudflare Pages

For each Pages project (`alexi-hart` and `alexandra-knight`):

1. Cloudflare dashboard -> **Workers & Pages** -> select the project.
2. **Custom domains** tab -> **Set up a custom domain**.
3. Enter `alexihart.com` for the Hart project, `alex-knight.com` for Knight.
4. Cloudflare will auto-create the DNS records. Approve.
5. Repeat with `www.alexihart.com` and `www.alex-knight.com` and set those to redirect to the apex (Page Rules or a Bulk Redirect).

After this propagates (a few minutes), `https://alexihart.com` should serve the Hart site.

### 2.2 Set Cloudflare Pages env vars

In each Pages project -> **Settings** -> **Environment variables** (Production):

For **alexi-hart**:
```
PUBLIC_PEN_NAME    = alexi-hart
PUBLIC_SITE_URL    = https://alexihart.com
PUBLIC_API_URL     = https://<your-railway-api-url>
PUBLIC_BASE_PATH   = (leave blank)
```

For **alexandra-knight**:
```
PUBLIC_PEN_NAME    = alexandra-knight
PUBLIC_SITE_URL    = https://alex-knight.com
PUBLIC_API_URL     = https://<your-railway-api-url>
PUBLIC_BASE_PATH   = (leave blank)
```

Trigger a fresh deploy after adding these.

### 2.3 Optional but recommended: API on a subdomain

Cookies work better when the API is on the same registered domain as the site. Two options:

**Option A — same parent domain.** Point `api.alexihart.com` and `api.alex-knight.com` at Railway. Then set `JWT_COOKIE_DOMAIN=.alexihart.com` (or `.alex-knight.com`) in the API env. But each API instance can only set cookies for one domain, so this requires two API deployments.

**Option B — single API on its own domain.** Buy `authormanager.com` (or use one of the existing domains as `api.alexihart.com`), point it at Railway, and use `SameSite=None; Secure` cookies (which the code already does). Cross-site cookies work in modern browsers; users with very strict tracking-prevention may have issues.

For Phase 2 launch, go with Option B and one API. We can split later if cookie behavior becomes an issue.

To set the subdomain in Cloudflare:
1. Cloudflare dashboard -> select the domain -> **DNS** -> **Records**.
2. Add a `CNAME` record:
   - Name: `api`
   - Target: `<your-railway-api-url-without-protocol>` (e.g. `author-api-production-xxxx.up.railway.app`)
   - Proxy status: **DNS only** (gray cloud) initially. Cloudflare's proxy can interfere with Railway's TLS. Once it's working you can flip to Proxied if you want.
3. In Railway, the API service -> **Settings** -> **Networking** -> **Add Custom Domain** -> enter `api.alexihart.com`. Railway issues a cert.
4. Update `PUBLIC_API_URL` in Cloudflare Pages to `https://api.alexihart.com`.
5. (Optional) set `JWT_COOKIE_DOMAIN=.alexihart.com` in Railway.

---

## Part 3 — End-to-end test

Once everything is live:

1. Visit `https://alexihart.com/members/`.
2. Enter your own email -> Submit.
3. You should see "Check your inbox."
4. The Listmonk transactional email arrives with a link to `https://alexihart.com/members/welcome?token=...`.
5. Clicking the link should land on the welcome page, briefly say "Confirming...", then show "Welcome to the reader list" with the magnet button (which is a no-op until we wire R2 in Phase 5).
6. Reload `/members/` -> you should now see the "Welcome back" state instead of the form.
7. Repeat with `https://alex-knight.com/members/`.

If any step fails:
- Cloudflare Pages **Functions** tab shows site-side runtime errors.
- Railway API service **Logs** show the API errors (look for `[signup]`, `[confirm]`).
- Hit `https://<api>/health` to verify the API is reachable.
- Browser DevTools **Network** tab shows the `/signup` and `/confirm` request/response.

---

## Part 4 — Things you'll want once this is live

- **Magnet PDFs.** Put the bonus novella (Hart) and prequel (Knight) in Cloudflare R2, generate signed URLs (or just public URLs since the JWT confirmation already gates discovery), and set `MAGNET_URL_ALEXI_HART` / `MAGNET_URL_ALEXANDRA_KNIGHT` in Railway.
- **Sender domain warm-up.** When you send the first batches, Listmonk should rate-limit. Resend warms up automatically. If you use SES or your own SMTP, throttle the first week.
- **Backup.** Railway Postgres can be backed up via `pg_dump`. Schedule a weekly cron in the cron-worker service when we add it in Phase 3.

---

## Common pitfalls

- **Listmonk fails to start.** Almost always SSL settings on Postgres. `LISTMONK_db__ssl_mode=require` for Railway Postgres.
- **CORS errors in the browser.** Make sure `ALEXI_HART_DOMAIN` and `ALEXANDRA_KNIGHT_DOMAIN` in Railway exactly match `PUBLIC_SITE_URL` on Cloudflare Pages, including the protocol and no trailing slash.
- **Cookie not set after confirm.** Check that the API is HTTPS (Railway provides this automatically), and that you're calling `fetch(..., { credentials: "include" })` (the site code already does).
- **Email never arrives.** Listmonk will queue indefinitely if SMTP isn't configured. Check **Settings** -> **Logs** in Listmonk admin.

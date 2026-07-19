# Marginal — deployment guide (Cloudflare Workers, fully free)

Cloudflare has merged what used to be two separate products ("Pages" and "Workers") into one unified **Workers** platform, where a single Worker can serve both your static app and its backend logic together. This is the version of the project built for that current model — **$0/month, no credit card, no external API account.**

- `public/index.html` — the app itself (frontend only, no secrets in it)
- `src/index.js` — the Worker's entry point: routes `/api/*` requests to their handlers, and serves the app itself for everything else
- `src/api/claude.js` — proxies to **Cloudflare Workers AI** (Cloudflare's own hosted open-source models — free, no external key)
- `src/api/storage.js` — a key-value store backed by Cloudflare KV
- `src/api/whoami.js` — reports who's currently signed in
- `wrangler.toml` — the Worker's configuration; this is the file Cloudflare treats as the source of truth for how to build and run the project

You'll end up with a private URL that only you (and anyone you explicitly add) can open. Everyone else gets a login wall.

## The honest tradeoff

This uses Llama 3.3, an open-source model hosted by Cloudflare, instead of Claude — capable, but a notch below Claude's quality on the trickiest passages. There's a free daily allowance of 10,000 "Neurons" (Cloudflare's AI compute unit), resetting daily at midnight UTC — normally plenty for personal use. If you outgrow it: wait for the reset, switch to a smaller model (one line in `src/api/claude.js`), or ask me for the Anthropic-backed version instead (real cost, better quality).

---

## What you'll need

- A **Cloudflare account** — [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) (free, no card)
- A **GitHub account** — or the Wrangler CLI if you'd rather skip GitHub

---

## Step 1 — Get the code into GitHub

Upload this entire folder's contents to a repo (e.g. `marginal-app`), preserving the folder structure — `public/`, `src/`, `src/api/`, plus `wrangler.toml`, `README.md`, `.gitignore` at the top level. Do this from a desktop browser if at all possible; folder drag-and-drop is much more reliable there than on mobile.

## Step 2 — Create the Worker project

1. In the Cloudflare dashboard: **Workers & Pages** → **Create** → **Connect to Git** (or **Workers** tab, depending on what your dashboard shows — Cloudflare has been rolling this UI out gradually, so the exact wording may differ slightly from account to account).
2. Authorize the Cloudflare GitHub app if prompted, scoped to just `marginal-app`.
3. Select the `marginal-app` repository.
4. Cloudflare will read `wrangler.toml` from the repo automatically — since it already specifies `main`, `compatibility_date`, and the `[assets]` block, you shouldn't need to fill in framework preset, build command, or output directory manually at all. If the dashboard does show those fields anyway, leave build command blank and framework preset as None; `wrangler.toml` takes precedence.
5. Click **Save and Deploy**.

The first deploy will likely still fail or half-work at this point — that's expected, because the KV and AI bindings aren't attached yet. Two steps left.

## Step 3 — Add the KV binding

1. In the Cloudflare dashboard, go to **Storage & Databases** → **KV** → **Create a namespace** → name it `marginal-storage`.
2. Go to your Worker project (not the KV page) → the **Bindings** tab (visible at the top of your project, alongside Overview/Metrics/Deployments/etc.).
3. **Add binding** → choose **KV namespace**.
   - Variable name: `MARGINAL_KV` (must match exactly)
   - Namespace: the one you just created
4. Save.

## Step 4 — Add the Workers AI binding

1. Still on the **Bindings** tab → **Add binding** → choose **AI**.
2. Variable name: `AI` (must match exactly)
3. Save. No key, no signup, no billing — this is part of your Cloudflare account already.
4. Go to the **Deployments** tab → find the latest deployment → **Retry deployment**, since binding changes only take effect on a new deploy.

## Step 5 — Lock the app down with Cloudflare Access

This is what makes you the sole gatekeeper.

1. Go to **Zero Trust** in the Cloudflare dashboard (or [one.dash.cloudflare.com](https://one.dash.cloudflare.com)) — pick the free plan if prompted, no card needed.
2. **Access** → **Applications** → **Add an application** → **Self-hosted**.
3. Configure:
   - **Application name:** Marginal
   - **Application domain:** your Worker's domain (shown on its Overview tab, something like `marginal-app.<your-subdomain>.workers.dev`)
4. Create a policy:
   - **Action:** Allow
   - **Include:** **Emails** → list the exact addresses allowed in (start with just yours)
5. Save. To add or remove someone later, edit this email list — no code changes needed.

## Step 6 — Test it

1. Open your Worker's URL in a private/incognito window — you should hit the Access login screen first.
2. Sign in with an allowed email → you land in the app.
3. Upload a small PDF and confirm a section gets explained (exercises KV + Workers AI together).
4. Confirm a non-allowed email or logged-out visit gets blocked.

---

## Alternative: deploy with Wrangler CLI (skips GitHub)

```bash
npm install -g wrangler
wrangler login

# from inside this folder, fill in your real KV namespace ID in wrangler.toml first:
wrangler deploy
```

Then do Steps 3–6 above in the dashboard the same way — bindings and the Access policy are dashboard/config steps regardless of how the code got deployed. For local testing:

```bash
wrangler dev
```

(No Cloudflare Access locally, so `/api/whoami` just reports a placeholder — fine for testing app logic. Local Workers AI calls do count against your real daily free allowance.)

---

## If you outgrow the free tier later

- **Cheaper/faster model:** change the `MODEL` constant in `src/api/claude.js` to something smaller like `@cf/meta/llama-3.1-8b-instruct`.
- **Higher quality:** swap in an Anthropic-backed version of `src/api/claude.js` — real cost, better nuance. Just ask.

## Notes on scanned/image-only PDFs

Text extraction reads embedded text layers only — no OCR for scanned pages. Solvable later by wiring an OCR step into `src/api/`, just not included in this version.

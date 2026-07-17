# Marginal — deployment guide (fully free version)

This folder is a complete, deployable version of the app that runs entirely on Cloudflare's free tier — **$0/month, no credit card, no external API account.**

- `public/index.html` — the app itself (frontend only, no secrets in it)
- `functions/api/claude.js` — a server-side proxy to **Cloudflare Workers AI** (Cloudflare's own hosted open-source models — this replaced the paid Anthropic API)
- `functions/api/storage.js` — a server-side key-value store (Cloudflare KV)
- `functions/api/whoami.js` — reports who's currently signed in

You'll end up with a private URL that only you (and anyone you explicitly add) can open. Everyone else gets a login wall.

## The honest tradeoff

This version uses Llama 3.3, an open-source model hosted by Cloudflare, instead of Claude. It's genuinely capable for explaining and writing help, but a notch below Claude's quality — expect slightly less nuance on the trickiest passages. There's also a **free daily allowance of 10,000 "Neurons"** (Cloudflare's compute unit for AI), which resets every day at midnight UTC. For personal use — reading a book section by section, writing alongside it — that's normally enough for a solid day's work. If you ever outgrow it, the fix is either waiting for the next day's reset, switching to a smaller/cheaper model (one line of code, noted in `functions/api/claude.js`), or — if you decide the quality gap matters more than the cost — swapping this proxy for the Anthropic-backed version instead, which I can also give you.

---

## What you'll need before starting

- A **Cloudflare account** — [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) (free, no card)
- A **GitHub account** (easiest deployment path) — or the Wrangler CLI if you'd rather skip GitHub

That's it. No other accounts, no billing setup, anywhere.

---

## Step 1 — Get the code into GitHub

1. Create a new empty repository on GitHub, e.g. `marginal-app`.
2. Upload this entire folder's contents to it (drag-and-drop on GitHub's web UI works fine, or `git init && git add . && git commit -m "init" && git push`).

*(If you'd rather not use GitHub, skip to "Alternative: deploy with Wrangler CLI" at the bottom.)*

## Step 2 — Create the Pages project

1. In the Cloudflare dashboard, go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select your `marginal-app` repository.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `public`
4. Click **Save and Deploy**. It'll deploy immediately — it'll load but the app won't work yet, since it has no storage or AI binding. Two steps left.

## Step 3 — Create a KV namespace for storage

1. In the dashboard, go to **Storage & Databases** → **KV** → **Create a namespace**.
2. Name it `marginal-storage`. Create it.
3. Go back to your Pages project → **Settings** → **Functions** → **KV namespace bindings** → **Add binding**.
   - Variable name: `MARGINAL_KV` (must match exactly)
   - KV namespace: the one you just created
4. Save.

## Step 4 — Enable Workers AI (this is the free "brain" of the app)

1. Still in your Pages project → **Settings** → **Functions** → scroll to **AI bindings** → **Add binding**.
2. Variable name: `AI` (must match exactly)
3. Save.
4. That's the whole step — no key to generate, no account to sign up for, no billing to add. It's part of your Cloudflare account already.
5. Trigger a redeploy (Pages → your project → **Deployments** → **⋯** on the latest one → **Retry deployment**), since binding changes only take effect on a new deploy.

## Step 5 — Lock the app down with Cloudflare Access (the actual privacy step)

This is what makes you the sole gatekeeper. Without this, anyone with the URL can open the app.

1. Go to **Zero Trust** in the Cloudflare dashboard (left sidebar, or [one.dash.cloudflare.com](https://one.dash.cloudflare.com)). First time here, pick the free plan — no card required.
2. Go to **Access** → **Applications** → **Add an application** → **Self-hosted**.
3. Configure:
   - **Application name:** Marginal
   - **Session duration:** whatever you're comfortable with (e.g. 24 hours)
   - **Application domain:** your Pages project's domain (e.g. `marginal-app.pages.dev`)
4. Create a policy:
   - **Policy name:** Allowed readers
   - **Action:** Allow
   - **Include:** rule type **Emails** → list the exact email addresses allowed in (start with just your own; add others any time from this screen)
5. Save. Visitors now verify their email with a one-time code before they can reach the app at all. To add or remove someone later, just edit this email list — no code changes needed.

## Step 6 — Test it

1. Open your Pages URL in a private/incognito window.
2. You should hit the Cloudflare Access login screen first.
3. Sign in with an allowed email → you land in the app.
4. Upload a small PDF and confirm a section gets explained — this exercises KV storage and the Workers AI proxy in one go.
5. Try the same URL as a non-allowed email or logged out — it should be blocked.

## Optional — a real domain instead of `*.pages.dev`

Under your Pages project → **Custom domains**, add a domain you own (must already be on Cloudflare DNS). Access policies carry over automatically.

---

## Alternative: deploy with Wrangler CLI (skips GitHub)

```bash
npm install -g wrangler
wrangler login

# from inside this folder:
wrangler pages deploy public --project-name marginal-app
```

Then do Steps 3–6 above in the dashboard exactly the same way — KV binding, AI binding, and the Access policy are all dashboard/config steps regardless of how the code got deployed.

For local testing before you deploy, fill in your real KV namespace ID in `wrangler.toml`, then run:

```bash
wrangler pages dev public
```

(Local dev has no Cloudflare Access, so `/api/whoami` will just report a placeholder user — fine, it's only for testing the app logic. Local Workers AI calls do count against your account's real free daily allowance.)

---

## If you outgrow the free tier later

Two independent knobs, either one works on its own:

- **Cheaper/faster model:** open `functions/api/claude.js` and change the `MODEL` constant to a smaller model like `@cf/meta/llama-3.1-8b-instruct` — uses fewer Neurons per call, so your daily allowance goes further, at some cost to explanation quality.
- **Higher quality:** swap this proxy for an Anthropic-backed version (what we started with before switching to the free option) — real cost, better nuance. Just ask and I'll hand you that version of `claude.js` again alongside the setup steps for an Anthropic API key.

## Notes on scanned/image-only PDFs

Text extraction here reads embedded text layers only — it won't OCR a scanned page. Solvable later by wiring an OCR step into `functions/api/`, just not included in this version.

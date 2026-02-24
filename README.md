# Cloudflare Redundancy System

> Keep your website online even when your server goes down — automatically.

This project uses **Cloudflare Workers** to create a transparent redundancy layer in front of your website. When your origin server is reachable, visitors are proxied through normally. When it goes down, a static snapshot is served instead — with zero configuration required from the visitor.

---

## Table of Contents

- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Step 1 — Create the static cache repository](#step-1--create-the-static-cache-repository)
- [Step 2 — Back up your websites](#step-2--back-up-your-websites)
- [Step 3 — Deploy the cache worker](#step-3--deploy-the-cache-worker)
- [Step 4 — Deploy the proxy worker](#step-4--deploy-the-proxy-worker)
- [Step 5 — Configure your DNS](#step-5--configure-your-dns)
- [Automation](#automation)
- [Reference — save.sh](#reference--savesh)
- [Reference — proxy-code.js](#reference--proxy-codejs)
- [Troubleshooting](#troubleshooting)

---

## How it works

```
Visitor
  │
  ▼
[Cloudflare proxy Worker]  ←── your domain (example.com)
  │
  ├─── Origin reachable? ──YES──► Forward request to  https://_.example.com
  │                                (your real server, A/AAAA record "_")
  └─── Origin down?       ──NO───► Fetch from website-caches Worker
                                   (pre-built static snapshot on GitHub)
```

The two Cloudflare Workers involved are:

| Worker | Role |
|---|---|
| `website-caches` | Serves the pre-built static snapshot of your site from a GitHub repository |
| `proxy` | Sits in front of your domain; decides whether to forward live or serve cached content |

---

## Prerequisites

- A [Cloudflare](https://dash.cloudflare.com/) account with your domain added
- A GitHub account
- `wget` and `git` available on the machine that will run the backup script
- Basic familiarity with Cloudflare Workers and DNS records

> [!IMPORTANT]
> Your domain must be managed by Cloudflare (i.e. Cloudflare must be your DNS provider) for the worker routing to work.

---

## Step 1 — Create the static cache repository

Fork this repository and name it exactly **`website-caches`**:

<img width="544" height="84" alt="Fork button" src="https://github.com/user-attachments/assets/7ed03ff9-574c-45b2-bcb3-bd04b299f9e5" />

> [!NOTE]
> The repository name `website-caches` is used later by the proxy worker to build the fallback URL. Do not rename it.

---

## Step 2 — Back up your websites

Open `save.sh` and add a `save_website` call for each site you want to back up:

```bash
save_website https://example.com
save_website https://another-site.org
```

Then run the script:

```bash
chmod +x save.sh
./save.sh
```

Or without changing permissions:

```bash
sh save.sh
```

After the run you should see a `static/` folder:

<img width="935" height="210" alt="static folder" src="https://github.com/user-attachments/assets/ca189a8a-fd32-44ee-abd4-e5054cce439f" />

With your site mirrored inside it:

<img width="932" height="230" alt="site inside static folder" src="https://github.com/user-attachments/assets/51b992b0-d64f-4d50-904e-55956dd0be03" />

> [!WARNING]
> If the `static/` folder is empty or your site is missing, the wget mirror failed. Check that `wget` is installed and that the URL in `save.sh` is correct, then re-run the script.

---

## Step 3 — Deploy the cache worker

Go to [Cloudflare Workers & Pages](https://dash.cloudflare.com/) and create a new Worker connected to your GitHub repository:

<img width="1286" height="634" alt="Create worker" src="https://github.com/user-attachments/assets/57d97246-5c10-47cc-bfc1-5f32cc53289f" />

Click **Continue with GitHub** and select your `website-caches` repo:

<img width="1207" height="510" alt="Select repo" src="https://github.com/user-attachments/assets/97dace1e-fdc8-42de-bd44-ab50664ff1dc" />

In the **Deploy command** field, enter:

```
npx wrangler deploy --assets=./static --compatibility-date 2026-01-01
```

<img width="1194" height="748" alt="Deploy command" src="https://github.com/user-attachments/assets/e029782b-8bc9-48cd-839a-8d0d6cc26149" />

Click **Deploy**. Cloudflare will build and publish the static assets automatically. Every time `save.sh` pushes new content to GitHub, a new deployment will be triggered.

> [!TIP]
> You can check the deployment URL in the Worker settings page — it will look like `https://website-caches.<your-subdomain>.workers.dev`. Keep it handy for the next step.

---

## Step 4 — Deploy the proxy worker

Create a **new** Worker named `proxy` using the **Hello World** template:

<img width="800" height="736" alt="Create proxy worker" src="https://github.com/user-attachments/assets/6d9d9104-bdc2-43bc-9042-19583a6f1375" />

Click **Create**, then open **Edit code**:

<img width="1920" height="923" alt="Edit code panel" src="https://github.com/user-attachments/assets/ab892834-4716-49e6-b0aa-c2f25600d9b5" />

Replace the entire content with `proxy-code.js` from this repository.

> [!IMPORTANT]
> At the top of the file, replace `fox3000foxy` with your own Cloudflare Workers subdomain:
>
> ```js
> const FALLBACK_BASE = "https://website-caches.<YOUR-SUBDOMAIN>.workers.dev"
> ```
>
> <img width="783" height="186" alt="Replace username" src="https://github.com/user-attachments/assets/c25c7fba-80b6-4cda-aa4c-1522a8198079" />

Click **Deploy**:

<img width="262" height="76" alt="Deploy button" src="https://github.com/user-attachments/assets/bc770688-9ae7-405c-962c-6717ab869c16" />

---

## Step 5 — Configure your DNS

You need two things in your Cloudflare DNS settings:

1. **Change your existing `A` and `AAAA` records** — set the subdomain name to `_` so your origin server is reachable at `_.example.com` internally by the proxy:

<img width="1335" height="590" alt="DNS A record" src="https://github.com/user-attachments/assets/138d7851-be10-45f0-94a2-5164883f8f9c" />

2. **Add your root domain as a custom route** for the `proxy` worker:

<img width="974" height="330" alt="Worker route" src="https://github.com/user-attachments/assets/d7617b9f-608c-4089-80e5-08d12dedc343" />

> [!CAUTION]
> Do **not** delete your A/AAAA records — only rename their subdomain to `_`. The proxy worker needs to reach `_.example.com` to check if your origin is alive. Deleting the records makes the live-forwarding path unreachable.

Your redundancy system is now fully operational. Visitors always hit the `proxy` worker; the worker silently switches between your live server and the static backup as needed.

---

## Automation

To keep the static backup fresh, schedule `save.sh` with a crontab:

```bash
# Run every 30 minutes
*/30 * * * * /path/to/save.sh >> /var/log/website-backup.log 2>&1
```

> [!TIP]
> Adjust the interval based on how frequently your site changes. A blog updated daily can use a much longer interval (e.g. every 6 hours) to reduce unnecessary commits.

---

## Reference — `save.sh`

The script does the following on each run:

| Step | What happens |
|---|---|
| `save_website <url>` | Mirrors the site with `wget` into `static/<hostname>/` |
| `--mirror` | Recursively downloads all pages and linked assets |
| `--convert-links` | Rewrites links to work offline |
| `--page-requisites` | Downloads CSS, JS, images required to render each page |
| `git pull` | Syncs any remote changes before committing |
| `git add *` | Stages all new and modified files |
| `git commit` | Creates a commit with a `DD/MM/YYYY HH:MM` timestamp |
| `git push` | Pushes the snapshot to GitHub, triggering a Cloudflare deployment |

The git author is set to `backup-bot` so commits are clearly identifiable as automated.

---

## Reference — `proxy-code.js`

The proxy worker intercepts every HTTP request to your domain and applies the following logic:

```
Incoming request
       │
       ▼
  Parse URL → extract hostname, path, query
       │
       ▼
  GET /profile/theme (POST) ?
  ├─ YES → set theme cookie, return 200
  └─ NO  ──────────────────────────────────┐
                                           ▼
                                  Check origin (HEAD https://_.<host>)
                                           │
                              ┌────────────┴────────────┐
                           Online                    Offline
                              │                         │
                              ▼                         ▼
                   Forward request to         Fetch from FALLBACK_BASE
                   https://_.<host><path>     /<host><path>
```

### Key behaviours

<details>
<summary><strong>URL & link rewriting</strong></summary>

Every `href`, `src`, and `action` attribute in the HTML response is rewritten to replace `_.example.com` with `example.com`, so the visitor never sees internal hostnames. The same rewriting is applied to `Location` and `Refresh` response headers and to inline `<script>` content.

</details>

<details>
<summary><strong>Cookie handling</strong></summary>

`Set-Cookie` headers from the origin are rewritten to use the proxy domain (`example.com`) instead of `_.example.com`. `SameSite=None; Secure` is added automatically to cookies that lack those attributes, which is required for cross-context cookies to work in modern browsers.

</details>

<details>
<summary><strong>Theme support</strong></summary>

A `POST /profile/theme` endpoint sets a `theme` cookie. On every HTML response, the `data-bs-theme` attribute of `<body>` is updated to match — enabling dark/light mode switching that persists across the proxy.

</details>

<details>
<summary><strong>Non-GET requests</strong></summary>

`POST`, `PUT`, `PATCH`, `DELETE` and other non-idempotent requests are fully proxied to the live origin (body included). The static fallback is only served for `GET` requests when the origin is down.

</details>

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Static folder is empty after `save.sh` | `wget` not installed or URL typo | Install `wget`; verify the URL resolves |
| Proxy returns `502 Proxy error` | Worker threw an exception | Check Worker logs in Cloudflare dashboard |
| Site always shows cached version | Origin health check failing | Ensure `_.example.com` DNS record exists and is proxied |
| CSS/images broken on cached pages | `wget` did not download all requisites | Re-run `save.sh`; check `wget` output for errors |
| Cookies not persisting through proxy | `SameSite` policy blocked | Ensure the worker domain uses HTTPS (Cloudflare enforces this by default) |

> [!NOTE]
> Worker logs are available in real time under **Workers & Pages → your worker → Logs** in the Cloudflare dashboard. This is the fastest way to diagnose runtime issues.



# Infinity Operations Dashboard

Fast, responsive, and secure internal operations dashboard for video production pipelines, built with **Astro**, **TypeScript**, and **Cloudflare Pages Functions**.

---

## 🏛️ Architecture

```
Browser (Astro Client / Vanilla TypeScript)
   ↓ (same-origin secure requests)
Cloudflare Pages Functions (/api/* Proxy)
   ↓ (attaches INFINITY_API_TOKEN & verifies HMAC session)
Google Apps Script Web App (APPS_SCRIPT_API_URL)
   ↓
Google Sheet & Google Drive
```

### Key Architectural Tenets
1. **Zero Client Secret Exposure**: `APPS_SCRIPT_API_URL` and `INFINITY_API_TOKEN` are stored exclusively in Cloudflare Pages environment secrets and never bundled into client JavaScript.
2. **Session Security**: Session tokens are signed using HMAC-SHA256 with `SESSION_SECRET` via the Web Crypto API, transmitted via `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
3. **Strict Action Allowlist**: Only the documented read and manager workflow actions are proxied. Unknown actions are rejected before reaching Apps Script.
4. **Data Normalization & Resilience**: An adapter layer normalizes responses, ensuring that missing or null fields render safely as `"—"` without fabricating data.

---

## 🔑 Environment Variables & Secrets

Configure the following secrets in Cloudflare Pages Dashboard (**Settings → Environment variables**) or locally in `.dev.vars`:

| Variable Name | Purpose | Description |
|---|---|---|
| `APPS_SCRIPT_API_URL` | Upstream Backend | Permanent URL of the Google Apps Script Web App deployment |
| `INFINITY_API_TOKEN` | Upstream Secret | Secret API token passed to Google Apps Script |
| `APP_ACCESS_CODE` | Authentication | Shared access code entered by operators at `/login` |
| `SESSION_SECRET` | Cookie Signing | Long random secret string (32+ chars) for HMAC-SHA256 cookie signing |

> **Note**: Never commit `.dev.vars` or `.env` files to git. Template file is provided in `.dev.vars.example`.

---

## 🚀 Local Development & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Local Secrets
Copy the template and set your values:
```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your actual APPS_SCRIPT_API_URL, INFINITY_API_TOKEN, etc.
```

### 3. Run Type Checking
```bash
npm run check
```

### 4. Build Production Bundle
```bash
npm run build
```

### 5. Run Local Cloudflare Pages Emulation (Full Proxy & Functions Support)
```bash
npm run dev:pages
```
The application will be live at `http://localhost:8788`.

### 6. Run Automated Test Suite
With the local pages dev server running:
```bash
node test-suite.js
```

---

## ⚡ Deployment to Cloudflare Pages

### Option A: Direct CLI Deployment via Wrangler
1. Authenticate with Cloudflare:
   ```bash
   npx wrangler login
   ```
2. Deploy the built static assets and Pages Functions:
   ```bash
   npm run build
   npm run deploy
   ```
3. Set the secrets on Cloudflare Pages:
   ```bash
   npx wrangler pages secret put APPS_SCRIPT_API_URL --project-name infinity-operations
   npx wrangler pages secret put INFINITY_API_TOKEN --project-name infinity-operations
   npx wrangler pages secret put APP_ACCESS_CODE --project-name infinity-operations
   npx wrangler pages secret put SESSION_SECRET --project-name infinity-operations
   ```

### Option B: Cloudflare Git Integration (Continuous Deployment)
1. In the [Cloudflare Dashboard](https://dash.cloudflare.com/), go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Select the `Content-Campaign-` repository.
3. Configure Build Settings:
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Add the 4 environment variables under **Settings → Environment variables**.
5. Click **Save and Deploy**.

---

## 📡 Supported API Actions

All requests to `/api/infinity` forward only the following exact actions to the Google Apps Script Web App:

* `bootstrap`: Initial payload with pipeline configuration and metadata.
* `dashboard`: Returns high-level KPI values, action queue, and status breakdown.
* `videos`: Returns all video records for table listing, filtering, and search.
* `video`: Returns detailed fields for a specific video ID (`videoId`).
* `editor_load`: Returns editor workload, capacity, and active task distribution.
* `detect_raw`: Triggers asynchronous Google Drive RAW file detection for a given `videoId`.
* `create_video`: Creates a Script Pending video row.
* `update_script`: Saves manager script, talent, priority, and publish-date edits before production starts.
* `approve_script`: Marks the script ready and asks the existing backend workflow to create/reuse Drive folders.
* `assign_editor`: Assigns or reassigns an active editor through the existing load rules.
* `detect_final`: Checks only the selected video's FINAL folder and moves it to QC Pending when a new file exists.
* `qc_approve`: Approves the current FINAL revision.
* `qc_changes`: Requests changes; non-empty QC notes are required.
* `mark_uploaded`: Records account and post URL after QC approval.

Read-heavy dashboard actions use a 15-second Apps Script cache. Every successful manager write invalidates that cache, so the UI avoids repeated full-sheet reads without showing stale workflow changes.

## Apps Script activation

The complete manager API add-on is also kept in `apps-script/manager-api-addon.js` for review. The canonical Google Doc contains the integrated complete source. A Google Doc edit does **not** update the live bound Apps Script project automatically:

1. Copy the complete latest canonical source into the bound Apps Script `Code.gs` and save it.
2. Do **not** run `setupAllInfinityOperations()` for this update.
3. Deploy the web app as a new version while keeping the existing execute/access settings.
4. Keep the same `APPS_SCRIPT_API_URL` when updating the existing deployment.

---

## 🛡️ Safe Rollback Instructions

If a rollback is required at any time:
1. In Cloudflare Dashboard, navigate to **Workers & Pages → infinity-operations → Deployments**.
2. Locate the previous stable deployment.
3. Click the three dots `...` next to the deployment and select **Rollback to this deployment**.
4. To roll back git commits locally:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

# Infinity Operations

Internal video operations app. Google Sheets remains the source of truth; Google Apps Script performs workflow writes and the Astro app is the fast, role-aware interface.

## What this release changes

- Instant per-video QC state and revision-note updates in the UI.
- Parallel actions across different videos, with backend de-duplication for the same video.
- Manager and Editor workspaces. Editors receive only their own assigned records from Apps Script and cannot approve QC.
- Individual user login support backed by a hidden `USERS` Sheet tab. The shared access code remains a manager fallback until explicitly disabled.
- A truthful, detailed daily MIS, activity evidence, manual Instagram publication/metrics tracking, and a 20:00 Asia/Kolkata default schedule.
- A mobile-friendly `START HERE` Sheet tab and a visible `ACCOUNTS` tab for channel setup.

`operations-v4` is a **code release** until both the Apps Script and Cloudflare Worker are deployed. The app cannot make an older Apps Script deployment expose these new actions.

## Architecture

```text
Browser → Cloudflare Worker → Google Apps Script → Google Sheet / Drive
```

Secrets stay in Cloudflare/local `.dev.vars`; browser code never receives the Apps Script token.

## Local run

Use a fresh folder if your earlier checkout has uncommitted changes:

```bash
git clone --branch codex/operations-v4 --single-branch https://github.com/Ayushpal2006/Content-Campaign-.git ~/Code/Content_campaign_v4
cd ~/Code/Content_campaign_v4
cp .dev.vars.example .dev.vars
# Fill the four secret values in .dev.vars; do not commit this file.
npm install
npm run build:appscript
npm test
npm run check
npm run build
npm run dev
```

Open `http://localhost:3000`. `npm run start` serves the built app at `http://localhost:8788`.

If Astro’s background dev server fails on your Mac, use the foreground command above and keep that Terminal window open. Do not use `wrangler pages dev`: this repository now targets a Cloudflare **Worker**, not Pages Functions.

## Required environment variables

Copy `.dev.vars.example` and set these only in `.dev.vars` locally and Cloudflare Worker secrets in production:

| Name | Required | Purpose |
| --- | --- | --- |
| `APPS_SCRIPT_API_URL` | Yes | Existing deployed Apps Script `/exec` URL |
| `INFINITY_API_TOKEN` | Yes | Token checked by Apps Script |
| `APP_ACCESS_CODE` | Yes initially | Manager fallback sign-in code |
| `SESSION_SECRET` | Yes | New long random session-signing secret |
| `INFINITY_USE_MOCKS` | No | Keep `false` outside tests |
| `INFINITY_READ_CACHE_SECONDS` | No | Read cache TTL; `30` default |
| `INFINITY_DISABLE_SHARED_LOGIN` | No | Set `true` only after a manager login has been tested |

Rotate any secret that was pasted into chat or a screenshot. Do not put secret values in GitHub, the Sheet, or frontend code.

## Apps Script rollout

The full generated script is `apps-script/Code.gs`. It was assembled from the supplied master source plus this release’s add-ons.

1. In the bound Apps Script project, create a versioned backup.
2. Replace the contents of its `Code.gs` with the complete repository `apps-script/Code.gs`. Do not append it to the old source, or duplicate function names will break the project.
3. Save, then run `setupInfinityUserDirectory()` only if you want individual Manager/Editor accounts. It creates and hides the `USERS` tab; it does not reset video data.
4. Deploy a new version of the existing web app, keeping the current execute/access settings and `/exec` URL.
5. Test one manager workflow and one editor account before setting `INFINITY_DISABLE_SHARED_LOGIN=true`.

Do not run `setupAllInfinityOperations()` for this release. It is a first-time/major-repair setup routine, not the normal deployment path.

### Create individual users

Generate a password row locally; it prints the password once and produces a row for the `USERS` tab:

```bash
node scripts/create-user.js harsh editor "Harsh"
```

Paste the generated tab-separated row into `USERS`. Repeat for each exact editor/manager name. The script stores only a PBKDF2 password hash plus salt in the Sheet; it does not create or reveal arbitrary passwords later.

## Daily MIS and Instagram

The MIS is deliberately detailed, but it remains factual: missing metrics appear as “Not recorded”, activity logs show requested UI actions rather than claiming completed work, and manual Instagram data is not invented.

- Default code schedule is 20:00 Asia/Kolkata. An existing `CONFIG!MIS_SEND_HOUR` value overrides it; change that cell to `20` before enabling the schedule.
- Use **Save & Send Test** first, verify recipients and report contents, then enable the daily schedule. Apps Script triggers run in the selected hour window, not at an exact minute.
- Instagram publication and page metrics are manual until real platform API credentials exist. One video can have multiple distribution rows/channels; do not equate an Instagram post with global video `Uploaded` status.

## Cloudflare deployment

This is a Cloudflare Worker deployment. After the Apps Script rollout is verified, configure the environment variables in **Workers & Pages → infinity-operations → Settings → Variables and Secrets**, then deploy:

```bash
npx wrangler login
npm run build
npx wrangler deploy
```

After deployment, open `/api/health`: it should report `version: "operations-v4"`. That endpoint only confirms Worker configuration; test a real read/action to validate the upstream Apps Script connection.

## Validation run for this branch

```text
npm run build:appscript
npm test                  # 31 passing tests
npm run check             # 0 errors, 0 warnings, 0 hints
npm run build             # successful Cloudflare Worker build
```

The sandbox could not start a browser preview because its network-interface probe fails, so visual browser testing and live deployment are still manual rollout steps.

# Infinity Operations Runbook

## Deploy the latest frontend

Use a clean checkout of `main`, then build and deploy the same commit.

```bash
git switch main
git fetch origin
git pull --ff-only origin main
npm install
npm run check
npm run build
npx wrangler pages deploy dist --project-name infinity-operations --branch main
```

## Update the Apps Script backend

The canonical Google Doc does not sync automatically with the bound Apps Script project.

1. Copy only **Tab 1** from the canonical Master Apps Script document.
2. Replace the complete bound `Code.gs`, then save it.
3. Run `repairInfinityCore()` once.
4. Run `repairInfinityUiAndValidations()` once.
5. Run `resetInfinityTriggers()` once.
6. Deploy a new Apps Script web-app version so API calls use the saved source.

Expected triggers:

- `handleInfinityEdit`: spreadsheet on-edit
- `scanRawFast`: every minute
- `runInfinityWorker`: every five minutes

Do not repeatedly run `setupAllInfinityOperations()` on a live Sheet.

## Recover one stuck video

The row must have a Video ID, Publish Date, Script, and checked `Script Ready?` value.

1. Select the affected `VIDEOS` row.
2. Run `repairSelectedVideo()`.
3. Run `scanRawFast()` after uploading to its RAW folder.
4. Run `runInfinityWorker()` after uploading to its FINAL folder. FINAL detection requires `Editing` or `Changes` status.

## Changes workflow

1. Manager opens a `QC Pending` video.
2. Enter a precise instruction in **Change notes**.
3. Press **Request Changes** once.
4. The video moves to `Changes`; the instruction appears in the app's **Changes & problems** panel and detail drawer.
5. Editor follows the instruction and uploads a new file to the same FINAL folder.
6. Manager runs **Detect FINAL**. A new revision is recorded and the video returns to `QC Pending`.
7. Manager reviews the new revision and approves QC.

The visible app performs a forced fresh Sheet check about every 60 seconds. Manual **Refresh** bypasses the read cache immediately. Browser/PWA notifications must be enabled once per device.

## Problems shown in the UI

The Videos page flags:

- `Changes` / `Changes Required`, including QC instructions
- non-empty workflow blockers
- the latest recorded execution error
- overdue SLA state

If an item is missing, inspect the `/api/infinity` `videos` response. The affected record must include `qcChangeNotes`, `blocker`, `lastErrorAt`, `productionStatus`, and `slaStatus`.

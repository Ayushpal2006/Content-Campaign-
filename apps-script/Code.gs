/*************************************************
 * INFINITY OPERATIONS — MASTER SYSTEM
 * PHASE 1 → 7 + OPERATIONS HARDENING
 *
 * Google Sheets = control tower / database
 * Google Drive  = RAW / FINAL assets
 * Apps Script   = automation engine
 *
 * External Instagram / YouTube metrics are PARKED
 * until real social accounts + API access exist.
 *************************************************/

const IO = {
  SPREADSHEET_ID: '1JBm8rXgBv-y7Jz86lwIobPwEByamFnN2RcFKAu30abY',
  TZ: 'Asia/Kolkata',

  VIDEOS: 'VIDEOS',
  EDITORS: 'EDITORS',
  TALENT: 'TALENT',
  ACCOUNTS: 'ACCOUNTS',
  DISTRIBUTION: 'DISTRIBUTION',
  CONFIG: 'CONFIG',
  LOGS: 'LOGS',
  REVISIONS: 'REVISIONS',

  TODAY: 'TODAY',
  EDITOR_LOAD: 'EDITOR LOAD',
  ACTION_QUEUE: 'ACTION QUEUE',
  EDITOR_WORK: 'EDITOR WORK',
  MANAGER_SUMMARY: 'MANAGER SUMMARY',
  MIS: 'MIS',
  DASHBOARD: 'DASHBOARD',

  PRIORITIES: [
    'P0 - Critical',
    'P1 - High',
    'P2 - Normal',
    'P3 - Low'
  ],

  STATUSES: [
    'Script Pending',
    'Script Ready',
    'Recording',
    'Raw Ready',
    'Editing',
    'QC Pending',
    'Changes',
    'Approved',
    'Uploaded',
    'Blocked'
  ],

  QC: [
    'Not Ready',
    'Pending Review',
    'Changes Required',
    'Approved'
  ],

  OPEN_EDIT_STATUSES: [
    'Editing',
    'Changes'
  ]
};


/*************************************************
 * MASTER SETUP
 * RUN ONCE AFTER REPLACING THE SCRIPT.
 *************************************************/

function setupAllInfinityOperations() {
  const ss = getSS_();

  // FAST-SAFE SETUP: keep heavy full-sheet work out of this function.
  clearInfinityTriggers_();
  ss.setSpreadsheetTimeZone(IO.TZ);

  PropertiesService.getScriptProperties().setProperty(
    'INFINITY_LAST_MAINTENANCE_MS',
    String(Date.now())
  );

  createInfinityTriggers_(ss);

  log_(
    ss,
    'MASTER_SETUP',
    '',
    '',
    'SUCCESS',
    'Fast setup completed: timezone + lean triggers installed.',
    ''
  );
}


function repairInfinityCore() {
  const ss = getSS_();
  ss.setSpreadsheetTimeZone(IO.TZ);
  setupStructure_(ss);
  setupEditorWhatsApp_(ss);
  seedConfig_(ss);
  seedEditors_(ss);
  log_(ss, 'REPAIR_CORE', '', '', 'SUCCESS', 'Core structure repaired.', '');
}


function repairInfinityUiAndValidations() {
  const ss = getSS_();
  setupValidations_(ss);
  setupBasicUi_(ss);
  log_(ss, 'REPAIR_UI', '', '', 'SUCCESS', 'UI + validations repaired.', '');
}


function repairInfinityMaintenance() {
  const ss = getSS_();
  initializeMissingStageMeta_(ss);
  recalculateEditorLoads_(ss);
  refreshSlaStatuses_(ss);

  PropertiesService.getScriptProperties().setProperty(
    'INFINITY_LAST_MAINTENANCE_MS',
    String(Date.now())
  );

  log_(ss, 'REPAIR_MAINTENANCE', '', '', 'SUCCESS', 'Maintenance data repaired.', '');
}


function setupOperationalViews() {
  const ss = getSS_();

  refreshOperationalViews_(ss);
  setupWarningProtections_(ss);

  log_(
    ss,
    'VIEW_SETUP',
    '',
    '',
    'SUCCESS',
    'Operational views + warning protections refreshed.',
    ''
  );
}


function applyPerformancePatch() {
  const ss = getSS_();

  // Fast one-time patch: remove old/duplicate triggers and install lean schedule.
  resetInfinityTriggers();

  // Do not force heavy maintenance during this manual patch run.
  PropertiesService.getScriptProperties().setProperty(
    'INFINITY_LAST_MAINTENANCE_MS',
    String(Date.now())
  );

  log_(
    ss,
    'PERFORMANCE_PATCH',
    '',
    '',
    'SUCCESS',
    'Lean worker active: 5-minute polling + 15-minute maintenance throttle.',
    ''
  );
}


/*************************************************
 * CUSTOM MENU
 *************************************************/


function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Infinity Ops')
    .addItem('Setup / Repair System', 'setupAllInfinityOperations')
    .addItem('Apply Performance Patch', 'applyPerformancePatch')
    .addItem('Reset Triggers', 'resetInfinityTriggers')
    .addSeparator()
    .addItem('Run Worker Now', 'runInfinityWorker')
    .addItem('Setup Operational Views', 'setupOperationalViews')
    .addItem('Refresh Views', 'refreshOperationalViews')
    .addItem('Repair Selected Video', 'repairSelectedVideo')
    .addItem('Recalculate Editor Load', 'recalculateEditorLoadsManual')
    .addItem('Health Check', 'healthCheckManual')
    .addItem('Soft Archive Old Completed', 'softArchiveCompletedManual')
    .addToUi();
}


/*************************************************
 * TRIGGERS
 * Exactly 2 installable triggers.
 *************************************************/


function resetInfinityTriggers() {
  const ss = getSS_();

  clearInfinityTriggers_();
  createInfinityTriggers_(ss);

  log_(
    ss,
    'TRIGGER_RESET',
    '',
    '',
    'SUCCESS',
    'handleInfinityEdit + scanRawFast + runInfinityWorker active; RAW interval = 1 minute, worker interval = 5 minutes.',
    ''
  );
}


function clearInfinityTriggers_() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
}


function createInfinityTriggers_(ss) {
  ScriptApp.newTrigger('handleInfinityEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  // Dedicated RAW fast lane: editor assignment checks every minute.
  ScriptApp.newTrigger('scanRawFast')
    .timeBased()
    .everyMinutes(1)
    .create();

  // Heavier FINAL / publishing / maintenance lane stays at 5 minutes.
  ScriptApp.newTrigger('runInfinityWorker')
    .timeBased()
    .everyMinutes(5)
    .create();
}


/*************************************************
 * STRUCTURE
 *************************************************/


function setupStructure_(ss) {
  ensureSheetHeaders_(ss, IO.VIDEOS, [
    'Video ID',
    'Publish Date',
    'Talent',
    'Script',
    'Recording Notes',
    'Priority',
    'Script Ready?',
    'Production Status',
    'Drive Folder URL',
    'RAW Folder ID',
    'FINAL Folder ID',
    'Raw File URL',
    'Final File URL',
    'Editor',
    'QC Status',
    'QC Change Notes',
    'Post URL',
    'Posted?',
    'Account',
    'Views Today',
    'Current Views',
    'Sales',
    'Blocker',
    'Notes',

    // Operational hardening columns
    'Assignment Updated At',
    'Stage Updated At',
    'Due At',
    'SLA Status',
    'Revision No',
    'Retry Count',
    'Last Error At',
    'Archived?',
    'Editor WhatsApp'
  ]);

  ensureSheetHeaders_(ss, IO.EDITORS, [
    'Editor',
    'WhatsApp',
    'Active',
    'Daily Capacity',
    'Open Edit Load',
    'Top Priority Rank',
    'Normal Rotation Order',
    'Last Assigned At',
    'Top Last Assigned At',
    'Notes',
    'Available?',
    'Emergency Backup?'
  ]);

  ensureSheetHeaders_(ss, IO.TALENT, [
    'Talent',
    'Subject / Type',
    'Daily Quota',
    'Active',
    'Notes'
  ]);

  ensureSheetHeaders_(ss, IO.ACCOUNTS, [
    'Account ID',
    'Username / Channel',
    'Platform',
    'Status',
    'Assigned Editor',
    'Rotation Order',
    'Last Assigned At',
    'Platform Account ID',
    'Metrics Enabled',
    'Notes'
  ]);

  ensureSheetHeaders_(ss, IO.DISTRIBUTION, [
    'Distribution ID',
    'Video ID',
    'Account',
    'Editor',
    'Upload Status',
    'Post URL',
    'Uploaded At',
    'Views Today',
    'Current Views',
    'Sales',
    'Metrics Last Sync At',
    'Issue / Note'
  ]);

  ensureSheetHeaders_(ss, IO.REVISIONS, [
    'Revision ID',
    'Video ID',
    'Revision No',
    'Final File ID',
    'Final File URL',
    'Detected At',
    'Editor',
    'QC Outcome',
    'QC Notes',
    'Status'
  ]);

  ensureSheetHeaders_(ss, IO.CONFIG, [
    'Key',
    'Value',
    'Notes'
  ]);

  ensureSheetHeaders_(ss, IO.LOGS, [
    'Timestamp',
    'Action',
    'Video ID',
    'Editor',
    'Status',
    'Details',
    'Error'
  ]);

  [
    IO.TODAY,
    IO.EDITOR_LOAD,
    IO.ACTION_QUEUE,
    IO.EDITOR_WORK,
    IO.MANAGER_SUMMARY,
    IO.MIS,
    IO.DASHBOARD
  ].forEach(name => ensureSheet_(ss, name));
}


function ensureSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  return sheet;
}


function ensureSheetHeaders_(ss, name, requiredHeaders) {
  const sheet = ensureSheet_(ss, name);

  if (sheet.getLastColumn() === 0) {
    sheet
      .getRange(1, 1, 1, requiredHeaders.length)
      .setValues([requiredHeaders]);

    return;
  }

  const current = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(v => String(v || '').trim());

  const missing = requiredHeaders.filter(
    header => !current.includes(header)
  );

  if (missing.length) {
    sheet
      .getRange(
        1,
        sheet.getLastColumn() + 1,
        1,
        missing.length
      )
      .setValues([missing]);
  }
}


/*************************************************
 * CONFIG
 *************************************************/

function seedConfig_(ss) {
  const sheet = ss.getSheetByName(IO.CONFIG);
  const current = getConfig_(ss);

  const rows = [
    ['CAMPAIGN_NAME', 'Vijay Batch Content Campaign', 'Primary campaign'],
    ['CAMPAIGN_CODE', 'VJ', 'Campaign code'],
    ['DAILY_VIDEO_TARGET', 25, 'Daily target'],
    ['MONTHLY_VIEW_TARGET', 6000000, 'Monthly views target'],
    ['DEFAULT_CTA', 'Join Batch', 'CTA is inside Script text'],
    ['PRODUCTION_ROOT_FOLDER_ID', '1_bgGTyRZpjzaywVpdPvLXerQ8Rbn8v1I', 'Production root'],
    ['TIME_ZONE', IO.TZ, 'Spreadsheet / Apps Script timezone'],
    ['TOP_EDITOR_1', 'Shivam Gupta', 'Priority rank 1'],
    ['TOP_EDITOR_2', 'Shivani Maurya', 'Priority rank 2'],
    ['TOP_EDITOR_3', 'Vipin Mishra', 'Priority rank 3'],
    ['SCRIPT_INPUT_MODE', 'FULL_SCRIPT', 'Hook + body + CTA together'],
    ['METRICS_AUTOMATION', 'PARKED', 'Enable only after real social accounts / APIs'],

    // SLA defaults are editable from CONFIG.
    ['SLA_SCRIPT_READY_RAW_HOURS', 4, 'Script Ready → RAW'],
    ['SLA_EDIT_HOURS', 6, 'Editing SLA'],
    ['SLA_QC_HOURS', 1, 'QC review SLA'],
    ['SLA_CHANGES_HOURS', 3, 'Correction SLA'],
    ['SLA_APPROVED_POST_HOURS', 2, 'Approved → Posted SLA'],

    // Keeps old priority rule unless manager changes this.
    ['PRIORITY_FALLBACK_TO_ALL', 'FALSE', 'P0/P1 remain in top editor pool'],

    // No surprise auto-movement of already assigned work.
    ['AUTO_REASSIGN_UNAVAILABLE', 'FALSE', 'Manager controls manual reassignment'],

    ['ARCHIVE_AFTER_DAYS', 90, 'Soft archive only; rows are never deleted']
  ];

  rows.forEach(row => {
    if (!(row[0] in current)) {
      sheet.appendRow(row);
    }
  });
}


/*************************************************
 * EDITOR MASTER
 *************************************************/

function seedEditors_(ss) {
  const sheet = ss.getSheetByName(IO.EDITORS);
  const h = headers_(sheet);

  const existing = new Set();

  if (sheet.getLastRow() >= 2) {
    sheet
      .getRange(2, h['Editor'], sheet.getLastRow() - 1, 1)
      .getValues()
      .flat()
      .forEach(v => existing.add(String(v || '').trim()));
  }

  const editors = [
    ['Shivam Gupta', '+917054570966', true, 5, 0, 1, 5, true, true],
    ['Shivani Maurya', '+919956041452', true, 5, 0, 2, 4, true, true],
    ['Vipin Mishra', '+919696702846', true, 5, 0, 3, 7, true, true],
    ['Ahmed', '+917706990313', true, 5, 0, '', 1, true, true],
    ['Kaif', '+918795832393', true, 5, 0, '', 2, true, true],
    ['Mohit', '+919118628060', true, 5, 0, '', 3, true, true],
    ['Vishal Singh', '+919580964479', true, 5, 0, '', 6, true, true]
  ];

  editors.forEach(ed => {
    if (existing.has(ed[0])) return;

    const row = new Array(sheet.getLastColumn()).fill('');

    row[h['Editor'] - 1] = ed[0];
    row[h['WhatsApp'] - 1] = ed[1];
    row[h['Active'] - 1] = ed[2];
    row[h['Daily Capacity'] - 1] = ed[3];
    row[h['Open Edit Load'] - 1] = ed[4];
    row[h['Top Priority Rank'] - 1] = ed[5];
    row[h['Normal Rotation Order'] - 1] = ed[6];
    row[h['Available?'] - 1] = ed[7];
    row[h['Emergency Backup?'] - 1] = ed[8];

    sheet.appendRow(row);
  });

  // Backfill availability for old existing editor rows.
  for (let row = 2; row <= sheet.getLastRow(); row++) {
    if (
      h['Available?'] &&
      sheet.getRange(row, h['Available?']).isBlank()
    ) {
      sheet.getRange(row, h['Available?']).setValue(true);
    }

    if (
      h['Emergency Backup?'] &&
      sheet.getRange(row, h['Emergency Backup?']).isBlank()
    ) {
      sheet.getRange(row, h['Emergency Backup?']).setValue(true);
    }
  }
}


/*************************************************
 * VALIDATION + BASIC UI
 *************************************************/

function setupEditorWhatsApp_(ss) {
  const sh = ss.getSheetByName(IO.VIDEOS);
  if (!sh) return;

  const col = headers_(sh)['Editor WhatsApp'] || 0;
  if (!col || sh.getMaxRows() < 2) return;

  const lastDataRow = getLastVideoDataRow_(sh);

  // Backfill only real VIDEO rows. Never fill the whole 2000-row sheet,
  // otherwise formulas create ghost rows and slow the worker.
  if (lastDataRow >= 2) {
    const formulas = [];
    for (let row = 2; row <= lastDataRow; row++) {
      formulas.push([editorWhatsAppFormula_(row)]);
    }
    sh.getRange(2, col, lastDataRow - 1, 1).setFormulas(formulas);
  }

  // Remove old WhatsApp formulas below the last real Video ID row.
  const clearStart = Math.max(lastDataRow + 1, 2);
  if (clearStart <= sh.getMaxRows()) {
    sh.getRange(clearStart, col, sh.getMaxRows() - clearStart + 1, 1).clearContent();
  }
}


function refreshEditorWhatsAppLinks_(ss) {
  const sh = ss.getSheetByName(IO.VIDEOS);
  if (!sh) return;

  const col = headers_(sh)['Editor WhatsApp'] || 0;
  const lastDataRow = getLastVideoDataRow_(sh);
  if (!col || lastDataRow < 2) return;

  // One bulk read. Only newly assigned rows get a write.
  const data = sh.getRange(2, 1, lastDataRow - 1, 14).getDisplayValues();
  const formulas = sh.getRange(2, col, lastDataRow - 1, 1).getFormulas();

  for (let i = 0; i < data.length; i++) {
    const videoId = String(data[i][0] || '').trim();
    const editor = String(data[i][13] || '').trim();

    if (videoId && editor && !formulas[i][0]) {
      sh.getRange(i + 2, col).setFormula(editorWhatsAppFormula_(i + 2));
    }
  }
}


function getLastVideoDataRow_(sh) {
  const count = sh.getMaxRows() - 1;
  if (count <= 0) return 1;

  const ids = sh.getRange(2, 1, count, 1).getDisplayValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0] || '').trim()) return i + 2;
  }
  return 1;
}


function editorWhatsAppFormula_(row) {
  return `=IF(OR($A${row}="",$N${row}=""),"",IFERROR(HYPERLINK("https://wa.me/"&REGEXREPLACE(TO_TEXT(INDEX(EDITORS!$B:$B,MATCH($N${row},EDITORS!$A:$A,0))),"[^0-9]","")&"?text="&ENCODEURL("Hi "&$N${row}&","&CHAR(10)&CHAR(10)&"New video assigned for editing."&CHAR(10)&"Video ID: "&$A${row}&CHAR(10)&"Talent: "&$C${row}&CHAR(10)&"Priority: "&$F${row}&CHAR(10)&CHAR(10)&IF($D${row}<>"","Script:"&CHAR(10)&LEFT($D${row},1200)&CHAR(10)&CHAR(10),"")&IF($L${row}<>"","RAW VIDEO: "&$L${row}&CHAR(10)&CHAR(10),"")&IF($I${row}<>"","Main folder: "&$I${row}&CHAR(10),"")&IF($J${row}<>"","RAW folder: https://drive.google.com/drive/folders/"&$J${row}&CHAR(10),"")&IF($K${row}<>"","FINAL folder: https://drive.google.com/drive/folders/"&$K${row}&CHAR(10),"")&CHAR(10)&"Please start editing and upload the final file in the FINAL folder."),"Send WhatsApp"),""))`;
}


function setupValidations_(ss) {
  const videos = ss.getSheetByName(IO.VIDEOS);
  const vh = headers_(videos);
  const rows = Math.max(videos.getMaxRows() - 1, 1);

  // Talent is a dropdown sourced from the TALENT master. Allow invalid values
  // because multi-select cells become comma-separated combinations.
  if (vh['Talent']) {
    const talent = ss.getSheetByName(IO.TALENT);
    if (talent) {
      videos.getRange(2, vh['Talent'], rows, 1)
        .setDataValidation(
          SpreadsheetApp.newDataValidation()
            .requireValueInRange(talent.getRange('A2:A200'), true)
            .setAllowInvalid(true)
            .build()
        );
    }
  }

  videos.setFrozenRows(1);

  if (vh['Script Ready?']) {
    videos
      .getRange(2, vh['Script Ready?'], rows, 1)
      .setDataValidation(
        SpreadsheetApp
          .newDataValidation()
          .requireCheckbox()
          .build()
      );
  }

  if (vh['Posted?']) {
    videos
      .getRange(2, vh['Posted?'], rows, 1)
      .setDataValidation(
        SpreadsheetApp
          .newDataValidation()
          .requireCheckbox()
          .build()
      );
  }

  if (vh['Archived?']) {
    videos
      .getRange(2, vh['Archived?'], rows, 1)
      .setDataValidation(
        SpreadsheetApp
          .newDataValidation()
          .requireCheckbox()
          .build()
      );
  }

  if (vh['Priority']) {
    videos
      .getRange(2, vh['Priority'], rows, 1)
      .setDataValidation(
        SpreadsheetApp
          .newDataValidation()
          .requireValueInList(IO.PRIORITIES, true)
          .setAllowInvalid(false)
          .build()
      );
  }

  if (vh['Production Status']) {
    videos
      .getRange(2, vh['Production Status'], rows, 1)
      .setDataValidation(
        SpreadsheetApp
          .newDataValidation()
          .requireValueInList(IO.STATUSES, true)
          .setAllowInvalid(true)
          .build()
      );
  }

  if (vh['QC Status']) {
    videos
      .getRange(2, vh['QC Status'], rows, 1)
      .setDataValidation(
        SpreadsheetApp
          .newDataValidation()
          .requireValueInList(IO.QC, true)
          .setAllowInvalid(true)
          .build()
      );
  }

  const editors = ss.getSheetByName(IO.EDITORS);
  const eh = headers_(editors);

  if (vh['Editor'] && editors.getLastRow() >= 2) {
    videos
      .getRange(2, vh['Editor'], rows, 1)
      .setDataValidation(
        SpreadsheetApp
          .newDataValidation()
          .requireValueInRange(
            editors.getRange(2, eh['Editor'], editors.getLastRow() - 1, 1),
            true
          )
          .setAllowInvalid(false)
          .build()
      );
  }

  ['Active', 'Available?', 'Emergency Backup?'].forEach(name => {
    if (!eh[name]) return;

    editors
      .getRange(
        2,
        eh[name],
        Math.max(editors.getMaxRows() - 1, 1),
        1
      )
      .setDataValidation(
        SpreadsheetApp
          .newDataValidation()
          .requireCheckbox()
          .build()
      );
  });
}


function setupBasicUi_(ss) {
  const visible = new Set([
    IO.TODAY,
    IO.EDITOR_LOAD,
    IO.ACTION_QUEUE,
    IO.EDITOR_WORK,
    IO.MANAGER_SUMMARY,
    IO.MIS,
    IO.VIDEOS
  ]);

  ss.getSheets().forEach(sheet => {
    if (visible.has(sheet.getName())) {
      try {
        sheet.showSheet();
      } catch (_) {}
    } else {
      try {
        sheet.hideSheet();
      } catch (_) {}
    }
  });

  const videos = ss.getSheetByName(IO.VIDEOS);
  const h = headers_(videos);

  if (h['Script']) {
    videos.setColumnWidth(h['Script'], 420);
    videos
      .getRange(
        2,
        h['Script'],
        Math.max(videos.getMaxRows() - 1, 1),
        1
      )
      .setWrap(true);
  }

  ['RAW Folder ID', 'FINAL Folder ID'].forEach(name => {
    if (!h[name]) return;

    try {
      videos.hideColumns(h[name]);
    } catch (_) {}
  });
}


/*************************************************
 * MASTER EDIT ROUTER
 *************************************************/

function applyTalentMultiSelect_(e) {
  if (!e || !e.range) return;

  const newValue = String(e.value || '').trim();
  const oldValue = String(e.oldValue || '').trim();

  // Clearing the cell should genuinely clear it; first selection stays untouched.
  if (!newValue || !oldValue || oldValue === newValue) return;

  const values = oldValue
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

  if (!values.includes(newValue)) values.push(newValue);

  e.range.setValue(values.join(', '));
}


function handleInfinityEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  const ss = e.source || getSS_();

  if (sheet.getName() === IO.VIDEOS) {
    const h = headers_(sheet);

    const startCol = e.range.getColumn();
    const endCol = e.range.getLastColumn();
    const startRow = Math.max(2, e.range.getRow());
    const endRow = e.range.getLastRow();

    // Talent dropdown supports additive multi-select for single-cell edits.
    if (
      h['Talent'] &&
      h['Talent'] >= startCol &&
      h['Talent'] <= endCol &&
      e.range.getNumRows() === 1 &&
      e.range.getNumColumns() === 1
    ) {
      applyTalentMultiSelect_(e);
    }

    // Script Ready
    if (
      h['Script Ready?'] &&
      h['Script Ready?'] >= startCol &&
      h['Script Ready?'] <= endCol
    ) {
      for (let row = startRow; row <= endRow; row++) {
        const checked =
          sheet
            .getRange(row, h['Script Ready?'])
            .getValue() === true;

        if (checked) {
          processScriptReady_(ss, sheet, row);
        }
      }
    }

    // Manual editor assignment / reassignment.
    if (
      h['Editor'] &&
      h['Editor'] >= startCol &&
      h['Editor'] <= endCol
    ) {
      for (let row = startRow; row <= endRow; row++) {
        processEditorReassignment_(
          ss,
          sheet,
          h,
          row,
          e
        );
      }
    }

    // QC.
    if (
      h['QC Status'] &&
      h['QC Status'] >= startCol &&
      h['QC Status'] <= endCol
    ) {
      for (let row = startRow; row <= endRow; row++) {
        processQcChange_(
          ss,
          sheet,
          h,
          row
        );
      }
    }

    // Posted.
    if (
      h['Posted?'] &&
      h['Posted?'] >= startCol &&
      h['Posted?'] <= endCol
    ) {
      for (let row = startRow; row <= endRow; row++) {
        const posted =
          sheet
            .getRange(row, h['Posted?'])
            .getValue() === true;

        if (posted) {
          processPosted_(
            ss,
            sheet,
            h,
            row
          );
        }
      }
    }

    // If manager manually changes stage, recalc its stage clock.
    if (
      h['Production Status'] &&
      h['Production Status'] >= startCol &&
      h['Production Status'] <= endCol
    ) {
      for (let row = startRow; row <= endRow; row++) {
        const status = String(
          sheet
            .getRange(row, h['Production Status'])
            .getValue() || ''
        ).trim();

        touchStageMeta_(
          ss,
          sheet,
          row,
          h,
          status
        );
      }

      recalculateEditorLoads_(ss);
    }
  }

  // Internal sheet-level metrics sync only.
  // No external Meta / YouTube API calls.
  if (sheet.getName() === IO.DISTRIBUTION) {
    syncDistributionMetrics_(ss);
  }
}


/*************************************************
 * LEAN MASTER WORKER
 *************************************************/

function runInfinityWorker() {
  const lock = LockService.getScriptLock();

  // Heavy worker stays on the slower lane. RAW detection is handled by
  // scanRawFast() every minute so editor assignment is not delayed by FINAL,
  // publishing or maintenance work.
  if (!lock.tryLock(1000)) return;

  try {
    const ss = getSS_();

    scanFinal_(ss);

    // Phase 5 stays dormant until real publishing accounts exist.
    if (hasActiveAccounts_(ss)) {
      scanApproved_(ss);
    }

    // Full-sheet maintenance is throttled separately.
    runMaintenanceIfDue_(ss);

  } catch (err) {
    log_(
      getSS_(),
      'WORKER',
      '',
      '',
      'ERROR',
      'Operational worker failed',
      err.stack || err.message || String(err)
    );
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}


function runMaintenanceIfDue_(ss) {
  const props = PropertiesService.getScriptProperties();
  const now = Date.now();
  const last = Number(
    props.getProperty('INFINITY_LAST_MAINTENANCE_MS') || 0
  );

  // Heavy full-sheet jobs run at most once every 15 minutes.
  if (now - last < 15 * 60 * 1000) return;

  recalculateEditorLoads_(ss);
  refreshSlaStatuses_(ss);

  props.setProperty(
    'INFINITY_LAST_MAINTENANCE_MS',
    String(now)
  );
}


/*************************************************
 * PHASE 2
 * SCRIPT READY → DRIVE FOLDERS
 *************************************************/


function processScriptReady_(ss, sheet, row) {
  const lock = LockService.getScriptLock();
  let acquired = false;
  let videoId = '';

  try {
    acquired = lock.tryLock(10000);

    if (!acquired) return;

    const h = headers_(sheet);

    requireHeaders_(h, [
      'Video ID',
      'Publish Date',
      'Script',
      'Script Ready?',
      'Production Status',
      'Drive Folder URL',
      'RAW Folder ID',
      'FINAL Folder ID',
      'Blocker'
    ]);

    videoId = String(
      sheet
        .getRange(row, h['Video ID'])
        .getValue() || ''
    ).trim();

    const publishDate =
      sheet
        .getRange(row, h['Publish Date'])
        .getValue();

    const script = String(
      sheet
        .getRange(row, h['Script'])
        .getValue() || ''
    ).trim();

    const ready =
      sheet
        .getRange(row, h['Script Ready?'])
        .getValue() === true;

    const errors = [];

    if (!videoId) {
      errors.push('Video ID missing');
    }

    if (!publishDate) {
      errors.push('Publish Date missing');
    }

    if (!script) {
      errors.push('Script missing');
    }

    if (!ready) {
      errors.push('Script Ready? unchecked');
    }

    if (errors.length) {
      autoBlock_(
        sheet,
        row,
        h,
        errors.join(', ')
      );

      log_(
        ss,
        'DRIVE_SETUP',
        videoId,
        '',
        'ERROR',
        'Validation failed',
        errors.join(', ')
      );

      return;
    }

    const config = getConfig_(ss);

    const rootId = String(
      config['PRODUCTION_ROOT_FOLDER_ID'] || ''
    ).trim();

    if (!rootId) {
      throw new Error(
        'PRODUCTION_ROOT_FOLDER_ID missing.'
      );
    }

    const root =
      DriveApp.getFolderById(rootId);

    root.getName();

    const folderName =
      `${formatDate_(publishDate)}__${sanitizeFolderName_(videoId)}`;

    let base = null;

    const currentUrl = String(
      sheet
        .getRange(row, h['Drive Folder URL'])
        .getValue() || ''
    ).trim();

    const currentBaseId =
      extractId_(currentUrl);

    if (
      currentBaseId &&
      folderExists_(currentBaseId)
    ) {
      base =
        DriveApp.getFolderById(
          currentBaseId
        );
    }

    if (!base) {
      base =
        findFolder_(
          root,
          folderName
        );
    }

    if (!base) {
      base =
        root.createFolder(
          folderName
        );
    }

    let raw = null;

    const currentRawId = String(
      sheet
        .getRange(row, h['RAW Folder ID'])
        .getValue() || ''
    ).trim();

    if (
      currentRawId &&
      folderExistsInParent_(
        currentRawId,
        base.getId()
      )
    ) {
      raw =
        DriveApp.getFolderById(
          currentRawId
        );
    }

    if (!raw) {
      raw =
        findFolder_(base, 'RAW');
    }

    if (!raw) {
      raw =
        base.createFolder('RAW');
    }

    let finalFolder = null;

    const currentFinalId = String(
      sheet
        .getRange(row, h['FINAL Folder ID'])
        .getValue() || ''
    ).trim();

    if (
      currentFinalId &&
      folderExistsInParent_(
        currentFinalId,
        base.getId()
      )
    ) {
      finalFolder =
        DriveApp.getFolderById(
          currentFinalId
        );
    }

    if (!finalFolder) {
      finalFolder =
        findFolder_(base, 'FINAL');
    }

    if (!finalFolder) {
      finalFolder =
        base.createFolder('FINAL');
    }

    set_(
      sheet,
      row,
      h,
      'Drive Folder URL',
      base.getUrl()
    );

    set_(
      sheet,
      row,
      h,
      'RAW Folder ID',
      raw.getId()
    );

    set_(
      sheet,
      row,
      h,
      'FINAL Folder ID',
      finalFolder.getId()
    );

    setProductionStatus_(
      ss,
      sheet,
      row,
      h,
      'Script Ready'
    );

    clearAutoBlock_(
      sheet,
      row,
      h
    );

    log_(
      ss,
      'DRIVE_SETUP',
      videoId,
      '',
      'SUCCESS',
      `BASE=${base.getId()} | RAW=${raw.getId()} | FINAL=${finalFolder.getId()}`,
      ''
    );

  } catch (err) {
    const h = headers_(sheet);

    recordRowError_(
      sheet,
      row,
      h,
      err
    );

    log_(
      ss,
      'DRIVE_SETUP',
      videoId,
      '',
      'ERROR',
      '',
      err.stack || err.message || String(err)
    );

  } finally {
    if (acquired) {
      try {
        lock.releaseLock();
      } catch (_) {}
    }
  }
}


/*************************************************
 * PHASE 3
 * RAW → EDITOR → EDITING
 *************************************************/

function scanRawFast() {
  try {
    processInfinityWebJobs_();
  } catch (queueErr) {
    log_(getSS_(), 'WEB_JOB_QUEUE', '', '', 'ERROR', 'Web action queue worker failed', queueErr.stack || queueErr.message || String(queueErr));
  }

  const lock = LockService.getScriptLock();

  // RAW detection has its own fast lane. If another Infinity job is busy,
  // skip this minute instead of waiting and creating overlapping executions.
  if (!lock.tryLock(500)) return;

  try {
    scanRaw_(getSS_());
  } catch (err) {
    log_(
      getSS_(),
      'RAW_FAST',
      '',
      '',
      'ERROR',
      'Fast RAW scanner failed',
      err.stack || err.message || String(err)
    );
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}


function scanRaw_(ss, onlyVideoId) {
  const sheet =
    ss.getSheetByName(IO.VIDEOS);

  const h = headers_(sheet);

  if (sheet.getLastRow() < 2) {
    return;
  }

  const rows = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      sheet.getLastColumn()
    )
    .getValues();

  rows.forEach((data, i) => {
    const row = i + 2;
    const val = name => data[h[name] - 1];

    const videoId =
      String(val('Video ID') || '').trim();

    if (!videoId) return;
    if (onlyVideoId && videoId !== String(onlyVideoId).trim()) return;


    if (val('Archived?') === true) {
      return;
    }

    if (val('Script Ready?') !== true) {
      return;
    }

    const status =
      String(
        val('Production Status') || ''
      ).trim();

    if (
      ![
        'Script Ready',
        'Recording',
        'Raw Ready'
      ].includes(status)
    ) {
      return;
    }

    const rawFolderId =
      String(
        val('RAW Folder ID') || ''
      ).trim();

    if (!rawFolderId) return;

    try {
      const folder =
        DriveApp.getFolderById(
          rawFolderId
        );

      const raw =
        latestVideo_(folder);

      if (!raw) return;

      const priority =
        String(
          val('Priority') || ''
        ).trim();

      const existingEditor =
        String(
          val('Editor') || ''
        ).trim();

      let editor = null;

      if (existingEditor) {
        const editorState =
          getEditorState_(
            ss,
            existingEditor
          );

        if (!editorState) {
          autoBlock_(
            sheet,
            row,
            h,
            `Assigned editor not found: ${existingEditor}`
          );

          return;
        }

        if (!editorState.active) {
          autoBlock_(
            sheet,
            row,
            h,
            `${existingEditor} is inactive. Reassign manually.`
          );

          return;
        }

        if (!editorState.available) {
          autoBlock_(
            sheet,
            row,
            h,
            `${existingEditor} is unavailable. Reassign manually.`
          );

          return;
        }

        editor = editorState;

      } else {
        editor =
          chooseEditor_(
            ss,
            priority
          );
      }

      if (!editor) {
        autoBlock_(
          sheet,
          row,
          h,
          'No active editor available under capacity.'
        );

        return;
      }

      set_(
        sheet,
        row,
        h,
        'Raw File URL',
        raw.getUrl()
      );

      if (!existingEditor) {
        set_(
          sheet,
          row,
          h,
          'Editor',
          editor.name
        );

        set_(
          sheet,
          row,
          h,
          'Assignment Updated At',
          new Date()
        );
      }

      setProductionStatus_(
        ss,
        sheet,
        row,
        h,
        'Editing'
      );

      clearAutoBlock_(
        sheet,
        row,
        h
      );

      updateEditorAssignment_(
        ss,
        editor.name,
        isPriority_(priority)
      );

      log_(
        ss,
        'RAW_DETECTED_ASSIGN',
        videoId,
        editor.name,
        'SUCCESS',
        `RAW=${raw.getId()} | Priority=${priority} | PreviousLoad=${editor.load || 0}`,
        ''
      );

    } catch (err) {
      recordRowError_(
        sheet,
        row,
        h,
        err
      );

      log_(
        ss,
        'RAW_SCAN',
        videoId,
        '',
        'ERROR',
        '',
        err.stack || err.message || String(err)
      );
    }
  });
}


/*************************************************
 * EDITOR SELECTION + LOAD
 *************************************************/

function chooseEditor_(ss, priority) {
  const sheet =
    ss.getSheetByName(IO.EDITORS);

  const h = headers_(sheet);
  const loads = calculateLoads_(ss);
  const config = getConfig_(ss);

  if (sheet.getLastRow() < 2) {
    return null;
  }

  let editors = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      sheet.getLastColumn()
    )
    .getValues()
    .map((r, i) => {
      const name = String(
        r[h['Editor'] - 1] || ''
      ).trim();

      const active =
        bool_(r[h['Active'] - 1]);

      const available =
        h['Available?']
          ? bool_(r[h['Available?'] - 1])
          : true;

      const emergency =
        h['Emergency Backup?']
          ? bool_(r[h['Emergency Backup?'] - 1])
          : true;

      const capacity =
        Number(
          r[h['Daily Capacity'] - 1]
        ) || 5;

      const rank =
        Number(
          r[h['Top Priority Rank'] - 1]
        ) || 999;

      const rotation =
        Number(
          r[h['Normal Rotation Order'] - 1]
        ) || 999;

      const lastVal =
        r[h['Last Assigned At'] - 1];

      const lastTime =
        lastVal instanceof Date &&
        !isNaN(lastVal.getTime())
          ? lastVal.getTime()
          : 0;

      return {
        name,
        active,
        available,
        emergency,
        capacity,
        rank,
        rotation,
        lastTime,
        load: Number(loads[name] || 0),
        row: i + 2
      };
    });

  editors = editors.filter(
    x =>
      x.name &&
      x.active &&
      x.available &&
      x.load < x.capacity
  );

  if (isPriority_(priority)) {
    const topPool =
      editors.filter(
        x => x.rank < 999
      );

    if (topPool.length) {
      topPool.sort(
        (a, b) =>
          a.load - b.load ||
          a.rank - b.rank
      );

      return topPool[0];
    }

    // Default remains FALSE to preserve the top-3 rule.
    if (
      bool_(
        config['PRIORITY_FALLBACK_TO_ALL']
      )
    ) {
      const backups =
        editors.filter(
          x => x.emergency
        );

      backups.sort(
        (a, b) =>
          a.load - b.load ||
          a.lastTime - b.lastTime ||
          a.rotation - b.rotation
      );

      return backups[0] || null;
    }

    return null;
  }

  editors.sort(
    (a, b) =>
      a.load - b.load ||
      a.lastTime - b.lastTime ||
      a.rotation - b.rotation
  );

  return editors[0] || null;
}


function getEditorState_(ss, editorName) {
  const sheet =
    ss.getSheetByName(IO.EDITORS);

  const h = headers_(sheet);
  const loads = calculateLoads_(ss);

  for (
    let row = 2;
    row <= sheet.getLastRow();
    row++
  ) {
    const name = String(
      sheet
        .getRange(row, h['Editor'])
        .getValue() || ''
    ).trim();

    if (name !== editorName) {
      continue;
    }

    return {
      name,
      row,
      active: bool_(
        sheet
          .getRange(row, h['Active'])
          .getValue()
      ),
      available: h['Available?']
        ? bool_(
            sheet
              .getRange(row, h['Available?'])
              .getValue()
          )
        : true,
      capacity:
        Number(
          sheet
            .getRange(
              row,
              h['Daily Capacity']
            )
            .getValue()
        ) || 5,
      rank:
        Number(
          sheet
            .getRange(
              row,
              h['Top Priority Rank']
            )
            .getValue()
        ) || 999,
      load: Number(loads[name] || 0)
    };
  }

  return null;
}


function isPriority_(priority) {
  const p =
    String(priority || '')
      .trim()
      .toUpperCase();

  return (
    p.startsWith('P0') ||
    p.startsWith('P1')
  );
}


function calculateLoads_(ss) {
  const sheet =
    ss.getSheetByName(IO.VIDEOS);

  const h = headers_(sheet);
  const loads = {};

  if (sheet.getLastRow() < 2) {
    return loads;
  }

  sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      sheet.getLastColumn()
    )
    .getValues()
    .forEach(r => {
      const editor =
        String(
          r[h['Editor'] - 1] || ''
        ).trim();

      const status =
        String(
          r[
            h['Production Status'] - 1
          ] || ''
        ).trim();

      const archived =
        h['Archived?']
          ? r[h['Archived?'] - 1] === true
          : false;

      if (
        !archived &&
        editor &&
        IO.OPEN_EDIT_STATUSES.includes(status)
      ) {
        loads[editor] =
          (loads[editor] || 0) + 1;
      }
    });

  return loads;
}


function recalculateEditorLoads_(ss) {
  const sheet =
    ss.getSheetByName(IO.EDITORS);

  const h = headers_(sheet);
  const loads = calculateLoads_(ss);

  if (
    !h['Editor'] ||
    !h['Open Edit Load']
  ) {
    return;
  }

  for (
    let row = 2;
    row <= sheet.getLastRow();
    row++
  ) {
    const editor = String(
      sheet
        .getRange(row, h['Editor'])
        .getValue() || ''
    ).trim();

    sheet
      .getRange(
        row,
        h['Open Edit Load']
      )
      .setValue(
        loads[editor] || 0
      );
  }
}


function updateEditorAssignment_(
  ss,
  editor,
  priority
) {
  const sheet =
    ss.getSheetByName(IO.EDITORS);

  const h = headers_(sheet);

  for (
    let row = 2;
    row <= sheet.getLastRow();
    row++
  ) {
    const name = String(
      sheet
        .getRange(row, h['Editor'])
        .getValue() || ''
    ).trim();

    if (name !== editor) {
      continue;
    }

    set_(
      sheet,
      row,
      h,
      'Last Assigned At',
      new Date()
    );

    if (
      priority &&
      h['Top Last Assigned At']
    ) {
      set_(
        sheet,
        row,
        h,
        'Top Last Assigned At',
        new Date()
      );
    }

    return;
  }
}


/*************************************************
 * MANUAL EDITOR REASSIGNMENT
 *
 * IMPORTANT:
 * It does NOT restart from Script Ready.
 * It refreshes editor-dependent backend state.
 *************************************************/

function processEditorReassignment_(
  ss,
  sheet,
  h,
  row,
  e
) {
  const videoId = String(
    sheet
      .getRange(row, h['Video ID'])
      .getValue() || ''
  ).trim();

  if (!videoId) return;

  const newEditor = String(
    sheet
      .getRange(row, h['Editor'])
      .getValue() || ''
  ).trim();

  let oldEditor = '';

  // e.oldValue is reliable for normal single-cell edit.
  if (
    e &&
    e.range &&
    e.range.getNumRows() === 1 &&
    e.range.getNumColumns() === 1
  ) {
    oldEditor =
      String(e.oldValue || '').trim();
  }

  if (
    oldEditor &&
    oldEditor === newEditor
  ) {
    return;
  }

  const status = String(
    sheet
      .getRange(
        row,
        h['Production Status']
      )
      .getValue() || ''
  ).trim();

  const posted =
    h['Posted?']
      ? sheet
          .getRange(row, h['Posted?'])
          .getValue() === true
      : false;

  // Historical posts must not be silently rewritten.
  if (
    status === 'Uploaded' ||
    posted
  ) {
    if (oldEditor) {
      set_(
        sheet,
        row,
        h,
        'Editor',
        oldEditor
      );
    }

    autoBlock_(
      sheet,
      row,
      h,
      'Uploaded history is locked. Do not reassign editor after posting.'
    );

    log_(
      ss,
      'EDITOR_REASSIGN_BLOCKED',
      videoId,
      newEditor,
      'ERROR',
      `Old=${oldEditor} | Status=${status}`,
      ''
    );

    return;
  }

  if (!newEditor) {
    set_(
      sheet,
      row,
      h,
      'Assignment Updated At',
      new Date()
    );

    recalculateEditorLoads_(ss);

    log_(
      ss,
      'EDITOR_UNASSIGNED',
      videoId,
      oldEditor,
      'SUCCESS',
      `Old=${oldEditor}`,
      ''
    );

    return;
  }

  const state =
    getEditorState_(
      ss,
      newEditor
    );

  if (!state || !state.active) {
    if (oldEditor) {
      set_(
        sheet,
        row,
        h,
        'Editor',
        oldEditor
      );
    }

    autoBlock_(
      sheet,
      row,
      h,
      `Invalid / inactive editor: ${newEditor}`
    );

    return;
  }

  // Manual manager override is allowed even if Available? is OFF,
  // but it is clearly flagged.
  if (!state.available) {
    autoBlock_(
      sheet,
      row,
      h,
      `${newEditor} is marked unavailable. Manual reassignment preserved.`
    );
  } else {
    clearAutoBlock_(
      sheet,
      row,
      h
    );
  }

  set_(
    sheet,
    row,
    h,
    'Assignment Updated At',
    new Date()
  );

  const priority = String(
    sheet
      .getRange(row, h['Priority'])
      .getValue() || ''
  ).trim();

  updateEditorAssignment_(
    ss,
    newEditor,
    isPriority_(priority)
  );

  // Approved but not posted:
  // publishing assignment belongs to old editor,
  // so reset account/distribution and let Phase 5 rebuild.
  if (
    status === 'Approved' &&
    !posted
  ) {
    set_(
      sheet,
      row,
      h,
      'Account',
      ''
    );

    set_(
      sheet,
      row,
      h,
      'Post URL',
      ''
    );

    resetDistributionForReassignment_(
      ss,
      videoId,
      newEditor
    );

    touchStageMeta_(
      ss,
      sheet,
      row,
      h,
      'Approved'
    );
  }

  recalculateEditorLoads_(ss);

  log_(
    ss,
    'EDITOR_REASSIGNED',
    videoId,
    newEditor,
    'SUCCESS',
    `Old=${oldEditor || '(unknown)'} | New=${newEditor} | Stage=${status}`,
    ''
  );
}


function resetDistributionForReassignment_(
  ss,
  videoId,
  editor
) {
  const sheet =
    ss.getSheetByName(
      IO.DISTRIBUTION
    );

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return;
  }

  const h = headers_(sheet);

  for (
    let row = 2;
    row <= sheet.getLastRow();
    row++
  ) {
    const id = String(
      sheet
        .getRange(
          row,
          h['Video ID']
        )
        .getValue() || ''
    ).trim();

    if (id !== videoId) {
      continue;
    }

    set_(
      sheet,
      row,
      h,
      'Editor',
      editor
    );

    set_(
      sheet,
      row,
      h,
      'Account',
      ''
    );

    set_(
      sheet,
      row,
      h,
      'Upload Status',
      'Pending'
    );

    set_(
      sheet,
      row,
      h,
      'Post URL',
      ''
    );

    set_(
      sheet,
      row,
      h,
      'Uploaded At',
      ''
    );

    return;
  }
}


/*************************************************
 * PHASE 4
 * FINAL → REVISION LOG → QC
 *************************************************/

function scanFinal_(ss) {
  const sheet =
    ss.getSheetByName(IO.VIDEOS);

  const h = headers_(sheet);

  if (sheet.getLastRow() < 2) {
    return;
  }

  const rows = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      sheet.getLastColumn()
    )
    .getValues();

  rows.forEach((data, i) => {
    const row = i + 2;
    const val = name => data[h[name] - 1];

    const videoId =
      String(
        val('Video ID') || ''
      ).trim();

    if (!videoId) return;

    if (val('Archived?') === true) {
      return;
    }

    const status =
      String(
        val('Production Status') || ''
      ).trim();

    if (
      ![
        'Editing',
        'Changes'
      ].includes(status)
    ) {
      return;
    }

    const folderId =
      String(
        val('FINAL Folder ID') || ''
      ).trim();

    if (!folderId) return;

    try {
      const folder =
        DriveApp.getFolderById(
          folderId
        );

      const finalFile =
        latestVideo_(folder);

      if (!finalFile) return;

      const previousUrl =
        String(
          val('Final File URL') || ''
        ).trim();

      const previousId =
        extractId_(previousUrl);

      // Fresh Drive file ID = new revision.
      if (
        previousId &&
        previousId === finalFile.getId()
      ) {
        return;
      }

      set_(
        sheet,
        row,
        h,
        'Final File URL',
        finalFile.getUrl()
      );

      const editor =
        String(
          val('Editor') || ''
        ).trim();

      const revisionNo =
        appendRevision_(
          ss,
          sheet,
          row,
          h,
          videoId,
          editor,
          finalFile
        );

      set_(
        sheet,
        row,
        h,
        'QC Status',
        'Pending Review'
      );

      set_(
        sheet,
        row,
        h,
        'QC Change Notes',
        ''
      );

      setProductionStatus_(
        ss,
        sheet,
        row,
        h,
        'QC Pending'
      );

      clearAutoBlock_(
        sheet,
        row,
        h
      );

      log_(
        ss,
        'FINAL_DETECTED',
        videoId,
        editor,
        'SUCCESS',
        `FINAL=${finalFile.getId()} | Revision=${revisionNo} | Status=QC Pending`,
        ''
      );

    } catch (err) {
      recordRowError_(
        sheet,
        row,
        h,
        err
      );

      log_(
        ss,
        'FINAL_SCAN',
        videoId,
        '',
        'ERROR',
        '',
        err.stack || err.message || String(err)
      );
    }
  });
}


function appendRevision_(
  ss,
  videoSheet,
  videoRow,
  vh,
  videoId,
  editor,
  finalFile
) {
  const revisionSheet =
    ss.getSheetByName(
      IO.REVISIONS
    );

  const rh =
    headers_(revisionSheet);

  const currentNo =
    Number(
      videoSheet
        .getRange(
          videoRow,
          vh['Revision No']
        )
        .getValue() || 0
    );

  const revisionNo =
    currentNo + 1;

  set_(
    videoSheet,
    videoRow,
    vh,
    'Revision No',
    revisionNo
  );

  const row =
    revisionSheet.getLastRow() + 1;

  set_(
    revisionSheet,
    row,
    rh,
    'Revision ID',
    `${simpleId_(videoId)}-R${revisionNo}`
  );

  set_(
    revisionSheet,
    row,
    rh,
    'Video ID',
    videoId
  );

  set_(
    revisionSheet,
    row,
    rh,
    'Revision No',
    revisionNo
  );

  set_(
    revisionSheet,
    row,
    rh,
    'Final File ID',
    finalFile.getId()
  );

  set_(
    revisionSheet,
    row,
    rh,
    'Final File URL',
    finalFile.getUrl()
  );

  set_(
    revisionSheet,
    row,
    rh,
    'Detected At',
    new Date()
  );

  set_(
    revisionSheet,
    row,
    rh,
    'Editor',
    editor
  );

  set_(
    revisionSheet,
    row,
    rh,
    'QC Outcome',
    'Pending Review'
  );

  set_(
    revisionSheet,
    row,
    rh,
    'Status',
    'Active'
  );

  return revisionNo;
}


function processQcChange_(
  ss,
  sheet,
  h,
  row
) {
  const videoId = String(
    sheet
      .getRange(row, h['Video ID'])
      .getValue() || ''
  ).trim();

  if (!videoId) return;

  const qc = String(
    sheet
      .getRange(row, h['QC Status'])
      .getValue() || ''
  ).trim();

  const notes = String(
    sheet
      .getRange(
        row,
        h['QC Change Notes']
      )
      .getValue() || ''
  ).trim();

  if (qc === 'Pending Review') {
    setProductionStatus_(
      ss,
      sheet,
      row,
      h,
      'QC Pending'
    );

    return;
  }

  if (qc === 'Changes Required') {
    // Hard rule: QC change request requires notes.
    if (!notes) {
      set_(
        sheet,
        row,
        h,
        'QC Status',
        'Pending Review'
      );

      autoBlock_(
        sheet,
        row,
        h,
        'QC Change Notes are required before selecting Changes Required.'
      );

      log_(
        ss,
        'QC_CHANGE_REJECTED',
        videoId,
        '',
        'ERROR',
        'Missing QC Change Notes.',
        ''
      );

      return;
    }

    updateLatestRevisionQc_(
      ss,
      videoId,
      'Changes Required',
      notes
    );

    setProductionStatus_(
      ss,
      sheet,
      row,
      h,
      'Changes'
    );

    clearAutoBlock_(
      sheet,
      row,
      h
    );

    recalculateEditorLoads_(ss);

    log_(
      ss,
      'QC_STATUS_CHANGE',
      videoId,
      '',
      'SUCCESS',
      'QC=Changes Required | Production=Changes',
      ''
    );

    return;
  }

  if (qc === 'Approved') {
    updateLatestRevisionQc_(
      ss,
      videoId,
      'Approved',
      notes
    );

    setProductionStatus_(
      ss,
      sheet,
      row,
      h,
      'Approved'
    );

    clearAutoBlock_(
      sheet,
      row,
      h
    );

    recalculateEditorLoads_(ss);

    log_(
      ss,
      'QC_STATUS_CHANGE',
      videoId,
      '',
      'SUCCESS',
      'QC=Approved | Production=Approved',
      ''
    );
  }
}


function updateLatestRevisionQc_(
  ss,
  videoId,
  outcome,
  notes
) {
  const sheet =
    ss.getSheetByName(
      IO.REVISIONS
    );

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return;
  }

  const h = headers_(sheet);

  for (
    let row = sheet.getLastRow();
    row >= 2;
    row--
  ) {
    const id = String(
      sheet
        .getRange(row, h['Video ID'])
        .getValue() || ''
    ).trim();

    if (id !== videoId) {
      continue;
    }

    set_(
      sheet,
      row,
      h,
      'QC Outcome',
      outcome
    );

    set_(
      sheet,
      row,
      h,
      'QC Notes',
      notes
    );

    set_(
      sheet,
      row,
      h,
      'Status',
      outcome === 'Approved'
        ? 'Approved'
        : 'Changes Requested'
    );

    return;
  }
}


/*************************************************
 * PHASE 5
 * APPROVED → ACCOUNT → POST
 *************************************************/

function hasActiveAccounts_(ss) {
  const sheet =
    ss.getSheetByName(
      IO.ACCOUNTS
    );

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return false;
  }

  const h = headers_(sheet);

  for (
    let row = 2;
    row <= sheet.getLastRow();
    row++
  ) {
    const status = String(
      sheet
        .getRange(row, h['Status'])
        .getValue() || ''
    )
      .trim()
      .toLowerCase();

    if (status === 'active') {
      return true;
    }
  }

  return false;
}


function parkApprovedForAccounts_(ss) {
  const sheet =
    ss.getSheetByName(IO.VIDEOS);

  const h = headers_(sheet);

  for (
    let row = 2;
    row <= sheet.getLastRow();
    row++
  ) {
    const status = String(
      sheet
        .getRange(
          row,
          h['Production Status']
        )
        .getValue() || ''
    ).trim();

    if (status !== 'Approved') {
      continue;
    }

    if (
      h['SLA Status']
    ) {
      set_(
        sheet,
        row,
        h,
        'SLA Status',
        'Parked - Accounts'
      );
    }

    if (h['Due At']) {
      set_(
        sheet,
        row,
        h,
        'Due At',
        ''
      );
    }

    const blocker = String(
      sheet
        .getRange(
          row,
          h['Blocker']
        )
        .getValue() || ''
    ).trim();

    if (
      blocker ===
      '[AUTO] Approved waiting for account.'
    ) {
      set_(
        sheet,
        row,
        h,
        'Blocker',
        ''
      );
    }
  }
}


function scanApproved_(ss) {
  const sheet =
    ss.getSheetByName(IO.VIDEOS);

  const h = headers_(sheet);

  if (sheet.getLastRow() < 2) {
    return;
  }

  const rows = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      sheet.getLastColumn()
    )
    .getValues();

  rows.forEach((data, i) => {
    const row = i + 2;
    const val = name => data[h[name] - 1];

    const videoId =
      String(
        val('Video ID') || ''
      ).trim();

    if (!videoId) return;

    if (val('Archived?') === true) {
      return;
    }

    if (
      String(
        val('Production Status') || ''
      ).trim() !== 'Approved'
    ) {
      return;
    }

    if (val('Posted?') === true) {
      return;
    }

    const editor =
      String(
        val('Editor') || ''
      ).trim();

    if (!editor) {
      autoBlock_(
        sheet,
        row,
        h,
        'Approved video has no editor.'
      );

      return;
    }

    let account =
      String(
        val('Account') || ''
      ).trim();

    if (!account) {
      const selected =
        chooseAccount_(
          ss,
          editor
        );

      if (!selected) {
        autoBlock_(
          sheet,
          row,
          h,
          `No active account configured for ${editor}.`
        );

        return;
      }

      account =
        selected.name;

      set_(
        sheet,
        row,
        h,
        'Account',
        account
      );

      const accounts =
        ss.getSheetByName(
          IO.ACCOUNTS
        );

      const ah =
        headers_(accounts);

      set_(
        accounts,
        selected.row,
        ah,
        'Last Assigned At',
        new Date()
      );

      touchStageMeta_(
        ss,
        sheet,
        row,
        h,
        'Approved'
      );
    }

    ensureDistribution_(
      ss,
      videoId,
      account,
      editor
    );

    clearAutoBlock_(
      sheet,
      row,
      h
    );

    log_(
      ss,
      'PUBLISH_ASSIGN',
      videoId,
      editor,
      'SUCCESS',
      `Account=${account} | UploadStatus=Pending`,
      ''
    );
  });
}


function chooseAccount_(
  ss,
  editor
) {
  const sheet =
    ss.getSheetByName(
      IO.ACCOUNTS
    );

  const h = headers_(sheet);

  if (sheet.getLastRow() < 2) {
    return null;
  }

  const choices = [];

  sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      sheet.getLastColumn()
    )
    .getValues()
    .forEach((r, i) => {
      const status = String(
        r[h['Status'] - 1] || ''
      )
        .trim()
        .toLowerCase();

      const assignedEditor =
        String(
          r[
            h['Assigned Editor'] - 1
          ] || ''
        ).trim();

      if (
        status !== 'active' ||
        assignedEditor !== editor
      ) {
        return;
      }

      const platform =
        String(
          r[h['Platform'] - 1] || ''
        ).trim();

      const username =
        String(
          r[
            h[
              'Username / Channel'
            ] - 1
          ] || ''
        ).trim();

      const id =
        String(
          r[
            h['Account ID'] - 1
          ] || ''
        ).trim();

      const rotation =
        Number(
          r[
            h['Rotation Order'] - 1
          ]
        ) || 999;

      const date =
        r[
          h['Last Assigned At'] - 1
        ];

      const last =
        date instanceof Date &&
        !isNaN(date.getTime())
          ? date.getTime()
          : 0;

      choices.push({
        name: username || id,
        platform,
        rotation,
        last,
        row: i + 2
      });
    });

  choices.sort((a, b) => {
    const ai =
      a.platform.toLowerCase() ===
      'instagram'
        ? 0
        : 1;

    const bi =
      b.platform.toLowerCase() ===
      'instagram'
        ? 0
        : 1;

    return (
      ai - bi ||
      a.last - b.last ||
      a.rotation - b.rotation
    );
  });

  return choices[0] || null;
}


function ensureDistribution_(
  ss,
  videoId,
  account,
  editor
) {
  const sheet =
    ss.getSheetByName(
      IO.DISTRIBUTION
    );

  const h = headers_(sheet);

  if (sheet.getLastRow() >= 2) {
    const ids =
      sheet
        .getRange(
          2,
          h['Video ID'],
          sheet.getLastRow() - 1,
          1
        )
        .getValues()
        .flat();

    for (
      let i = 0;
      i < ids.length;
      i++
    ) {
      if (
        String(ids[i]).trim() ===
        videoId
      ) {
        const row = i + 2;

        // Keep existing record aligned to current editor/account.
        set_(
          sheet,
          row,
          h,
          'Account',
          account
        );

        set_(
          sheet,
          row,
          h,
          'Editor',
          editor
        );

        return row;
      }
    }
  }

  const row =
    sheet.getLastRow() + 1;

  set_(
    sheet,
    row,
    h,
    'Distribution ID',
    `DIST-${simpleId_(videoId)}`
  );

  set_(
    sheet,
    row,
    h,
    'Video ID',
    videoId
  );

  set_(
    sheet,
    row,
    h,
    'Account',
    account
  );

  set_(
    sheet,
    row,
    h,
    'Editor',
    editor
  );

  set_(
    sheet,
    row,
    h,
    'Upload Status',
    'Pending'
  );

  return row;
}


function processPosted_(
  ss,
  sheet,
  h,
  row
) {
  const videoId =
    String(
      sheet
        .getRange(
          row,
          h['Video ID']
        )
        .getValue() || ''
    ).trim();

  const url =
    String(
      sheet
        .getRange(
          row,
          h['Post URL']
        )
        .getValue() || ''
    ).trim();

  const account =
    String(
      sheet
        .getRange(
          row,
          h['Account']
        )
        .getValue() || ''
    ).trim();

  const editor =
    String(
      sheet
        .getRange(
          row,
          h['Editor']
        )
        .getValue() || ''
    ).trim();

  const status =
    String(
      sheet
        .getRange(
          row,
          h['Production Status']
        )
        .getValue() || ''
    ).trim();

  if (status !== 'Approved') {
    set_(
      sheet,
      row,
      h,
      'Posted?',
      false
    );

    autoBlock_(
      sheet,
      row,
      h,
      'Approve video before marking Posted?.'
    );

    return;
  }

  if (!url) {
    set_(
      sheet,
      row,
      h,
      'Posted?',
      false
    );

    autoBlock_(
      sheet,
      row,
      h,
      'Paste Post URL before checking Posted?.'
    );

    return;
  }

  if (!account) {
    set_(
      sheet,
      row,
      h,
      'Posted?',
      false
    );

    autoBlock_(
      sheet,
      row,
      h,
      'No publishing account assigned.'
    );

    return;
  }

  const distRow =
    ensureDistribution_(
      ss,
      videoId,
      account,
      editor
    );

  const dist =
    ss.getSheetByName(
      IO.DISTRIBUTION
    );

  const dh =
    headers_(dist);

  set_(
    dist,
    distRow,
    dh,
    'Upload Status',
    'Uploaded'
  );

  set_(
    dist,
    distRow,
    dh,
    'Post URL',
    url
  );

  set_(
    dist,
    distRow,
    dh,
    'Uploaded At',
    new Date()
  );

  setProductionStatus_(
    ss,
    sheet,
    row,
    h,
    'Uploaded'
  );

  clearAutoBlock_(
    sheet,
    row,
    h
  );

  log_(
    ss,
    'POSTED',
    videoId,
    editor,
    'SUCCESS',
    `Account=${account} | URL=${url}`,
    ''
  );
}


/*************************************************
 * SLA / OVERDUE ENGINE
 *************************************************/

function setProductionStatus_(
  ss,
  sheet,
  row,
  h,
  status
) {
  set_(
    sheet,
    row,
    h,
    'Production Status',
    status
  );

  touchStageMeta_(
    ss,
    sheet,
    row,
    h,
    status
  );
}


function touchStageMeta_(
  ss,
  sheet,
  row,
  h,
  status
) {
  if (!status) return;

  const now = new Date();

  set_(
    sheet,
    row,
    h,
    'Stage Updated At',
    now
  );

  if (
    status === 'Uploaded'
  ) {
    set_(
      sheet,
      row,
      h,
      'Due At',
      ''
    );

    set_(
      sheet,
      row,
      h,
      'SLA Status',
      'Done'
    );

    return;
  }

  if (
    status === 'Blocked'
  ) {
    set_(
      sheet,
      row,
      h,
      'Due At',
      ''
    );

    set_(
      sheet,
      row,
      h,
      'SLA Status',
      'Blocked'
    );

    return;
  }

  if (
    status === 'Approved' &&
    !hasActiveAccounts_(ss)
  ) {
    set_(
      sheet,
      row,
      h,
      'Due At',
      ''
    );

    set_(
      sheet,
      row,
      h,
      'SLA Status',
      'Parked - Accounts'
    );

    return;
  }

  const hours =
    slaHoursForStatus_(
      ss,
      status
    );

  if (
    hours === null ||
    hours === undefined
  ) {
    set_(
      sheet,
      row,
      h,
      'Due At',
      ''
    );

    set_(
      sheet,
      row,
      h,
      'SLA Status',
      'Waiting'
    );

    return;
  }

  const due =
    new Date(
      now.getTime() +
      Number(hours) *
      60 *
      60 *
      1000
    );

  set_(
    sheet,
    row,
    h,
    'Due At',
    due
  );

  set_(
    sheet,
    row,
    h,
    'SLA Status',
    'On Track'
  );
}


function slaHoursForStatus_(
  ss,
  status
) {
  const config =
    getConfig_(ss);

  const mapping = {
    'Script Ready':
      'SLA_SCRIPT_READY_RAW_HOURS',

    'Editing':
      'SLA_EDIT_HOURS',

    'QC Pending':
      'SLA_QC_HOURS',

    'Changes':
      'SLA_CHANGES_HOURS',

    'Approved':
      'SLA_APPROVED_POST_HOURS'
  };

  const key =
    mapping[status];

  if (!key) {
    return null;
  }

  const value =
    Number(
      config[key]
    );

  return isNaN(value)
    ? null
    : value;
}


function initializeMissingStageMeta_(ss) {
  const sheet =
    ss.getSheetByName(
      IO.VIDEOS
    );

  const h = headers_(sheet);

  for (
    let row = 2;
    row <= sheet.getLastRow();
    row++
  ) {
    const videoId = String(
      sheet
        .getRange(
          row,
          h['Video ID']
        )
        .getValue() || ''
    ).trim();

    if (!videoId) {
      continue;
    }

    const archived =
      h['Archived?']
        ? sheet
            .getRange(
              row,
              h['Archived?']
            )
            .getValue() === true
        : false;

    if (archived) {
      set_(
        sheet,
        row,
        h,
        'SLA Status',
        'Archived'
      );

      continue;
    }

    const stageUpdated =
      h['Stage Updated At']
        ? sheet
            .getRange(
              row,
              h['Stage Updated At']
            )
            .getValue()
        : '';

    if (stageUpdated) {
      continue;
    }

    const status = String(
      sheet
        .getRange(
          row,
          h['Production Status']
        )
        .getValue() || ''
    ).trim();

    if (status) {
      touchStageMeta_(
        ss,
        sheet,
        row,
        h,
        status
      );
    }
  }
}


function refreshSlaStatuses_(ss) {
  const sheet =
    ss.getSheetByName(
      IO.VIDEOS
    );

  const h = headers_(sheet);
  const now = new Date();

  for (
    let row = 2;
    row <= sheet.getLastRow();
    row++
  ) {
    const videoId = String(
      sheet
        .getRange(
          row,
          h['Video ID']
        )
        .getValue() || ''
    ).trim();

    if (!videoId) continue;

    if (
      h['Archived?'] &&
      sheet
        .getRange(
          row,
          h['Archived?']
        )
        .getValue() === true
    ) {
      set_(
        sheet,
        row,
        h,
        'SLA Status',
        'Archived'
      );

      continue;
    }

    const status = String(
      sheet
        .getRange(
          row,
          h['Production Status']
        )
        .getValue() || ''
    ).trim();

    if (status === 'Uploaded') {
      set_(
        sheet,
        row,
        h,
        'SLA Status',
        'Done'
      );

      continue;
    }

    if (
      status === 'Approved' &&
      !hasActiveAccounts_(ss)
    ) {
      set_(
        sheet,
        row,
        h,
        'SLA Status',
        'Parked - Accounts'
      );

      set_(
        sheet,
        row,
        h,
        'Due At',
        ''
      );

      continue;
    }

    const due =
      h['Due At']
        ? sheet
            .getRange(
              row,
              h['Due At']
            )
            .getValue()
        : '';

    if (
      !(due instanceof Date) ||
      isNaN(due.getTime())
    ) {
      continue;
    }

    set_(
      sheet,
      row,
      h,
      'SLA Status',
      due.getTime() < now.getTime()
        ? 'Overdue'
        : 'On Track'
    );
  }
}


/*************************************************
 * OPERATIONAL VIEWS
 *************************************************/

function refreshOperationalViews() {
  const ss = getSS_();

  buildToday_(ss);
  buildEditorLoad_(ss);
  buildActionQueue_(ss);
  buildEditorWork_(ss);
  buildManagerSummary_(ss);
  buildMIS_(ss);

  log_(
    ss,
    'VIEWS_REFRESH',
    '',
    '',
    'SUCCESS',
    'Operational views rebuilt.',
    ''
  );
}


function buildToday_(ss) {
  const sheet =
    ensureSheet_(ss, IO.TODAY);

  sheet.clear();

  sheet.getRange('A1:K1').merge();
  sheet
    .getRange('A1')
    .setValue(
      'INFINITY OPERATIONS — TODAY'
    )
    .setFontWeight('bold')
    .setFontSize(16);

  sheet
    .getRange('A2')
    .setValue('Dashboard Date');

  sheet
    .getRange('B2')
    .setFormula('=TODAY()');

  const cards = [
    ['Planned', '=COUNTIF(VIDEOS!B:B,$B$2)'],
    ['Editing', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!H:H,"Editing")'],
    ['QC Pending', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!H:H,"QC Pending")'],
    ['Approved', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!H:H,"Approved")'],
    ['Changes', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!H:H,"Changes")'],
    ['Uploaded', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!H:H,"Uploaded")'],
    ['Blocked', '=COUNTIFS(VIDEOS!B2:B,$B$2,VIDEOS!W2:W,"<>",VIDEOS!H2:H,"<>Uploaded")'],
    ['Open Editor Load', '=SUM(EDITORS!E2:E)'],
    ['Overdue', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!AB:AB,"Overdue")'],
    ['Needs Action', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!H:H,"QC Pending")+COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!H:H,"Changes")+COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!W:W,"<>",VIDEOS!H:H,"<>Uploaded")']
  ];

  const positions = [
    ['A4', 'B4'],
    ['C4', 'D4'],
    ['E4', 'F4'],
    ['G4', 'H4'],
    ['A5', 'B5'],
    ['C5', 'D5'],
    ['E5', 'F5'],
    ['G5', 'H5'],
    ['J4', 'K4'],
    ['J5', 'K5']
  ];

  cards.forEach((item, i) => {
    sheet
      .getRange(positions[i][0])
      .setValue(item[0])
      .setFontWeight('bold');

    sheet
      .getRange(positions[i][1])
      .setFormula(item[1]);
  });

  sheet
    .getRange('A8')
    .setValue(
      'TODAY PRODUCTION'
    )
    .setFontWeight('bold');

  sheet
    .getRange('A9:I9')
    .setValues([[
      'Video ID',
      'Talent',
      'Script',
      'Priority',
      'Status',
      'Editor',
      'QC Status',
      'Drive Folder',
      'Blocker'
    ]])
    .setFontWeight('bold');

  sheet
    .getRange('A10')
    .setFormula(
      '=IFERROR(FILTER({VIDEOS!A2:A,VIDEOS!C2:C,VIDEOS!D2:D,VIDEOS!F2:F,VIDEOS!H2:H,VIDEOS!N2:N,VIDEOS!O2:O,VIDEOS!I2:I,VIDEOS!W2:W},VIDEOS!B2:B=$B$2,VIDEOS!AF2:AF<>TRUE),"No videos today")'
    );

  sheet.setFrozenRows(2);
}


function buildEditorLoad_(ss) {
  const sheet =
    ensureSheet_(
      ss,
      IO.EDITOR_LOAD
    );

  sheet.clear();

  sheet
    .getRange('A1:H1')
    .merge();

  sheet
    .getRange('A1')
    .setValue('EDITOR LOAD — LIVE')
    .setFontWeight('bold')
    .setFontSize(16);

  sheet
    .getRange('A3:J3')
    .setValues([[
      'Editor',
      'Open Load',
      'Capacity',
      'Utilization',
      'Current Videos',
      'Current Stage',
      'Top Rank',
      'Last Assigned',
      'Available?',
      'Emergency Backup?'
    ]])
    .setFontWeight('bold');

  const editors =
    ss.getSheetByName(
      IO.EDITORS
    );

  const eh =
    headers_(editors);

  if (editors.getLastRow() < 2) {
    return;
  }

  const names = editors
    .getRange(
      2,
      eh['Editor'],
      editors.getLastRow() - 1,
      1
    )
    .getValues()
    .flat()
    .filter(Boolean);

  names.forEach((name, i) => {
    const row = i + 4;

    sheet
      .getRange(row, 1)
      .setValue(name);

    sheet
      .getRange(row, 2)
      .setFormula(
        `=COUNTIFS(VIDEOS!N:N,A${row},VIDEOS!H:H,"Editing")+COUNTIFS(VIDEOS!N:N,A${row},VIDEOS!H:H,"Changes")`
      );

    sheet
      .getRange(row, 3)
      .setFormula(
        `=IFERROR(INDEX(EDITORS!D:D,MATCH(A${row},EDITORS!A:A,0)),0)`
      );

    sheet
      .getRange(row, 4)
      .setFormula(
        `=IFERROR(B${row}/C${row},0)`
      )
      .setNumberFormat('0%');

    sheet
      .getRange(row, 5)
      .setFormula(
        `=IFERROR(TEXTJOIN(", ",TRUE,FILTER(VIDEOS!A:A,VIDEOS!N:N=A${row},REGEXMATCH(VIDEOS!H:H,"^(Editing|Changes)$"))),"")`
      );

    sheet
      .getRange(row, 6)
      .setFormula(
        `=IF(B${row}=0,"Idle",IF(COUNTIFS(VIDEOS!N:N,A${row},VIDEOS!H:H,"Changes")>0,"Changes","Editing"))`
      );

    sheet
      .getRange(row, 7)
      .setFormula(
        `=IFERROR(INDEX(EDITORS!F:F,MATCH(A${row},EDITORS!A:A,0)),"")`
      );

    sheet
      .getRange(row, 8)
      .setFormula(
        `=IFERROR(INDEX(EDITORS!H:H,MATCH(A${row},EDITORS!A:A,0)),"")`
      );

    sheet
      .getRange(row, 9)
      .setFormula(
        `=IFERROR(INDEX(EDITORS!K:K,MATCH(A${row},EDITORS!A:A,0)),FALSE)`
      );

    sheet
      .getRange(row, 10)
      .setFormula(
        `=IFERROR(INDEX(EDITORS!L:L,MATCH(A${row},EDITORS!A:A,0)),FALSE)`
      );
  });

  sheet.setFrozenRows(3);
}


function buildActionQueue_(ss) {
  const sheet =
    ensureSheet_(
      ss,
      IO.ACTION_QUEUE
    );

  sheet.clear();

  sheet.getRange('A1:M1').merge();

  sheet
    .getRange('A1')
    .setValue(
      'INFINITY OPERATIONS — ACTION QUEUE'
    )
    .setFontWeight('bold')
    .setFontSize(16);

  sheet.getRange('A2:L2').setValues([[
    'QC Pending',
    '=COUNTIF(VIDEOS!H:H,"QC Pending")',
    'Changes',
    '=COUNTIF(VIDEOS!H:H,"Changes")',
    'Blocked',
    '=COUNTIFS(VIDEOS!W2:W,"<>",VIDEOS!H2:H,"<>Uploaded",VIDEOS!AF2:AF,"<>TRUE")',
    'Editing',
    '=COUNTIF(VIDEOS!H:H,"Editing")',
    'Overdue',
    '=COUNTIF(VIDEOS!AB:AB,"Overdue")',
    'Approved',
    '=COUNTIF(VIDEOS!H:H,"Approved")'
  ]]);

  sheet
    .getRange('A4:M4')
    .setValues([[
      'Video ID',
      'Publish Date',
      'Talent',
      'Priority',
      'Status',
      'Editor',
      'QC Status',
      'QC Notes',
      'SLA',
      'Due At',
      'RAW',
      'FINAL',
      'Blocker'
    ]])
    .setFontWeight('bold');

  sheet
    .getRange('A5')
    .setFormula(
      '=IFERROR(FILTER({VIDEOS!A2:A,VIDEOS!B2:B,VIDEOS!C2:C,VIDEOS!F2:F,VIDEOS!H2:H,VIDEOS!N2:N,VIDEOS!O2:O,VIDEOS!P2:P,VIDEOS!AB2:AB,VIDEOS!AA2:AA,VIDEOS!L2:L,VIDEOS!M2:M,VIDEOS!W2:W},VIDEOS!AF2:AF<>TRUE,((REGEXMATCH(VIDEOS!H2:H,"^(Editing|QC Pending|Changes|Approved|Blocked)$"))+((VIDEOS!W2:W<>"")*(VIDEOS!H2:H<>"Uploaded")))>0),"No action required")'
    );

  sheet.setFrozenRows(4);
}


function buildEditorWork_(ss) {
  const sheet =
    ensureSheet_(
      ss,
      IO.EDITOR_WORK
    );

  const oldEditor =
    String(
      sheet.getRange('B2').getValue() || ''
    ).trim();

  sheet.clear();

  sheet.getRange('A1:I1').merge();

  sheet
    .getRange('A1')
    .setValue(
      'INFINITY OPERATIONS — EDITOR WORK'
    )
    .setFontWeight('bold')
    .setFontSize(16);

  sheet
    .getRange('A2')
    .setValue('Editor');

  const editors =
    ss.getSheetByName(
      IO.EDITORS
    );

  const eh =
    headers_(editors);

  const editorRange =
    editors.getRange(
      2,
      eh['Editor'],
      Math.max(
        editors.getLastRow() - 1,
        1
      ),
      1
    );

  const defaultEditor =
    oldEditor ||
    String(
      editorRange
        .getCell(1, 1)
        .getValue() || ''
    );

  sheet
    .getRange('B2')
    .setValue(defaultEditor)
    .setDataValidation(
      SpreadsheetApp
        .newDataValidation()
        .requireValueInRange(
          editorRange,
          true
        )
        .build()
    );

  sheet
    .getRange('D2')
    .setValue('Open Load');

  sheet
    .getRange('E2')
    .setFormula(
      '=COUNTIFS(VIDEOS!N:N,$B$2,VIDEOS!H:H,"Editing")+COUNTIFS(VIDEOS!N:N,$B$2,VIDEOS!H:H,"Changes")'
    );

  sheet
    .getRange('G2')
    .setValue('Available?');

  sheet
    .getRange('H2')
    .setFormula(
      '=IFERROR(INDEX(EDITORS!K:K,MATCH($B$2,EDITORS!A:A,0)),FALSE)'
    );

  sheet
    .getRange('A4:I4')
    .setValues([[
      'Video ID',
      'Talent',
      'Priority',
      'Status',
      'RAW',
      'FINAL Upload Folder',
      'QC Notes',
      'Due At',
      'SLA'
    ]])
    .setFontWeight('bold');

  sheet
    .getRange('A5')
    .setFormula(
      '=IFERROR(FILTER({VIDEOS!A2:A,VIDEOS!C2:C,VIDEOS!F2:F,VIDEOS!H2:H,VIDEOS!L2:L,ARRAYFORMULA(IF(VIDEOS!K2:K<>"",HYPERLINK("https://drive.google.com/drive/folders/"&VIDEOS!K2:K,"FINAL"),"")),VIDEOS!P2:P,VIDEOS!AA2:AA,VIDEOS!AB2:AB},VIDEOS!N2:N=$B$2,REGEXMATCH(VIDEOS!H2:H,"^(Editing|Changes|QC Pending|Approved)$"),VIDEOS!AF2:AF<>TRUE),"No active work")'
    );

  sheet.setFrozenRows(4);
}


function buildManagerSummary_(ss) {
  const sheet =
    ensureSheet_(
      ss,
      IO.MANAGER_SUMMARY
    );

  sheet.clear();

  sheet.getRange('A1:H1').merge();

  sheet
    .getRange('A1')
    .setValue(
      'INFINITY OPERATIONS — MANAGER SUMMARY'
    )
    .setFontWeight('bold')
    .setFontSize(16);

  sheet
    .getRange('A2')
    .setValue('Date');

  sheet
    .getRange('B2')
    .setFormula('=TODAY()');

  const rows = [
    ['Planned', '=COUNTIF(VIDEOS!B:B,$B$2)', 'Editing', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!H:H,"Editing")', 'QC Pending', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!H:H,"QC Pending")', 'Changes', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!H:H,"Changes")'],
    ['Approved', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!H:H,"Approved")', 'Uploaded', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!H:H,"Uploaded")', 'Overdue', '=COUNTIFS(VIDEOS!B:B,$B$2,VIDEOS!AB:AB,"Overdue")', 'Open Load', '=SUM(EDITORS!E2:E)']
  ];

  sheet
    .getRange(4, 1, 2, 8)
    .setValues(rows);

  sheet
    .getRange('A8:H10')
    .merge();

  sheet
    .getRange('A8')
    .setFormula(
      '="Today "&TEXT($B$2,"dd mmm")&": Target "&IFERROR(INDEX(CONFIG!B:B,MATCH("DAILY_VIDEO_TARGET",CONFIG!A:A,0)),25)&". Planned "&B4&", Editing "&D4&", QC Pending "&F4&", Changes "&H4&", Approved "&B5&", Uploaded "&D5&", Overdue "&F5&", Open editor load "&H5&"."'
    )
    .setWrap(true)
    .setFontWeight('bold');

  sheet.setFrozenRows(2);
}


function buildMIS_(ss) {
  const sheet =
    ensureSheet_(ss, IO.MIS);

  const oldStart =
    sheet.getRange('B2').getValue();

  const oldEnd =
    sheet.getRange('B3').getValue();

  sheet.clear();

  sheet.getRange('A1:F1').merge();

  sheet
    .getRange('A1')
    .setValue(
      'INFINITY OPERATIONS — MIS'
    )
    .setFontWeight('bold')
    .setFontSize(16);

  sheet
    .getRange('A2')
    .setValue('Start Date');

  sheet
    .getRange('A3')
    .setValue('End Date');

  if (
    oldStart instanceof Date &&
    !isNaN(oldStart.getTime())
  ) {
    sheet
      .getRange('B2')
      .setValue(oldStart);
  } else {
    sheet
      .getRange('B2')
      .setFormula('=TODAY()');
  }

  if (
    oldEnd instanceof Date &&
    !isNaN(oldEnd.getTime())
  ) {
    sheet
      .getRange('B3')
      .setValue(oldEnd);
  } else {
    sheet
      .getRange('B3')
      .setFormula('=TODAY()');
  }

  sheet
    .getRange('D2')
    .setValue('Tip');

  sheet
    .getRange('E2')
    .setValue(
      'Change B2/B3 for any historical/custom range.'
    );

  const metrics = [
    ['Planned', '=COUNTIFS(VIDEOS!B:B,">="&$B$2,VIDEOS!B:B,"<="&$B$3)'],
    ['Editing', '=COUNTIFS(VIDEOS!B:B,">="&$B$2,VIDEOS!B:B,"<="&$B$3,VIDEOS!H:H,"Editing")'],
    ['QC Pending', '=COUNTIFS(VIDEOS!B:B,">="&$B$2,VIDEOS!B:B,"<="&$B$3,VIDEOS!H:H,"QC Pending")'],
    ['Changes', '=COUNTIFS(VIDEOS!B:B,">="&$B$2,VIDEOS!B:B,"<="&$B$3,VIDEOS!H:H,"Changes")'],
    ['Approved', '=COUNTIFS(VIDEOS!B:B,">="&$B$2,VIDEOS!B:B,"<="&$B$3,VIDEOS!H:H,"Approved")'],
    ['Uploaded', '=COUNTIFS(VIDEOS!B:B,">="&$B$2,VIDEOS!B:B,"<="&$B$3,VIDEOS!H:H,"Uploaded")'],
    ['Views Today', '=SUMIFS(VIDEOS!T:T,VIDEOS!B:B,">="&$B$2,VIDEOS!B:B,"<="&$B$3)'],
    ['Current Views', '=SUMIFS(VIDEOS!U:U,VIDEOS!B:B,">="&$B$2,VIDEOS!B:B,"<="&$B$3)'],
    ['Sales', '=SUMIFS(VIDEOS!V:V,VIDEOS!B:B,">="&$B$2,VIDEOS!B:B,"<="&$B$3)'],
    ['Overdue', '=COUNTIFS(VIDEOS!B:B,">="&$B$2,VIDEOS!B:B,"<="&$B$3,VIDEOS!AB:AB,"Overdue")']
  ];

  metrics.forEach((m, i) => {
    sheet
      .getRange(5 + i, 1)
      .setValue(m[0]);

    sheet
      .getRange(5 + i, 2)
      .setFormula(m[1]);
  });

  sheet
    .getRange('A17')
    .setValue(
      'RANGE PRODUCTION'
    )
    .setFontWeight('bold');

  sheet
    .getRange('A18')
    .setFormula(
      '=IFERROR(FILTER(VIDEOS!A2:AF,VIDEOS!B2:B>=$B$2,VIDEOS!B2:B<=$B$3),"No data")'
    );

  sheet.setFrozenRows(3);
}


/*************************************************
 * PHASE 7
 * INTERNAL METRICS SYNC ONLY.
 *************************************************/

function syncDistributionMetrics_(ss) {
  const dist =
    ss.getSheetByName(
      IO.DISTRIBUTION
    );

  const videos =
    ss.getSheetByName(
      IO.VIDEOS
    );

  if (
    !dist ||
    !videos ||
    dist.getLastRow() < 2 ||
    videos.getLastRow() < 2
  ) {
    return;
  }

  const dh = headers_(dist);
  const vh = headers_(videos);

  const data = {};

  dist
    .getRange(
      2,
      1,
      dist.getLastRow() - 1,
      dist.getLastColumn()
    )
    .getValues()
    .forEach(r => {
      const id =
        String(
          r[
            dh['Video ID'] - 1
          ] || ''
        ).trim();

      if (!id) return;

      if (!data[id]) {
        data[id] = {
          views: 0,
          current: 0,
          sales: 0,
          url: ''
        };
      }

      data[id].views +=
        Number(
          r[
            dh['Views Today'] - 1
          ] || 0
        );

      data[id].current +=
        Number(
          r[
            dh['Current Views'] - 1
          ] || 0
        );

      data[id].sales +=
        Number(
          r[
            dh['Sales'] - 1
          ] || 0
        );

      const url =
        String(
          r[
            dh['Post URL'] - 1
          ] || ''
        ).trim();

      if (url) {
        data[id].url = url;
      }
    });

  for (
    let row = 2;
    row <= videos.getLastRow();
    row++
  ) {
    const id = String(
      videos
        .getRange(
          row,
          vh['Video ID']
        )
        .getValue() || ''
    ).trim();

    if (!id || !data[id]) {
      continue;
    }

    set_(
      videos,
      row,
      vh,
      'Views Today',
      data[id].views
    );

    set_(
      videos,
      row,
      vh,
      'Current Views',
      data[id].current
    );

    set_(
      videos,
      row,
      vh,
      'Sales',
      data[id].sales
    );

    if (data[id].url) {
      set_(
        videos,
        row,
        vh,
        'Post URL',
        data[id].url
      );
    }
  }
}


/*************************************************
 * ERROR RECOVERY / HEALTH
 *************************************************/

function recordRowError_(
  sheet,
  row,
  h,
  err
) {
  const retry =
    Number(
      h['Retry Count']
        ? sheet
            .getRange(
              row,
              h['Retry Count']
            )
            .getValue() || 0
        : 0
    ) + 1;

  set_(
    sheet,
    row,
    h,
    'Retry Count',
    retry
  );

  set_(
    sheet,
    row,
    h,
    'Last Error At',
    new Date()
  );

  autoBlock_(
    sheet,
    row,
    h,
    err.message || String(err)
  );
}


function healthCheck_(ss) {
  const sheet =
    ss.getSheetByName(
      IO.VIDEOS
    );

  const h = headers_(sheet);
  const ids = new Set();

  for (
    let row = 2;
    row <= sheet.getLastRow();
    row++
  ) {
    const id = String(
      sheet
        .getRange(
          row,
          h['Video ID']
        )
        .getValue() || ''
    ).trim();

    if (!id) continue;

    if (ids.has(id)) {
      autoBlock_(
        sheet,
        row,
        h,
        `Duplicate Video ID: ${id}`
      );

      continue;
    }

    ids.add(id);

    const status = String(
      sheet
        .getRange(
          row,
          h['Production Status']
        )
        .getValue() || ''
    ).trim();

    const editor = String(
      sheet
        .getRange(
          row,
          h['Editor']
        )
        .getValue() || ''
    ).trim();

    const raw = String(
      sheet
        .getRange(
          row,
          h['Raw File URL']
        )
        .getValue() || ''
    ).trim();

    const finalUrl = String(
      sheet
        .getRange(
          row,
          h['Final File URL']
        )
        .getValue() || ''
    ).trim();

    const postUrl = String(
      sheet
        .getRange(
          row,
          h['Post URL']
        )
        .getValue() || ''
    ).trim();

    const posted =
      sheet
        .getRange(
          row,
          h['Posted?']
        )
        .getValue() === true;

    let issue = '';

    if (
      status === 'Editing' &&
      (!editor || !raw)
    ) {
      issue =
        'Editing missing Editor or RAW.';
    }

    if (
      status === 'QC Pending' &&
      !finalUrl
    ) {
      issue =
        'QC Pending missing FINAL.';
    }

    if (
      status === 'Changes' &&
      !editor
    ) {
      issue =
        'Changes missing Editor.';
    }

    if (
      editor &&
      [
        'Editing',
        'Changes'
      ].includes(status)
    ) {
      const editorState =
        getEditorState_(
          ss,
          editor
        );

      if (!editorState) {
        issue =
          `Editor not found: ${editor}`;
      } else if (!editorState.active) {
        issue =
          `${editor} is inactive.`;
      } else if (!editorState.available) {
        issue =
          `${editor} is unavailable. Reassignment recommended.`;
      }
    }

    if (
      status === 'Uploaded' &&
      !postUrl &&
      posted
    ) {
      issue =
        'Uploaded is missing Post URL.';
    }

    if (issue) {
      autoBlock_(
        sheet,
        row,
        h,
        issue
      );
    } else {
      const currentBlocker = String(
        sheet
          .getRange(
            row,
            h['Blocker']
          )
          .getValue() || ''
      ).trim();

      // Do not clear manual blockers.
      if (
        currentBlocker.startsWith(
          '[AUTO]'
        )
      ) {
        clearAutoBlock_(
          sheet,
          row,
          h
        );
      }
    }
  }

  refreshSlaStatuses_(ss);
  recalculateEditorLoads_(ss);
}


/*************************************************
 * REPAIR TOOL
 *************************************************/

function repairSelectedVideo() {
  const ss = getSS_();
  const sheet = ss.getActiveSheet();

  if (sheet.getName() !== IO.VIDEOS) {
    SpreadsheetApp.getUi().alert(
      'Select a row inside VIDEOS first.'
    );

    return;
  }

  const row =
    sheet.getActiveRange().getRow();

  if (row < 2) {
    return;
  }

  const h =
    headers_(sheet);

  const videoId =
    String(
      sheet
        .getRange(
          row,
          h['Video ID']
        )
        .getValue() || ''
    ).trim();

  if (!videoId) {
    SpreadsheetApp.getUi().alert(
      'Selected row has no Video ID.'
    );

    return;
  }

  try {
    const ready =
      sheet
        .getRange(
          row,
          h['Script Ready?']
        )
        .getValue() === true;

    const baseUrl =
      String(
        sheet
          .getRange(
            row,
            h['Drive Folder URL']
          )
          .getValue() || ''
      ).trim();

    if (ready && !baseUrl) {
      processScriptReady_(
        ss,
        sheet,
        row
      );
    }

    scanRaw_(ss);
    scanFinal_(ss);

    if (hasActiveAccounts_(ss)) {
      scanApproved_(ss);
    }

    recalculateEditorLoads_(ss);
    refreshSlaStatuses_(ss);
    healthCheck_(ss);

    log_(
      ss,
      'REPAIR_SELECTED',
      videoId,
      '',
      'SUCCESS',
      `Row=${row}`,
      ''
    );

    SpreadsheetApp.getUi().alert(
      `Repair completed for ${videoId}.`
    );

  } catch (err) {
    recordRowError_(
      sheet,
      row,
      h,
      err
    );

    log_(
      ss,
      'REPAIR_SELECTED',
      videoId,
      '',
      'ERROR',
      `Row=${row}`,
      err.stack ||
      err.message ||
      String(err)
    );

    SpreadsheetApp.getUi().alert(
      `Repair failed: ${err.message || err}`
    );
  }
}


/*************************************************
 * SOFT ARCHIVE
 * Never deletes production rows.
 *************************************************/

function softArchiveCompleted_(ss) {
  const sheet =
    ss.getSheetByName(
      IO.VIDEOS
    );

  const h = headers_(sheet);
  const config = getConfig_(ss);

  const days =
    Number(
      config[
        'ARCHIVE_AFTER_DAYS'
      ] || 90
    );

  const cutoff =
    new Date();

  cutoff.setDate(
    cutoff.getDate() - days
  );

  let count = 0;

  for (
    let row = 2;
    row <= sheet.getLastRow();
    row++
  ) {
    const status = String(
      sheet
        .getRange(
          row,
          h['Production Status']
        )
        .getValue() || ''
    ).trim();

    if (status !== 'Uploaded') {
      continue;
    }

    const publishDate =
      sheet
        .getRange(
          row,
          h['Publish Date']
        )
        .getValue();

    if (
      !(publishDate instanceof Date) ||
      isNaN(publishDate.getTime()) ||
      publishDate >= cutoff
    ) {
      continue;
    }

    set_(
      sheet,
      row,
      h,
      'Archived?',
      true
    );

    set_(
      sheet,
      row,
      h,
      'SLA Status',
      'Archived'
    );

    count++;
  }

  return count;
}


function softArchiveCompletedManual() {
  const ss = getSS_();

  const count =
    softArchiveCompleted_(ss);

  log_(
    ss,
    'SOFT_ARCHIVE',
    '',
    '',
    'SUCCESS',
    `Archived=${count}`,
    ''
  );

  SpreadsheetApp.getUi().alert(
    `${count} completed video(s) soft-archived. No rows were deleted.`
  );
}


/*************************************************
 * WARNING-ONLY PROTECTION
 *
 * Protects against accidental edits without
 * locking the manager out.
 *************************************************/

function setupWarningProtections_(ss) {
  const backendSheets = [
    IO.EDITORS,
    IO.TALENT,
    IO.ACCOUNTS,
    IO.DISTRIBUTION,
    IO.CONFIG,
    IO.LOGS,
    IO.REVISIONS,
    IO.DASHBOARD
  ];

  backendSheets.forEach(name => {
    const sheet =
      ss.getSheetByName(name);

    if (!sheet) return;

    const description =
      `Infinity warning: ${name}`;

    const existing =
      sheet
        .getProtections(
          SpreadsheetApp.ProtectionType.SHEET
        )
        .find(
          p =>
            p.getDescription() ===
            description
        );

    if (existing) {
      existing.setWarningOnly(true);
      return;
    }

    const protection =
      sheet.protect();

    protection
      .setDescription(
        description
      )
      .setWarningOnly(true);
  });
}


/*************************************************
 * MANUAL UTILITIES
 *************************************************/

function recalculateEditorLoadsManual() {
  const ss = getSS_();

  recalculateEditorLoads_(ss);
  refreshSlaStatuses_(ss);

  log_(
    ss,
    'EDITOR_LOAD_REFRESH',
    '',
    '',
    'SUCCESS',
    'Editor loads recalculated.',
    ''
  );
}


function healthCheckManual() {
  const ss = getSS_();

  healthCheck_(ss);

  log_(
    ss,
    'HEALTH_CHECK',
    '',
    '',
    'SUCCESS',
    'Health check completed.',
    ''
  );
}


/*************************************************
 * DRIVE HELPERS
 *************************************************/

function latestVideo_(folder) {
  const files =
    folder.getFiles();

  let latest = null;
  let time = 0;

  while (
    files.hasNext()
  ) {
    const file =
      files.next();

    if (
      !String(
        file.getMimeType()
      ).startsWith('video/')
    ) {
      continue;
    }

    const updated =
      file
        .getLastUpdated()
        .getTime();

    if (
      !latest ||
      updated > time
    ) {
      latest = file;
      time = updated;
    }
  }

  return latest;
}


function sanitizeFolderName_(text) {
  return String(text || '')
    .trim()
    .replace(
      /[\/\\:*?"<>|]/g,
      '-'
    )
    .replace(/\s+/g, ' ')
    .substring(0, 150);
}


function simpleId_(text) {
  return String(text || '')
    .replace(
      /[^a-zA-Z0-9_-]/g,
      '-'
    );
}


function extractId_(url) {
  const match =
    String(url || '')
      .match(
        /[-\w]{20,}/
      );

  return match
    ? match[0]
    : '';
}


function folderExists_(id) {
  if (!id) return false;

  try {
    DriveApp
      .getFolderById(id)
      .getName();

    return true;
  } catch (_) {
    return false;
  }
}


function folderExistsInParent_(
  id,
  parentId
) {
  if (!folderExists_(id)) {
    return false;
  }

  try {
    const parents =
      DriveApp
        .getFolderById(id)
        .getParents();

    while (
      parents.hasNext()
    ) {
      if (
        parents
          .next()
          .getId() ===
        parentId
      ) {
        return true;
      }
    }
  } catch (_) {}

  return false;
}


function findFolder_(
  parent,
  name
) {
  const folders =
    parent.getFoldersByName(
      name
    );

  return folders.hasNext()
    ? folders.next()
    : null;
}


/*************************************************
 * GENERIC HELPERS
 *************************************************/

function getSS_() {
  return SpreadsheetApp.openById(
    IO.SPREADSHEET_ID
  );
}


function headers_(sheet) {
  const values =
    sheet
      .getRange(
        1,
        1,
        1,
        sheet.getLastColumn()
      )
      .getValues()[0];

  const map = {};

  values.forEach((x, i) => {
    const key =
      String(x || '').trim();

    if (key) {
      map[key] = i + 1;
    }
  });

  return map;
}


function requireHeaders_(
  h,
  list
) {
  const missing =
    list.filter(
      x => !h[x]
    );

  if (missing.length) {
    throw new Error(
      'Missing headers: ' +
      missing.join(', ')
    );
  }
}


function set_(
  sheet,
  row,
  h,
  name,
  value
) {
  if (!h[name]) return;

  sheet
    .getRange(
      row,
      h[name]
    )
    .setValue(value);
}


function getConfig_(ss) {
  const sheet =
    ss.getSheetByName(
      IO.CONFIG
    );

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return {};
  }

  const config = {};

  sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      2
    )
    .getValues()
    .forEach(r => {
      const key =
        String(
          r[0] || ''
        ).trim();

      if (key) {
        config[key] = r[1];
      }
    });

  return config;
}


function bool_(value) {
  if (value === true) {
    return true;
  }

  if (value === false) {
    return false;
  }

  const text =
    String(
      value || ''
    )
      .trim()
      .toUpperCase();

  return (
    text === 'TRUE' ||
    text === 'YES' ||
    text === '1'
  );
}


function formatDate_(value) {
  let d = value;

  if (
    !(d instanceof Date)
  ) {
    d = new Date(value);
  }

  if (
    isNaN(d.getTime())
  ) {
    throw new Error(
      'Invalid Publish Date.'
    );
  }

  return Utilities.formatDate(
    d,
    IO.TZ,
    'yyyy-MM-dd'
  );
}


/*************************************************
 * AUTO BLOCKERS
 *************************************************/

function autoBlock_(
  sheet,
  row,
  h,
  message
) {
  if (!h['Blocker']) {
    return;
  }

  const cell =
    sheet.getRange(
      row,
      h['Blocker']
    );

  const current =
    String(
      cell.getValue() || ''
    ).trim();

  if (
    !current ||
    current.startsWith('[AUTO]')
  ) {
    cell.setValue(
      `[AUTO] ${message}`
    );
  }
}


function clearAutoBlock_(
  sheet,
  row,
  h
) {
  if (!h['Blocker']) {
    return;
  }

  const cell =
    sheet.getRange(
      row,
      h['Blocker']
    );

  const current =
    String(
      cell.getValue() || ''
    ).trim();

  if (
    current.startsWith('[AUTO]')
  ) {
    cell.setValue('');
  }
}


/*************************************************
 * LOGGING
 *************************************************/

function log_(
  ss,
  action,
  videoId,
  editor,
  status,
  details,
  error
) {
  try {
    const sheet =
      ss.getSheetByName(
        IO.LOGS
      );

    if (!sheet) return;

    sheet.appendRow([
      new Date(),
      action || '',
      videoId || '',
      editor || '',
      status || '',
      details || '',
      error || ''
    ]);
  } catch (_) {}
}


/*************************************************
 * API V1 — INTERNAL FRONTEND / REPLIT BRIDGE
 *
 * Sheet remains the source of truth.
 * All production state changes stay in Apps Script.
 *************************************************/

const INFINITY_API = Object.freeze({
  VERSION: 'operations-v4',
  TOKEN_PROPERTY: 'INFINITY_API_TOKEN',
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 2000,
  WRITE_LOCK_MS: 10000
});

function doGet(e) {
  const view = e && e.parameter
    ? String(e.parameter.view || '').trim().toLowerCase()
    : '';
  if (view === 'app') {
    return HtmlService
      .createHtmlOutput(getInfinityUiHtml_())
      .setTitle('Infinity Operations')
      .addMetaTag(
        'viewport',
        'width=device-width, initial-scale=1, viewport-fit=cover'
      );
  }
  return apiJson_({
    ok: true,
    service: 'Infinity Operations API',
    version: INFINITY_API.VERSION,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  const startedAt = Date.now();
  let action = '';
  let requestId = '';
  let authorized = false;

  try {
    const rawBody =
      e && e.postData && e.postData.contents
        ? e.postData.contents
        : '';

    if (!rawBody) {
      throw apiError_('BAD_REQUEST', 'JSON request body is required.');
    }

    let body;

    try {
      body = JSON.parse(rawBody);
    } catch (_) {
      throw apiError_('INVALID_JSON', 'Request body must be valid JSON.');
    }

    requestId = String(body.requestId || Utilities.getUuid()).trim();
    action = String(body.action || '').trim().toLowerCase();

    apiAssertAuthorized_(body.token);
    authorized = true;

    if (!action) {
      throw apiError_('ACTION_REQUIRED', 'Action is required.');
    }

    const result = apiDispatch_(action, body);

    return apiJson_({
      ok: true,
      version: INFINITY_API.VERSION,
      action,
      requestId,
      result,
      meta: {
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    const code = err && err.apiCode
      ? err.apiCode
      : 'INTERNAL_ERROR';

    const message = err && err.message
      ? err.message
      : String(err);

    if (authorized) {
      try {
        log_(
          getSS_(),
          'API_ERROR',
          '',
          '',
          'ERROR',
          action || 'unknown',
          message
        );
      } catch (_) {}
    }

    return apiJson_({
      ok: false,
      version: INFINITY_API.VERSION,
      action,
      requestId,
      error: {
        code,
        message
      },
      meta: {
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString()
      }
    });
  }
}

function apiDispatch_(action, body) {
  const ss = getSS_();
  if(body.actor && body.actor.role==='editor') return opsEditorDispatch_(ss,action,body);

  if (['bootstrap', 'dashboard', 'videos', 'editor_load'].includes(action)) {
    return apiCachedRead_(action, body, () => apiDispatchUncachedRead_(ss, action, body));
  }

  switch (action) {
    case 'user_login_record': return opsLoginRecord_(ss,body);
    case 'record_ui_activity': return opsRecordUi_(ss,body);
    case 'activity_today': return opsActivity_(ss);
    case 'channels': return opsChannels_(ss);
    case 'save_post': return opsSavePost_(ss, body);
    case 'save_channel_metrics': return opsSaveMetrics_(ss, body);
    case 'mis_preview': return opsMisPreview_(ss, body);
    case 'health':
      return {
        service: 'Infinity Operations API',
        status: 'healthy',
        version: INFINITY_API.VERSION
      };

    case 'bootstrap': {
      const context = apiLoadVideoContext_(ss);

      return {
        dashboard: apiBuildDashboard_(context),
        editorLoad: apiGetEditorLoad_(ss),
        videos: apiListVideosFromContext_(context, body)
      };
    }

    case 'dashboard':
      return apiBuildDashboard_(apiLoadVideoContext_(ss));

    case 'videos':
      return apiListVideosFromContext_(
        apiLoadVideoContext_(ss),
        body
      );

    case 'video':
      return apiGetVideo_(ss, body.videoId);

    case 'editor_load':
      return apiGetEditorLoad_(ss);

    case 'detect_raw':
      return apiDetectRaw_(ss, body.videoId);

    case 'create_video':
      return apiCreateVideo_(ss, body);

    case 'update_script':
      return apiUpdateScript_(ss, body);

    case 'approve_script':
      return apiApproveScript_(ss, body);

    case 'assign_editor':
      return apiAssignEditor_(ss, body);

    case 'detect_final':
      return apiDetectFinal_(ss, body.videoId);

    case 'qc_approve':
      return apiQcDecision_(ss, body, 'Approved');

    case 'qc_changes':
      return apiQcDecision_(ss, body, 'Changes Required');

    case 'mark_uploaded':
      return apiMarkUploaded_(ss, body);


    case 'queue_action':
      return apiQueueWebAction_(ss, body);

    case 'job_status':
      return apiGetWebJobStatus_(ss, body);

    case 'web_jobs':
      return apiListWebJobs_(ss);

    case 'retry_job':
      return apiRetryWebJob_(ss, body);

    case 'snapshot':
      return apiReadWebSnapshot_(ss, body);

    case 'mis_config':
      return apiGetMisSettings_(ss);

    case 'save_mis_config':
      return apiSaveMisSettings_(ss, body);

    case 'send_mis_test':
      return apiSendMisTest_();

    case 'setup_mis_trigger':
      return apiSetupMisTrigger_();
    default:
      throw apiError_(
        'UNKNOWN_ACTION',
        `Unsupported action: ${action}`
      );
  }
}

function apiLoadVideoContext_(ss) {
  const sheet = ss.getSheetByName(IO.VIDEOS);

  if (!sheet) {
    throw apiError_('VIDEOS_SHEET_MISSING', 'VIDEOS sheet was not found.');
  }

  const h = headers_(sheet);

  requireHeaders_(h, [
    'Video ID',
    'Publish Date',
    'Production Status',
    'Editor',
    'SLA Status',
    'Archived?'
  ]);

  const lastRow = getLastVideoDataRow_(sheet);
  const values = lastRow < 2
    ? []
    : sheet
        .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
        .getValues();

  const items = values
    .map((row, index) =>
      apiVideoFromData_(row, h, index + 2, false)
    )
    .filter(item => item.videoId && !item.archived);

  return {
    sheet,
    headers: h,
    values,
    items,
    lastRow
  };
}

function apiVideoFromData_(data, h, rowNumber, includeDetails) {
  const value = name =>
    h[name]
      ? data[h[name] - 1]
      : '';

  const script = String(value('Script') || '');

  const video = {
    rowNumber,
    videoId: String(value('Video ID') || '').trim(),
    publishDate: apiScalar_(value('Publish Date')),
    talent: String(value('Talent') || '').trim(),
    scriptPreview: script.slice(0, 240),
    priority: String(value('Priority') || '').trim(),
    scriptReady: bool_(value('Script Ready?')),
    productionStatus: String(value('Production Status') || '').trim(),
    driveFolderUrl: String(value('Drive Folder URL') || '').trim(),
    rawFolderUrl: apiFolderUrl_(value('RAW Folder ID')),
    finalFolderUrl: apiFolderUrl_(value('FINAL Folder ID')),
    rawFileUrl: String(value('Raw File URL') || '').trim(),
    finalFileUrl: String(value('Final File URL') || '').trim(),
    editor: String(value('Editor') || '').trim(),
    qcStatus: String(value('QC Status') || '').trim(),
    qcChangeNotes: String(value('QC Change Notes') || '').trim(),
    postUrl: String(value('Post URL') || '').trim(),
    posted: bool_(value('Posted?')),
    account: String(value('Account') || '').trim(),
    viewsToday: apiScalar_(value('Views Today')),
    currentViews: apiScalar_(value('Current Views')),
    sales: apiScalar_(value('Sales')),
    blocker: String(value('Blocker') || '').trim(),
    lastErrorAt: apiScalar_(value('Last Error At')),
    assignmentUpdatedAt: apiScalar_(value('Assignment Updated At')),
    stageUpdatedAt: apiScalar_(value('Stage Updated At')),
    dueAt: apiScalar_(value('Due At')),
    slaStatus: String(value('SLA Status') || '').trim(),
    revisionNo: apiScalar_(value('Revision No')),
    retryCount: apiScalar_(value('Retry Count')),
    archived: bool_(value('Archived?'))
  };

  if (includeDetails) {
    video.script = script;
    video.recordingNotes = String(value('Recording Notes') || '');
    video.qcChangeNotes = String(value('QC Change Notes') || '');
    video.notes = String(value('Notes') || '');
    video.lastErrorAt = apiScalar_(value('Last Error At'));
  }

  return video;
}

function apiListVideosFromContext_(context, body) {
  const status = String(body.status || '').trim().toLowerCase();
  const editor = String(body.editor || '').trim().toLowerCase();
  const query = String(body.query || '').trim().toLowerCase();
  const requestedLimit = Number(body.limit || INFINITY_API.DEFAULT_LIMIT);
  const limit = Math.max(
    1,
    Math.min(
      INFINITY_API.MAX_LIMIT,
      Number.isFinite(requestedLimit)
        ? Math.floor(requestedLimit)
        : INFINITY_API.DEFAULT_LIMIT
    )
  );

  const filtered = context.items.filter(item => {
    if (
      status &&
      item.productionStatus.toLowerCase() !== status
    ) return false;

    if (
      editor &&
      item.editor.toLowerCase() !== editor
    ) return false;

    if (query) {
      const haystack = [
        item.videoId,
        item.talent,
        item.editor,
        item.productionStatus,
        item.priority,
        item.scriptPreview
      ].join(' ').toLowerCase();

      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  return {
    total: context.items.length,
    filtered: filtered.length,
    limit,
    items: filtered.slice(-limit).reverse()
  };
}

function apiBuildDashboard_(context) {
  const todayKey = Utilities.formatDate(
    new Date(),
    IO.TZ,
    'yyyy-MM-dd'
  );

  const byStatus = {};
  let plannedToday = 0;
  let overdue = 0;
  let blocked = 0;

  context.items.forEach(item => {
    const status = item.productionStatus || 'Unassigned';

    byStatus[status] = (byStatus[status] || 0) + 1;

    if (apiDateKey_(item.publishDate) === todayKey) {
      plannedToday++;
    }

    if (item.slaStatus.toLowerCase().includes('overdue')) {
      overdue++;
    }

    if (item.blocker) {
      blocked++;
    }
  });

  const actionItems = context.items
    .filter(item =>
      item.blocker ||
      item.slaStatus.toLowerCase().includes('overdue') ||
      item.productionStatus === 'QC Pending' ||
      item.productionStatus === 'Changes'
    )
    .slice(-30)
    .reverse();

  return {
    plannedToday,
    totalActive: context.items.length,
    overdue,
    blocked,
    byStatus,
    actionItems
  };
}

function apiGetVideo_(ss, videoId) {
  const id = String(videoId || '').trim();

  if (!id) {
    throw apiError_('VIDEO_ID_REQUIRED', 'videoId is required.');
  }

  const context = apiLoadVideoContext_(ss);
  const index = context.items.findIndex(item => item.videoId === id);

  if (index < 0) {
    throw apiError_('VIDEO_NOT_FOUND', `Video not found: ${id}`);
  }

  const summary = context.items[index];
  const rowData = context.values[summary.rowNumber - 2];
  const detail = apiVideoFromData_(
    rowData,
    context.headers,
    summary.rowNumber,
    true
  );

  detail.editorWhatsAppUrl = apiEditorWhatsAppUrl_(ss, detail);

  return detail;
}

function apiGetEditorLoad_(ss) {
  const sheet = ss.getSheetByName(IO.EDITORS);

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const h = headers_(sheet);

  requireHeaders_(h, [
    'Editor',
    'Active',
    'Daily Capacity',
    'Open Edit Load',
    'Available?'
  ]);

  const rows = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getValues();

  return rows
    .map(row => {
      const value = name =>
        h[name]
          ? row[h[name] - 1]
          : '';

      return {
        editor: String(value('Editor') || '').trim(),
        active: bool_(value('Active')),
        available: bool_(value('Available?')),
        dailyCapacity: Number(value('Daily Capacity') || 0),
        openLoad: Number(value('Open Edit Load') || 0),
        topPriorityRank: apiScalar_(value('Top Priority Rank')),
        emergencyBackup: bool_(value('Emergency Backup?'))
      };
    })
    .filter(item => item.editor);
}

function apiDetectRaw_(ss, videoId) {
  const id = String(videoId || '').trim();

  if (!id) {
    throw apiError_('VIDEO_ID_REQUIRED', 'videoId is required.');
  }

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(INFINITY_API.WRITE_LOCK_MS)) {
    throw apiError_(
      'SYSTEM_BUSY',
      'Another Infinity operation is running. Retry shortly.'
    );
  }

  try {
    const before = apiGetVideo_(ss, id);

    scanRaw_(ss, id);

    const after = apiGetVideo_(ss, id);

    return {
      detected: Boolean(after.rawFileUrl),
      changed:
        before.rawFileUrl !== after.rawFileUrl ||
        before.editor !== after.editor ||
        before.productionStatus !== after.productionStatus,
      video: after
    };

  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function apiEditorWhatsAppUrl_(ss, video) {
  if (!video.editor) return '';

  const sheet = ss.getSheetByName(IO.EDITORS);

  if (!sheet || sheet.getLastRow() < 2) return '';

  const h = headers_(sheet);

  if (!h['Editor'] || !h['WhatsApp']) return '';

  const rows = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getDisplayValues();

  const match = rows.find(row =>
    String(row[h['Editor'] - 1] || '').trim() === video.editor
  );

  if (!match) return '';

  const phone = String(match[h['WhatsApp'] - 1] || '')
    .replace(/[^0-9]/g, '');

  if (!phone) return '';

  const message = [
    `Hi ${video.editor},`,
    '',
    'New video assigned for editing.',
    `Video ID: ${video.videoId}`,
    `Talent: ${video.talent}`,
    `Priority: ${video.priority}`,
    '',
    video.script
      ? `Script:\n${video.script.slice(0, 1200)}`
      : '',
    video.rawFileUrl
      ? `RAW VIDEO: ${video.rawFileUrl}`
      : '',
    video.driveFolderUrl
      ? `Main folder: ${video.driveFolderUrl}`
      : '',
    video.rawFolderUrl
      ? `RAW folder: ${video.rawFolderUrl}`
      : '',
    video.finalFolderUrl
      ? `FINAL folder: ${video.finalFolderUrl}`
      : '',
    '',
    'Please start editing and upload the final file in the FINAL folder.'
  ].filter(line => line !== '').join('\n');

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function apiFolderUrl_(folderId) {
  const id = String(folderId || '').trim();

  return id
    ? `https://drive.google.com/drive/folders/${id}`
    : '';
}

function apiScalar_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      IO.TZ,
      'yyyy-MM-dd HH:mm:ss'
    );
  }

  return value === null || value === undefined
    ? ''
    : value;
}

function apiDateKey_(value) {
  if (!value) return '';

  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, IO.TZ, 'yyyy-MM-dd');
  }

  const parsed = new Date(value);

  if (isNaN(parsed.getTime())) {
    return String(value).trim();
  }

  return Utilities.formatDate(parsed, IO.TZ, 'yyyy-MM-dd');
}

function apiAssertAuthorized_(providedToken) {
  const storedToken = PropertiesService
    .getScriptProperties()
    .getProperty(INFINITY_API.TOKEN_PROPERTY);

  if (!storedToken) {
    throw apiError_(
      'API_NOT_CONFIGURED',
      'Run initializeInfinityApiToken() once before using the API.'
    );
  }

  if (!apiSafeEqual_(providedToken, storedToken)) {
    throw apiError_('UNAUTHORIZED', 'Invalid API token.');
  }
}

function apiSafeEqual_(left, right) {
  const a = String(left || '');
  const b = String(right || '');

  if (a.length !== b.length) return false;

  let difference = 0;

  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return difference === 0;
}

function apiError_(code, message) {
  const err = new Error(message);
  err.apiCode = code;
  return err;
}

function apiJson_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function initializeInfinityApiToken() {
  const properties = PropertiesService.getScriptProperties();
  let token = properties.getProperty(INFINITY_API.TOKEN_PROPERTY);

  if (!token) {
    token = `${Utilities.getUuid()}.${Utilities.getUuid()}`;
    properties.setProperty(INFINITY_API.TOKEN_PROPERTY, token);
  }

  SpreadsheetApp.getUi().alert(
    'Infinity API token',
    token +
      '\n\nStore this only in Replit Secrets as INFINITY_API_TOKEN.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );

  return token;
}

function rotateInfinityApiToken() {
  const token = `${Utilities.getUuid()}.${Utilities.getUuid()}`;

  PropertiesService
    .getScriptProperties()
    .setProperty(INFINITY_API.TOKEN_PROPERTY, token);

  SpreadsheetApp.getUi().alert(
    'Infinity API token rotated',
    token +
      '\n\nUpdate INFINITY_API_TOKEN in Replit Secrets immediately.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );

  return token;
}
/*************************************************
 * INFINITY OPERATIONS — NATIVE APPS SCRIPT UI
 *
 * Open the deployed web app with: ?view=app
 * The existing GET health response remains unchanged without that parameter.
 *************************************************/
const INFINITY_UI = Object.freeze({
  ACCESS_CODE_PROPERTY: 'INFINITY_UI_ACCESS_CODE',
  MAX_VIDEOS: 200
});

function initializeInfinityUiAccessCode() {
  const properties = PropertiesService.getScriptProperties();
  let accessCode = properties.getProperty(INFINITY_UI.ACCESS_CODE_PROPERTY);
  if (!accessCode) {
    accessCode = Utilities.getUuid().replace(/-/g, '').slice(0, 18);
    properties.setProperty(INFINITY_UI.ACCESS_CODE_PROPERTY, accessCode);
  }
  SpreadsheetApp.getUi().alert(
    'Infinity dashboard access code',
    accessCode + '\n\nShare only with authorised team members.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return accessCode;
}

function rotateInfinityUiAccessCode() {
  const accessCode = Utilities.getUuid().replace(/-/g, '').slice(0, 18);
  PropertiesService
    .getScriptProperties()
    .setProperty(INFINITY_UI.ACCESS_CODE_PROPERTY, accessCode);
  SpreadsheetApp.getUi().alert(
    'Infinity dashboard access code rotated',
    accessCode + '\n\nOld browser sessions will stop working.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return accessCode;
}

function infinityUiLogin(accessCode) {
  infinityUiAssertAccess_(accessCode);
  return { ok: true };
}

function infinityUiBootstrap(accessCode) {
  infinityUiAssertAccess_(accessCode);
  const ss = getSS_();
  const context = apiLoadVideoContext_(ss);
  return {
    dashboard: apiBuildDashboard_(context),
    editorLoad: apiGetEditorLoad_(ss),
    videos: apiListVideosFromContext_(context, { limit: INFINITY_UI.MAX_VIDEOS })
  };
}

function infinityUiVideo(accessCode, videoId) {
  infinityUiAssertAccess_(accessCode);
  return apiGetVideo_(getSS_(), videoId);
}

function infinityUiDetectRaw(accessCode, videoId) {
  infinityUiAssertAccess_(accessCode);
  return apiDetectRaw_(getSS_(), videoId);
}

function infinityUiAssertAccess_(providedCode) {
  const storedCode = PropertiesService
    .getScriptProperties()
    .getProperty(INFINITY_UI.ACCESS_CODE_PROPERTY);
  if (!storedCode) {
    throw new Error('Run initializeInfinityUiAccessCode() once before opening the dashboard.');
  }
  if (!apiSafeEqual_(providedCode, storedCode)) {
    throw new Error('Invalid dashboard access code.');
  }
}

function getInfinityUiHtml_() {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Infinity Operations</title>
  <style>
    :root{--ink:#0d1728;--bg:#f4f6f8;--line:#e2e8f0;--muted:#64748b;--purple:#6657e8;--white:#fff;--red:#dc2626;--green:#059669;--amber:#d97706}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:#0f172a;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,select{font:inherit}button{cursor:pointer}.hidden{display:none!important}
    .shell{min-height:100vh;display:flex}.sidebar{width:248px;background:var(--ink);color:#fff;padding:24px 20px;display:flex;flex-direction:column;position:fixed;inset:0 auto 0 0}.brand{display:flex;align-items:center;gap:12px}.brand-mark{width:42px;height:42px;border-radius:15px;background:linear-gradient(145deg,#7c5cff,#4f9cff);display:grid;place-items:center;font-size:19px;box-shadow:0 12px 30px rgba(36,32,93,.45)}.brand strong{display:block;font-size:14px;letter-spacing:.08em}.brand span{font-size:12px;color:#94a3b8}.nav{margin-top:38px;display:grid;gap:8px}.nav button{border:0;background:transparent;color:#94a3b8;padding:12px;border-radius:12px;text-align:left;display:flex;gap:10px;align-items:center}.nav button.active{background:rgba(124,92,255,.14);color:#fff;box-shadow:inset 3px 0 #7c5cff}.api-state{margin-top:auto;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);border-radius:16px;padding:15px}.api-state b{font-size:12px;color:#6ee7b7}.api-state p{font-size:12px;line-height:1.5;color:#94a3b8;margin:8px 0 0}.main{margin-left:248px;min-width:0;width:calc(100% - 248px)}
    .top{height:78px;background:rgba(255,255,255,.94);border-bottom:1px solid var(--line);padding:0 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;backdrop-filter:blur(12px)}.top h1{font-size:23px;margin:0;letter-spacing:-.03em}.top p{font-size:13px;color:var(--muted);margin:4px 0 0}.content{max-width:1480px;margin:auto;padding:26px}.refresh{border:1px solid var(--line);background:#fff;padding:10px 14px;border-radius:12px;font-weight:700;color:#334155}.refresh:disabled{opacity:.55}.tabs{display:flex;gap:6px;border-bottom:1px solid var(--line);margin-bottom:22px;overflow:auto}.tabs button{border:0;background:none;padding:12px 14px;color:var(--muted);font-weight:700;white-space:nowrap}.tabs button.active{color:#111827;border-bottom:2px solid var(--ink)}
    .metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.metric,.panel,.editor-card{background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,.03)}.metric{padding:16px}.metric i{display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:#eef2ff;color:#4f46e5;font-style:normal}.metric strong{display:block;font-size:29px;margin-top:17px;letter-spacing:-.04em}.metric span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.11em;color:var(--muted);font-weight:800;margin-top:3px}.grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(310px,.55fr);gap:20px;margin-top:20px}.panel{overflow:hidden}.panel-head{padding:17px 19px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;gap:14px}.panel-head h2{font-size:15px;margin:0}.panel-head p{font-size:12px;color:var(--muted);margin:4px 0 0}.count{border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800;color:#475569}.empty{margin:18px;border:1px dashed #cbd5e1;background:#f8fafc;border-radius:14px;min-height:165px;display:grid;place-items:center;text-align:center;padding:25px;color:var(--muted)}
    table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:12px 10px;border-bottom:1px solid #f1f5f9;text-align:left;white-space:nowrap}th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;background:#f8fafc}th:first-child,td:first-child{padding-left:19px}th:last-child,td:last-child{padding-right:19px}.video-id{border:0;background:none;padding:0;color:#0f172a;font-weight:800}.video-id:hover{color:#4f46e5}.sub{display:block;color:var(--muted);font-size:11px;margin-top:3px;max-width:230px;overflow:hidden;text-overflow:ellipsis}.pill{display:inline-flex;padding:4px 8px;border-radius:999px;border:1px solid #e2e8f0;background:#fff;font-size:11px;font-weight:800}.s-editing{background:#fffbeb;border-color:#fde68a;color:#92400e}.s-qc-pending{background:#fff7ed;border-color:#fed7aa;color:#9a3412}.s-changes,.s-blocked{background:#fff1f2;border-color:#fecdd3;color:#be123c}.s-approved,.s-uploaded{background:#ecfdf5;border-color:#a7f3d0;color:#047857}.s-raw-ready{background:#ecfeff;border-color:#a5f3fc;color:#0e7490}.queue-row{cursor:pointer}.queue-row:hover{background:#f8fafc}.pipeline{padding:18px;display:grid;gap:10px}.pipe-row{display:flex;align-items:center;justify-content:space-between;border:1px solid #f1f5f9;background:#f8fafc;border-radius:12px;padding:10px}.pipe-row b{font-size:13px}
    .filters{display:flex;gap:9px}.filters input,.filters select{height:39px;border:1px solid var(--line);border-radius:11px;background:#f8fafc;padding:0 12px;color:#334155}.filters input{width:270px}.detect{border:1px solid var(--line);background:#fff;padding:7px 10px;border-radius:9px;font-weight:700;font-size:12px}.detect:hover{background:#f8fafc}.detect:disabled{opacity:.55}.editors{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.editor-card{padding:18px}.editor-top{display:flex;justify-content:space-between;align-items:center}.avatar{width:43px;height:43px;border-radius:15px;background:#f1f5f9;display:grid;place-items:center;font-weight:900}.editor-name{display:flex;gap:11px;align-items:center}.editor-name b{display:block}.editor-name span{font-size:11px;color:var(--muted)}.dot{width:9px;height:9px;border-radius:50%;background:#cbd5e1}.dot.on{background:#10b981}.load{display:flex;justify-content:space-between;align-items:end;margin-top:22px}.load span{font-size:12px;color:var(--muted)}.load b{font-size:23px}.bar{height:8px;background:#eef2f7;border-radius:999px;overflow:hidden;margin-top:10px}.bar i{display:block;height:100%;background:#6657e8;border-radius:999px}.editor-foot{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:9px}
    .notice{display:flex;gap:10px;border:1px solid #fde68a;background:#fffbeb;color:#92400e;border-radius:14px;padding:13px;margin-bottom:18px;font-size:13px;line-height:1.5}.modal{position:fixed;inset:0;background:rgba(2,6,23,.55);z-index:40;display:flex;justify-content:flex-end}.drawer{width:min(560px,100%);height:100%;overflow:auto;background:#fff;box-shadow:-20px 0 60px rgba(2,6,23,.18)}.drawer-head{padding:20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between}.drawer-head h2{margin:0;font-size:18px}.close{border:0;background:#f1f5f9;width:34px;height:34px;border-radius:10px}.drawer-body{padding:20px}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:18px 0}.detail-box{background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:12px}.detail-box label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:800}.detail-box b{display:block;font-size:13px;margin-top:4px;overflow:hidden;text-overflow:ellipsis}.script{white-space:pre-wrap;line-height:1.6;font-size:13px;background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:14px;max-height:210px;overflow:auto}.links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:16px}.links a{display:flex;justify-content:space-between;text-decoration:none;border:1px solid var(--line);border-radius:11px;padding:10px;color:#334155;font-weight:700;font-size:12px}.primary{width:100%;margin-top:16px;border:0;border-radius:12px;background:var(--ink);color:#fff;padding:12px;font-weight:800}.blocker{border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;border-radius:12px;padding:13px;margin:14px 0;font-size:13px}.login-wrap{min-height:100vh;background:radial-gradient(circle at 25% 15%,#293c67 0,#0d1728 45%,#080f1c 100%);display:grid;place-items:center;padding:20px}.login{width:min(430px,100%);background:#fff;border-radius:22px;padding:28px;box-shadow:0 30px 80px rgba(0,0,0,.3)}.login-mark{width:48px;height:48px;border-radius:16px;background:linear-gradient(145deg,#7c5cff,#4f9cff);display:grid;place-items:center;color:#fff;font-size:21px}.login h1{font-size:25px;margin:22px 0 6px}.login p{color:var(--muted);font-size:13px;line-height:1.6;margin:0 0 18px}.login input{width:100%;height:44px;border:1px solid var(--line);border-radius:12px;padding:0 13px}.login button{width:100%;height:44px;border:0;border-radius:12px;background:var(--ink);color:#fff;font-weight:800;margin-top:10px}.login-error{color:#b91c1c;font-size:12px;margin-top:10px}.spinner{display:inline-block;width:15px;height:15px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:1100px){.metrics{grid-template-columns:repeat(3,1fr)}.editors{grid-template-columns:repeat(2,1fr)}}@media(max-width:800px){.sidebar{display:none}.main{margin:0;width:100%}.top{height:auto;padding:15px 16px}.top p{display:none}.content{padding:16px}.grid{grid-template-columns:1fr}.filters{width:100%;flex-direction:column}.filters input,.filters select{width:100%}.panel-head.stack{align-items:stretch;flex-direction:column}.editors{grid-template-columns:1fr}.links{grid-template-columns:1fr}}@media(max-width:520px){.metrics{grid-template-columns:repeat(2,1fr)}.metric strong{font-size:25px}th:nth-child(2),td:nth-child(2),th:nth-child(5),td:nth-child(5){display:none}.detail-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div id="loginView" class="login-wrap">
    <form class="login" onsubmit="login(event)">
      <div class="login-mark">∞</div>
      <h1>Infinity Operations</h1>
      <p>Enter the shared dashboard access code. Your Google Sheet remains the source of truth.</p>
      <input id="accessCode" type="password" autocomplete="current-password" placeholder="Dashboard access code" required>
      <button id="loginButton" type="submit">Open dashboard</button>
      <div id="loginError" class="login-error"></div>
    </form>
  </div>

  <div id="appView" class="shell hidden">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">∞</div><div><strong>INFINITY</strong><span>Operations OS</span></div></div>
      <nav class="nav"><button class="active" data-view="tower" onclick="showView('tower')">◫ Control Tower</button><button data-view="videos" onclick="showView('videos')">▶ Video Pipeline</button><button data-view="editors" onclick="showView('editors')">● Editor Load</button></nav>
      <div class="api-state"><b>● Apps Script native</b><p>No separate database or hosting layer. Sheet and Drive stay authoritative.</p></div>
    </aside>
    <main class="main">
      <header class="top"><div><h1 id="pageTitle">Control Tower</h1><p>Live production flow, blockers and editor capacity.</p></div><button id="refreshButton" class="refresh" onclick="loadWorkspace()">↻ Refresh</button></header>
      <div class="content">
        <div id="notice" class="notice hidden"></div>
        <div class="tabs"><button class="active" data-tab="tower" onclick="showView('tower')">Control Tower</button><button data-tab="videos" onclick="showView('videos')">Videos <span id="videoCount">0</span></button><button data-tab="editors" onclick="showView('editors')">Editor Load</button></div>
        <section id="towerView"><div id="metrics" class="metrics"></div><div class="grid"><div class="panel"><div class="panel-head"><div><h2>Action queue</h2><p>Overdue, blocked and review-stage videos.</p></div><span id="queueCount" class="count">0 items</span></div><div id="queue"></div></div><div class="panel"><div class="panel-head"><div><h2>Pipeline pulse</h2><p>Active videos by stage.</p></div></div><div id="pipeline" class="pipeline"></div></div></div></section>
        <section id="videosView" class="hidden"><div class="panel"><div class="panel-head stack"><div><h2>Video pipeline</h2><p>Search rows and trigger a targeted RAW scan.</p></div><div class="filters"><input id="search" placeholder="Search ID, talent or editor" oninput="renderVideos()"><select id="statusFilter" onchange="renderVideos()"><option value="">All stages</option></select></div></div><div id="videosTable"></div></div></section>
        <section id="editorsView" class="hidden"><div id="editors" class="editors"></div></section>
      </div>
    </main>
  </div>

  <div id="detailModal" class="modal hidden" onclick="closeDetail(event)"><aside class="drawer"><div class="drawer-head"><div><h2 id="detailId">Video detail</h2><span id="detailTalent" class="sub"></span></div><button class="close" onclick="hideDetail()">×</button></div><div id="detailBody" class="drawer-body"></div></aside></div>

  <script>
    var state={code:'',data:null,currentView:'tower',detail:null,busy:''};
    var metricSpec=[['Planned today','plannedToday','◷'],['Editing','Editing','✦'],['QC pending','QC Pending','✓'],['Changes','Changes','↻'],['Uploaded','Uploaded','↑'],['Overdue','overdue','!']];

    function server(name,args){return new Promise(function(resolve,reject){var runner=google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);if(name==='login')runner.infinityUiLogin(args[0]);else if(name==='bootstrap')runner.infinityUiBootstrap(args[0]);else if(name==='video')runner.infinityUiVideo(args[0],args[1]);else if(name==='detect')runner.infinityUiDetectRaw(args[0],args[1]);else reject(new Error('Unknown UI action.'));});}
    function messageOf(error){return error&&error.message?error.message:String(error||'Something went wrong.');}
    function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];});}
    function safeUrl(value){var url=String(value||'');return /^https:\/\//i.test(url)?url:'';}
    function slug(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
    function pill(status){var label=status||'Unassigned';return'<span class="pill s-'+slug(label)+'">'+esc(label)+'</span>';}
    function empty(title,body){return'<div class="empty"><div><b>'+esc(title)+'</b><div class="sub" style="max-width:420px;margin-top:7px">'+esc(body)+'</div></div></div>';}
    function setBusy(on){document.getElementById('refreshButton').disabled=on;document.getElementById('refreshButton').innerHTML=on?'<span class="spinner"></span> Loading':'↻ Refresh';}
    function notify(text,isError){var el=document.getElementById('notice');el.textContent=text;el.classList.remove('hidden');if(isError)el.style.borderColor='#fecaca';else el.style.borderColor='#bfdbfe';window.setTimeout(function(){el.classList.add('hidden');},4500);}

    async function login(event){event.preventDefault();var code=document.getElementById('accessCode').value.trim();var button=document.getElementById('loginButton');var error=document.getElementById('loginError');button.disabled=true;button.innerHTML='<span class="spinner"></span> Checking';error.textContent='';try{await server('login',[code]);state.code=code;sessionStorage.setItem('infinityAccessCode',code);openApp();await loadWorkspace();}catch(cause){error.textContent=messageOf(cause);}finally{button.disabled=false;button.textContent='Open dashboard';}}
    function openApp(){document.getElementById('loginView').classList.add('hidden');document.getElementById('appView').classList.remove('hidden');}
    function logoutToLogin(){sessionStorage.removeItem('infinityAccessCode');state.code='';document.getElementById('appView').classList.add('hidden');document.getElementById('loginView').classList.remove('hidden');}
    async function loadWorkspace(){if(!state.code)return;setBusy(true);try{state.data=await server('bootstrap',[state.code]);renderAll();}catch(cause){var text=messageOf(cause);notify(text,true);if(/access code/i.test(text))logoutToLogin();}finally{setBusy(false);}}
    function renderAll(){var videos=(state.data&&state.data.videos&&state.data.videos.items)||[];document.getElementById('videoCount').textContent=videos.length;renderMetrics();renderQueue();renderPipeline();populateStatuses();renderVideos();renderEditors();}
    function renderMetrics(){var d=(state.data&&state.data.dashboard)||{byStatus:{}};document.getElementById('metrics').innerHTML=metricSpec.map(function(spec){var value=spec[1]==='plannedToday'||spec[1]==='overdue'?(d[spec[1]]||0):((d.byStatus||{})[spec[1]]||0);return'<article class="metric"><i>'+spec[2]+'</i><strong>'+esc(value)+'</strong><span>'+esc(spec[0])+'</span></article>';}).join('');}
    function renderQueue(){var items=(state.data&&state.data.dashboard&&state.data.dashboard.actionItems)||[];document.getElementById('queueCount').textContent=items.length+' items';if(!items.length){document.getElementById('queue').innerHTML=empty('Queue is clear','No blocked, overdue, QC pending or changes videos were returned.');return;}var rows=items.slice(0,12).map(function(v){return'<tr class="queue-row" onclick="openVideo(\''+esc(v.videoId)+'\')"><td><b>'+esc(v.videoId)+'</b><span class="sub">'+esc(v.blocker||v.slaStatus||v.talent||'')+'</span></td><td><b>'+esc(v.editor||'Unassigned')+'</b><span class="sub">'+esc(v.talent||'')+'</span></td><td>'+pill(v.productionStatus)+'</td><td>↗</td></tr>';}).join('');document.getElementById('queue').innerHTML='<table><thead><tr><th>Video</th><th>Owner</th><th>Stage</th><th>Open</th></tr></thead><tbody>'+rows+'</tbody></table>';}
    function renderPipeline(){var by=(state.data&&state.data.dashboard&&state.data.dashboard.byStatus)||{};var entries=Object.keys(by).map(function(k){return[k,by[k]];}).sort(function(a,b){return b[1]-a[1];});document.getElementById('pipeline').innerHTML=entries.length?entries.map(function(item){return'<div class="pipe-row">'+pill(item[0])+'<b>'+esc(item[1])+'</b></div>';}).join(''):empty('No active videos','Pipeline rows will appear from the Sheet.');}
    function populateStatuses(){var videos=(state.data&&state.data.videos&&state.data.videos.items)||[];var select=document.getElementById('statusFilter');var current=select.value;var statuses=[];videos.forEach(function(v){if(v.productionStatus&&statuses.indexOf(v.productionStatus)<0)statuses.push(v.productionStatus);});statuses.sort();select.innerHTML='<option value="">All stages</option>'+statuses.map(function(s){return'<option value="'+esc(s)+'">'+esc(s)+'</option>';}).join('');select.value=current;}
    function renderVideos(){var videos=(state.data&&state.data.videos&&state.data.videos.items)||[];var query=(document.getElementById('search').value||'').toLowerCase().trim();var status=document.getElementById('statusFilter').value;var filtered=videos.filter(function(v){if(status&&v.productionStatus!==status)return false;if(!query)return true;return[v.videoId,v.talent,v.editor,v.productionStatus,v.priority,v.scriptPreview].join(' ').toLowerCase().indexOf(query)>=0;});if(!filtered.length){document.getElementById('videosTable').innerHTML=empty('No matching videos',videos.length?'Try a different search or stage filter.':'No active rows were returned by the Sheet.');return;}var rows=filtered.map(function(v){var overdue=String(v.slaStatus||'').toLowerCase().indexOf('overdue')>=0;return'<tr><td><button class="video-id" onclick="openVideo(\''+esc(v.videoId)+'\')">'+esc(v.videoId)+'</button><span class="sub">'+esc(v.talent||v.scriptPreview||'No talent set')+'</span></td><td>'+esc(v.publishDate||'—')+'</td><td><b>'+esc(v.editor||'Unassigned')+'</b><span class="sub">'+esc(v.priority||'')+'</span></td><td>'+pill(v.productionStatus)+'</td><td style="color:'+(overdue?'#dc2626':'#64748b')+';font-weight:'+(overdue?'800':'500')+'">'+esc(v.slaStatus||'—')+'</td><td><button class="detect" '+(state.busy===v.videoId?'disabled':'')+' onclick="detectRaw(\''+esc(v.videoId)+'\')">'+(state.busy===v.videoId?'<span class="spinner"></span>':'↻ Detect RAW')+'</button></td></tr>';}).join('');document.getElementById('videosTable').innerHTML='<table><thead><tr><th>Video</th><th>Publish date</th><th>Editor</th><th>Status</th><th>SLA</th><th>Action</th></tr></thead><tbody>'+rows+'</tbody></table>';}
    function renderEditors(){var editors=(state.data&&state.data.editorLoad)||[];if(!editors.length){document.getElementById('editors').innerHTML=empty('No editor load returned','Editor cards will appear from the EDITORS sheet.');return;}document.getElementById('editors').innerHTML=editors.map(function(e){var percent=e.dailyCapacity?Math.min(100,Math.round((e.openLoad/e.dailyCapacity)*100)):0;return'<article class="editor-card"><div class="editor-top"><div class="editor-name"><div class="avatar">'+esc(String(e.editor||'?').slice(0,1).toUpperCase())+'</div><div><b>'+esc(e.editor)+'</b><span>'+(e.emergencyBackup?'Emergency backup':'Primary editor')+'</span></div></div><i class="dot '+(e.active&&e.available?'on':'')+'"></i></div><div class="load"><span>Open workload</span><b>'+esc(e.openLoad)+' <small>/ '+esc(e.dailyCapacity)+'</small></b></div><div class="bar"><i style="width:'+percent+'%"></i></div><div class="editor-foot"><span>'+percent+'% capacity used</span><b>'+(e.available?'Available':'At capacity')+'</b></div></article>';}).join('');}
    function showView(name){state.currentView=name;['tower','videos','editors'].forEach(function(view){document.getElementById(view+'View').classList.toggle('hidden',view!==name);});document.querySelectorAll('[data-view],[data-tab]').forEach(function(button){button.classList.toggle('active',button.getAttribute('data-view')===name||button.getAttribute('data-tab')===name);});document.getElementById('pageTitle').textContent=name==='tower'?'Control Tower':name==='videos'?'Video Pipeline':'Editor Load';}
    async function openVideo(videoId){document.getElementById('detailModal').classList.remove('hidden');document.getElementById('detailId').textContent=videoId;document.getElementById('detailTalent').textContent='Loading detail…';document.getElementById('detailBody').innerHTML='<div class="empty"><span class="spinner"></span></div>';try{state.detail=await server('video',[state.code,videoId]);renderDetail();}catch(cause){document.getElementById('detailBody').innerHTML=empty('Could not load video',messageOf(cause));}}
    function renderDetail(){var v=state.detail||{};document.getElementById('detailId').textContent=v.videoId||'Video detail';document.getElementById('detailTalent').textContent=v.talent||'Production record';var boxes=[['Editor',v.editor||'Unassigned'],['Publish date',v.publishDate||'—'],['QC status',v.qcStatus||'—'],['Account',v.account||'—']].map(function(x){return'<div class="detail-box"><label>'+esc(x[0])+'</label><b>'+esc(x[1])+'</b></div>';}).join('');var blocker=v.blocker?'<div class="blocker"><b>Blocker</b><div>'+esc(v.blocker)+'</div></div>':'';var links=[['RAW folder',v.rawFolderUrl],['FINAL folder',v.finalFolderUrl],['RAW file',v.rawFileUrl],['WhatsApp editor',v.editorWhatsAppUrl]].filter(function(x){return safeUrl(x[1]);}).map(function(x){return'<a href="'+esc(safeUrl(x[1]))+'" target="_blank" rel="noreferrer">'+esc(x[0])+' <span>↗</span></a>';}).join('');document.getElementById('detailBody').innerHTML='<div>'+pill(v.productionStatus)+' '+(v.slaStatus?'<span class="pill">'+esc(v.slaStatus)+'</span>':'')+'</div><div class="detail-grid">'+boxes+'</div>'+blocker+'<b style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#64748b">Script</b><div class="script">'+esc(v.script||v.scriptPreview||'No script text returned.')+'</div>'+(links?'<div class="links">'+links+'</div>':'')+'<button class="primary" onclick="detectRaw(\''+esc(v.videoId)+'\')">↻ RAW uploaded — detect now</button>';}
    async function detectRaw(videoId){if(!videoId||state.busy)return;state.busy=videoId;renderVideos();try{var result=await server('detect',[state.code,videoId]);state.detail=result.video;if(!document.getElementById('detailModal').classList.contains('hidden'))renderDetail();notify(result.detected?'RAW file detected and workflow refreshed.':'No RAW file found in this folder yet.',false);await loadWorkspace();}catch(cause){notify(messageOf(cause),true);}finally{state.busy='';renderVideos();}}
    function hideDetail(){document.getElementById('detailModal').classList.add('hidden');state.detail=null;}
    function closeDetail(event){if(event.target.id==='detailModal')hideDetail();}
    (function init(){var saved=sessionStorage.getItem('infinityAccessCode');if(saved){state.code=saved;openApp();loadWorkspace();}})();
  </script>
</body>
</html>`;
}

// BEGIN GENERATED ADDONS — run npm run build:appscript after editing addon files.

/**
 * Infinity Operations — Manager API add-on
 *
 * This file is designed to be appended to the canonical Apps Script source.
 * It deliberately reuses the existing workflow functions so Sheet edits and
 * frontend actions follow the same validation, logs, Drive, SLA and load rules.
 */

const INFINITY_MANAGER_CACHE_SECONDS = 60;

function apiSetOptionalHeader_(sheet, row, headers, header, value) {
  if (headers[header]) set_(sheet, row, headers, header, value);
}

function setupInfinityContentFields() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('VIDEOS');
  if (!sheet) throw new Error('VIDEOS sheet not found.');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].reduce((out, name, index) => {
    out[String(name || '').trim()] = index + 1;
    return out;
  }, {});
  if (!headers['Video Type']) {
    sheet.insertColumnAfter(sheet.getLastColumn());
    sheet.getRange(1, sheet.getLastColumn()).setValue('Video Type');
  }
  return { ok: true, message: 'Video Type field is ready. Existing Script and Recording Notes columns remain unchanged.' };
}

function repairInfinityVideoDropdowns() {
  const ss = SpreadsheetApp.getActive();
  const videos = ss.getSheetByName('VIDEOS');
  const teachers = ss.getSheetByName('TALENT');
  const editors = ss.getSheetByName('EDITORS');
  const accounts = ss.getSheetByName('ACCOUNTS');
  if (!videos || !teachers || !editors || !accounts) {
    throw new Error('VIDEOS, TALENT, EDITORS and ACCOUNTS sheets are required.');
  }
  const h = headers_(videos);
  requireHeaders_(h, ['Talent','Priority','Production Status','Editor','QC Status','Account']);
  const rows = Math.max(1, videos.getMaxRows() - 1);
  const setRule = (header, rule) => videos.getRange(2, h[header], rows, 1).setDataValidation(rule);
  setRule('Talent', SpreadsheetApp.newDataValidation()
    .requireValueInRange(teachers.getRange('A2:A200'), true)
    .setAllowInvalid(true)
    .build());
  setRule('Priority', SpreadsheetApp.newDataValidation()
    .requireValueInList(['P0 - Critical','P1 - High','P2 - Normal','P3 - Low'], true)
    .setAllowInvalid(false)
    .build());
  setRule('Production Status', SpreadsheetApp.newDataValidation()
    .requireValueInList(['Script Pending','Script Ready','Recording','Raw Ready','Editing','QC Pending','Changes','Approved','Uploaded','Blocked'], true)
    .setAllowInvalid(true)
    .build());
  setRule('Editor', SpreadsheetApp.newDataValidation()
    .requireValueInRange(editors.getRange('A2:A200'), true)
    .setAllowInvalid(false)
    .build());
  setRule('QC Status', SpreadsheetApp.newDataValidation()
    .requireValueInList(['Not Ready','Pending Review','Changes Required','Approved'], true)
    .setAllowInvalid(true)
    .build());
  setRule('Account', SpreadsheetApp.newDataValidation()
    .requireValueInRange(accounts.getRange('B2:B500'), true)
    .setAllowInvalid(false)
    .build());
  return { ok: true, rows, message: 'VIDEOS dropdowns repaired for desktop and Google Sheets mobile.' };
}

function apiCachedRead_(action, body, producer) {
  if (body && body.refresh === true) return producer();
  const props = PropertiesService.getScriptProperties();
  const epoch = props.getProperty('INFINITY_API_CACHE_EPOCH') || '0';
  const identity = JSON.stringify({
    action,
    epoch,
    status: String((body && body.status) || ''),
    editor: String((body && body.editor) || ''),
    query: String((body && body.query) || ''),
    limit: Number((body && body.limit) || INFINITY_API.DEFAULT_LIMIT)
  });
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, identity);
  const key = 'infinity_api_' + Utilities.base64EncodeWebSafe(digest).slice(0, 36);
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  if (cached) {
    try { return JSON.parse(cached); } catch (_) {}
  }
  const value = producer();
  try { cache.put(key, JSON.stringify(value), INFINITY_MANAGER_CACHE_SECONDS); } catch (_) {}
  return value;
}

function apiInvalidateReadCache_() {
  PropertiesService.getScriptProperties().setProperty(
    'INFINITY_API_CACHE_EPOCH',
    String(Date.now())
  );
}

function apiDispatchUncachedRead_(ss, action, body) {
  switch (action) {
    case 'bootstrap': {
      const context = apiLoadVideoContext_(ss);
      return {
        dashboard: apiManagerDashboard_(context),
        editorLoad: apiManagerEditorLoad_(ss),
        videos: {items:context.items.slice().reverse(),total:context.items.length,filtered:context.items.length,limit:context.items.length}
      };
    }
    case 'dashboard':
      return apiManagerDashboard_(apiLoadVideoContext_(ss));
    case 'videos':
      return apiListVideosFromContext_(apiLoadVideoContext_(ss), body);
    case 'editor_load':
      return apiManagerEditorLoad_(ss);
    default:
      throw apiError_('UNKNOWN_READ_ACTION', `Unsupported cached read: ${action}`);
  }
}

function apiManagerDashboard_(context) {
  const dashboard = apiBuildDashboard_(context);
  const tz = Session.getScriptTimeZone() || 'Asia/Kolkata';
  const todayKey = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const todayByStatus = {};
  const todayItems = [];
  let todayTotal = 0;

  (context.items || []).forEach(item => {
    if (!item || !item.publishDate) return;
    const itemKey = apiManagerDateKey_(item.publishDate, tz);
    if (itemKey !== todayKey) return;
    todayTotal++;
    const status = String(item.productionStatus || 'Unassigned').trim() || 'Unassigned';
    todayByStatus[status] = (todayByStatus[status] || 0) + 1;
    todayItems.push({
      videoId: item.videoId || '',
      title: item.scriptPreview || item.title || '',
      teacher: item.teacher || item.talent || '',
      editor: item.editor || '',
      productionStatus: status,
      slaStatus: item.slaStatus || '',
      blocker: item.blocker || ''
    });
  });

  dashboard.todayTotal = todayTotal;
  dashboard.plannedToday = todayTotal;
  dashboard.todayByStatus = todayByStatus;
  dashboard.todayUploaded = Number(todayByStatus.Uploaded || 0);
  dashboard.todayItems = todayItems;
  return dashboard;
}

function apiManagerDateKey_(value, tz) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  }
  const text = String(value || '').trim();
  if (!text) return '';
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
  match = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(text);
  if (match) return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(text);
  if (match) {
    const months = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
    const month = months[match[2].toLowerCase()];
    if (month) return `${match[3]}-${String(month).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? '' : Utilities.formatDate(parsed, tz, 'yyyy-MM-dd');
}

function apiManagerEditorLoad_(ss) {
  const load = apiGetEditorLoad_(ss) || [];
  const sheet = ss.getSheetByName('EDITORS');
  if (!sheet || sheet.getLastRow() < 2) return load;
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
  const headers = values[0].reduce((out, name, index) => {
    out[String(name || '').trim().toLowerCase()] = index;
    return out;
  }, {});
  const nameIndex = headers['editor'] !== undefined ? headers['editor'] : headers['name'];
  const phoneIndex = headers['whatsapp'] !== undefined ? headers['whatsapp'] :
    (headers['whatsapp number'] !== undefined ? headers['whatsapp number'] : headers['phone']);
  if (nameIndex === undefined || phoneIndex === undefined) return load;
  const phones = {};
  values.slice(1).forEach(row => {
    const name = String(row[nameIndex] || '').trim();
    const phone = String(row[phoneIndex] || '').replace(/\D/g, '');
    if (name && phone) phones[name] = phone;
  });
  return load.map(item => Object.assign({}, item, { whatsapp: phones[item.editor || item.name] || '' }));
}

function apiManagerRequired_(value, name) {
  const text = String(value || '').trim();
  if (!text) throw apiError_('FIELD_REQUIRED', `${name} is required.`);
  return text;
}

function apiManagerDate_(value) {
  const text = apiManagerRequired_(value, 'publishDate');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) throw apiError_('INVALID_DATE', 'publishDate must use YYYY-MM-DD.');
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
  if (isNaN(date.getTime())) throw apiError_('INVALID_DATE', 'publishDate is invalid.');
  return date;
}

function apiManagerFind_(ss, videoId) {
  const id = apiManagerRequired_(videoId, 'videoId');
  const context = apiLoadVideoContext_(ss);
  const video = context.items.find(item => item.videoId === id);
  if (!video) throw apiError_('VIDEO_NOT_FOUND', `Video not found: ${id}`);
  return { context, video, sheet: context.sheet, h: context.headers, row: video.rowNumber };
}

function apiManagerLock_(work) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(INFINITY_API.WRITE_LOCK_MS)) {
    throw apiError_('SYSTEM_BUSY', 'Another Infinity operation is running. Retry shortly.');
  }
  try { return work(); } finally { try { lock.releaseLock(); } catch (_) {} }
}

function apiCreateVideo_(ss, body) {
  const videoId = apiManagerRequired_(body.videoId, 'videoId');
  const teacher = apiManagerRequired_(body.teacher || body.talent, 'teacher');
  const videoType = String(body.videoType || 'Original Recording').trim();
  const recordingScript = String(body.recordingScript || body.script || '').trim();
  const editorBrief = apiManagerRequired_(body.editorBrief || body.recordingNotes || body.script, 'editorBrief');
  if (videoType === 'Original Recording' && !recordingScript) {
    throw apiError_('RECORDING_SCRIPT_REQUIRED', 'Recording Script is required for Original Recording.');
  }
  const script = recordingScript || editorBrief;
  const publishDate = apiManagerDate_(body.publishDate);
  const priority = String(body.priority || 'P2 - Normal').trim();

  const result = apiManagerLock_(() => {
    const context = apiLoadVideoContext_(ss);
    if (context.items.some(item => item.videoId === videoId)) {
      throw apiError_('DUPLICATE_VIDEO_ID', `Video ID already exists: ${videoId}`);
    }
    const sheet = context.sheet;
    const h = context.headers;
    requireHeaders_(h, ['Video ID','Publish Date','Talent','Script','Priority','Script Ready?','Production Status','QC Status','Posted?','Archived?']);
    const row = Math.max(2, getLastVideoDataRow_(sheet) + 1);
    if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), row - sheet.getMaxRows());
    const values = new Array(sheet.getLastColumn()).fill('');
    values[h['Video ID'] - 1] = videoId;
    values[h['Publish Date'] - 1] = publishDate;
    values[h['Talent'] - 1] = teacher;
    values[h['Script'] - 1] = script;
    values[h['Priority'] - 1] = priority;
    values[h['Script Ready?'] - 1] = false;
    values[h['Production Status'] - 1] = 'Script Pending';
    values[h['QC Status'] - 1] = 'Not Ready';
    values[h['Posted?'] - 1] = false;
    values[h['Archived?'] - 1] = false;
    if (h['Recording Notes']) values[h['Recording Notes'] - 1] = editorBrief;
    if (h['Video Type']) values[h['Video Type'] - 1] = videoType;
    sheet.getRange(row, 1, 1, values.length).setValues([values]);
    touchStageMeta_(ss, sheet, row, h, 'Script Pending');
    log_(ss, 'API_VIDEO_CREATED', videoId, '', 'SUCCESS', `Teacher=${teacher} | Type=${videoType} | Priority=${priority}`, '');
    return { row };
  });
  apiInvalidateReadCache_();
  return { created: true, row: result.row, video: apiGetVideo_(ss, videoId) };
}

function apiUpdateScript_(ss, body) {
  const videoType = String(body.videoType || 'Original Recording').trim();
  const recordingScript = String(body.recordingScript !== undefined ? body.recordingScript : body.script || '').trim();
  const editorBrief = String(body.editorBrief || body.recordingNotes || '').trim();
  if (videoType === 'Original Recording' && !recordingScript) {
    throw apiError_('RECORDING_SCRIPT_REQUIRED', 'Recording Script is required for Original Recording.');
  }
  if (!editorBrief) throw apiError_('EDITOR_BRIEF_REQUIRED', 'Editor Brief is required.');
  const script = recordingScript || editorBrief;
  const videoId = apiManagerRequired_(body.videoId, 'videoId');
  apiManagerLock_(() => {
    const found = apiManagerFind_(ss, videoId);
    const current = apiGetVideo_(ss, videoId);
    if (current.posted || current.productionStatus === 'Uploaded') {
      throw apiError_('HISTORY_LOCKED', 'Uploaded history cannot be edited.');
    }
    if (current.rawFileUrl || ['Editing','Changes','QC Pending','Approved'].includes(current.productionStatus)) {
      throw apiError_('SCRIPT_LOCKED', 'Script is locked after RAW detection. Create a controlled revision instead.');
    }
    set_(found.sheet, found.row, found.h, 'Script', script);
    apiSetOptionalHeader_(found.sheet, found.row, found.h, 'Recording Notes', editorBrief);
    apiSetOptionalHeader_(found.sheet, found.row, found.h, 'Video Type', videoType);
    if (body.talent !== undefined) set_(found.sheet, found.row, found.h, 'Talent', apiManagerRequired_(body.talent, 'talent'));
    if (body.priority !== undefined) set_(found.sheet, found.row, found.h, 'Priority', apiManagerRequired_(body.priority, 'priority'));
    if (body.publishDate !== undefined) set_(found.sheet, found.row, found.h, 'Publish Date', apiManagerDate_(body.publishDate));
    if (current.scriptReady || current.productionStatus === 'Script Ready') {
      set_(found.sheet, found.row, found.h, 'Script Ready?', false);
      setProductionStatus_(ss, found.sheet, found.row, found.h, 'Script Pending');
    }
    log_(ss, 'API_SCRIPT_UPDATED', videoId, current.editor || '', 'SUCCESS', 'Manager updated script', '');
  });
  apiInvalidateReadCache_();
  return { updated: true, video: apiGetVideo_(ss, videoId) };
}

function apiApproveScript_(ss, body) {
  const videoId = apiManagerRequired_(body.videoId, 'videoId');
  if (body.script !== undefined) apiUpdateScript_(ss, body);
  apiManagerLock_(() => {
    const found = apiManagerFind_(ss, videoId);
    const current = apiGetVideo_(ss, videoId);
    if (current.rawFileUrl || ['Editing','Changes','QC Pending','Approved','Uploaded'].includes(current.productionStatus)) {
      throw apiError_('APPROVAL_LOCKED', 'Script approval is locked after production has started.');
    }
    set_(found.sheet, found.row, found.h, 'Script Ready?', true);
  });
  // processScriptReady_ owns its own ScriptLock and creates/reuses Drive folders.
  const found = apiManagerFind_(ss, videoId);
  processScriptReady_(ss, found.sheet, found.row);
  const video = apiGetVideo_(ss, videoId);
  if (!video.scriptReady || !video.rawFolderUrl || !video.finalFolderUrl) {
    throw apiError_('SCRIPT_APPROVAL_FAILED', video.blocker || 'Drive folders were not prepared.');
  }
  apiInvalidateReadCache_();
  return { approved: true, video };
}

function apiAssignEditor_(ss, body) {
  const videoId = apiManagerRequired_(body.videoId, 'videoId');
  const editor = apiManagerRequired_(body.editor, 'editor');
  apiManagerLock_(() => {
    const found = apiManagerFind_(ss, videoId);
    const current = apiGetVideo_(ss, videoId);
    if (current.posted || current.productionStatus === 'Uploaded') {
      throw apiError_('HISTORY_LOCKED', 'Uploaded history cannot be reassigned.');
    }
    const state = getEditorState_(ss, editor);
    if (!state || !state.active) throw apiError_('INVALID_EDITOR', `Editor is missing or inactive: ${editor}`);
    const oldEditor = String(found.sheet.getRange(found.row, found.h['Editor']).getValue() || '').trim();
    if (oldEditor === editor) return;
    set_(found.sheet, found.row, found.h, 'Editor', editor);
    processEditorReassignment_(ss, found.sheet, found.h, found.row, {
      range: found.sheet.getRange(found.row, found.h['Editor']),
      oldValue: oldEditor
    });
  });
  const video = apiGetVideo_(ss, videoId);
  if (video.editor !== editor) throw apiError_('ASSIGNMENT_FAILED', video.blocker || 'Editor assignment was rejected.');
  apiInvalidateReadCache_();
  return { assigned: true, video };
}

function apiDetectFinal_(ss, videoId, expectedEditor) {
  const id = apiManagerRequired_(videoId, 'videoId');
  const result = apiManagerLock_(() => {
    const found = apiManagerFind_(ss, id);
    const before = apiGetVideo_(ss, id);
    if(expectedEditor && String(before.editor).trim().toLowerCase()!==String(expectedEditor).trim().toLowerCase()) throw apiError_('ROLE_FORBIDDEN','This video is no longer assigned to you.');
    if (!['Editing','Changes'].includes(before.productionStatus)) {
      throw apiError_('FINAL_NOT_ALLOWED', 'FINAL detection is allowed only during Editing or Changes.');
    }
    const folderId = String(found.sheet.getRange(found.row, found.h['FINAL Folder ID']).getValue() || '').trim();
    if (!folderId) throw apiError_('FINAL_FOLDER_MISSING', 'FINAL folder is missing. Approve the script first.');
    const folder = DriveApp.getFolderById(folderId);
    const finalFile = latestVideo_(folder);
    if (!finalFile) return { detected: false, changed: false, video: before };
    const previousId = extractId_(before.finalFileUrl || '');
    if (previousId && previousId === finalFile.getId()) {
      return { detected: true, changed: false, video: before };
    }
    set_(found.sheet, found.row, found.h, 'Final File URL', finalFile.getUrl());
    const revisionNo = appendRevision_(ss, found.sheet, found.row, found.h, id, before.editor, finalFile);
    set_(found.sheet, found.row, found.h, 'QC Status', 'Pending Review');
    set_(found.sheet, found.row, found.h, 'QC Change Notes', '');
    setProductionStatus_(ss, found.sheet, found.row, found.h, 'QC Pending');
    clearAutoBlock_(found.sheet, found.row, found.h);
    recalculateEditorLoads_(ss);
    log_(ss, 'API_FINAL_DETECTED', id, before.editor || '', 'SUCCESS', `FINAL=${finalFile.getId()} | Revision=${revisionNo}`, '');
    return { detected: true, changed: true, video: apiGetVideo_(ss, id) };
  });
  apiInvalidateReadCache_();
  return result;
}

function apiQcDecision_(ss, body, outcome) {
  const videoId = apiManagerRequired_(body.videoId, 'videoId');
  const notes = String(body.notes || '').trim();
  if (outcome === 'Changes Required' && !notes) {
    throw apiError_('QC_NOTES_REQUIRED', 'Change notes are required.');
  }
  apiManagerLock_(() => {
    const found = apiManagerFind_(ss, videoId);
    const current = apiGetVideo_(ss, videoId);
    const expectedStatus=outcome==='Approved'?'Approved':'Changes';
    if(current.productionStatus===expectedStatus && current.qcStatus===outcome && String(current.qcChangeNotes || '')===notes) return;
    if (current.productionStatus !== 'QC Pending') {
      throw apiError_('QC_NOT_PENDING', 'QC decision requires QC Pending status.');
    }
    set_(found.sheet, found.row, found.h, 'QC Change Notes', notes);
    set_(found.sheet, found.row, found.h, 'QC Status', outcome);
    processQcChange_(ss, found.sheet, found.h, found.row);
  });
  const video = apiGetVideo_(ss, videoId);
  const expected = outcome === 'Approved' ? 'Approved' : 'Changes';
  if (video.productionStatus !== expected) throw apiError_('QC_UPDATE_FAILED', video.blocker || 'QC transition failed.');
  apiInvalidateReadCache_();
  return { outcome, video };
}

function apiMarkUploaded_(ss, body) {
  const videoId = apiManagerRequired_(body.videoId, 'videoId');
  const account = apiManagerRequired_(body.account, 'account');
  const postUrl = apiManagerRequired_(body.postUrl, 'postUrl');
  if (!/^https?:\/\//i.test(postUrl)) throw apiError_('INVALID_POST_URL', 'postUrl must be an http(s) URL.');
  apiManagerLock_(() => {
    const found = apiManagerFind_(ss, videoId);
    const current = apiGetVideo_(ss, videoId);
    if (current.productionStatus !== 'Approved') {
      throw apiError_('NOT_APPROVED', 'QC approval is required before confirming upload.');
    }
    set_(found.sheet, found.row, found.h, 'Account', account);
    set_(found.sheet, found.row, found.h, 'Post URL', postUrl);
    set_(found.sheet, found.row, found.h, 'Posted?', true);
    processPosted_(ss, found.sheet, found.h, found.row);
  });
  const video = apiGetVideo_(ss, videoId);
  if (!video.posted || video.productionStatus !== 'Uploaded') {
    throw apiError_('UPLOAD_CONFIRMATION_FAILED', video.blocker || 'Upload confirmation failed.');
  }
  apiInvalidateReadCache_();
  return { uploaded: true, video };
}


/**
 * Infinity Operations — Daily MIS email add-on
 * Paste this file below the canonical Code.gs source. It does not modify the
 * workflow schema. Configure MIS_RECIPIENT_EMAILS and run
 * setupDailyMisTrigger() once after review.
 */

const INFINITY_MIS = {
  RECIPIENT_KEY: 'MIS_RECIPIENT_EMAILS',
  CC_KEY: 'MIS_CC_EMAILS',
  SEND_HOUR_KEY: 'MIS_SEND_HOUR',
  CUSTOM_NOTE_KEY: 'MIS_CUSTOM_NOTE',
  DEFAULT_HOUR: 20,
  HANDLER: 'sendDailyCampaignMis'
};

function misHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].reduce((out, name, index) => {
    out[String(name || '').trim()] = index;
    return out;
  }, {});
}

function misConfig_(ss) {
  const sheet = ss.getSheetByName('CONFIG');
  const config = {};
  if (!sheet || sheet.getLastRow() < 2) return config;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.min(2, sheet.getLastColumn())).getDisplayValues().forEach(row => {
    const key = String(row[0] || '').trim();
    if (key) config[key] = String(row[1] || '').trim();
  });
  return config;
}

function misSpreadsheet_() {
  if (typeof getSS_ === 'function') return getSS_();
  const active = SpreadsheetApp.getActive();
  if (!active) throw new Error('Infinity spreadsheet is unavailable in this execution context.');
  return active;
}

function misNormalizeEmails_(value, required) {
  const emails = String(value || '')
    .split(/[;,]/)
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
  if (required && !emails.length) throw new Error('At least one MIS recipient email is required.');
  const invalid = emails.find(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  if (invalid) throw new Error(`Invalid MIS email address: ${invalid}`);
  return Array.from(new Set(emails)).join(',');
}

function misUpsertConfig_(ss, key, value, note) {
  const sheet = ss.getSheetByName('CONFIG');
  if (!sheet) throw new Error('CONFIG sheet not found.');
  const lastRow = Math.max(1, sheet.getLastRow());
  const keys = lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  const index = keys.findIndex(row => String(row[0] || '').trim() === key);
  const row = index >= 0 ? index + 2 : lastRow + 1;
  sheet.getRange(row, 1, 1, 3).setValues([[key, String(value ?? ''), note || '']]);
}

function getDailyMisSettings_(ss) {
  const config = misConfig_(ss);
  const trigger = ScriptApp.getProjectTriggers().find(item => item.getHandlerFunction() === INFINITY_MIS.HANDLER);
  return {
    recipients: String(config[INFINITY_MIS.RECIPIENT_KEY] || '').trim(),
    cc: String(config[INFINITY_MIS.CC_KEY] || '').trim(),
    sendHour: Math.max(0, Math.min(23, Number(config[INFINITY_MIS.SEND_HOUR_KEY] || INFINITY_MIS.DEFAULT_HOUR))),
    customNote: String(config[INFINITY_MIS.CUSTOM_NOTE_KEY] || '').trim(),
    triggerEnabled: Boolean(trigger),
    timezone: 'Asia/Kolkata',
    remainingDailyQuota: MailApp.getRemainingDailyQuota()
  };
}

function saveDailyMisSettings_(ss, body) {
  const recipients = misNormalizeEmails_(body && body.recipients, true);
  const cc = misNormalizeEmails_(body && body.cc, false);
  const sendHour = Number(body && body.sendHour);
  if (!Number.isInteger(sendHour) || sendHour < 0 || sendHour > 23) {
    throw new Error('MIS send hour must be a whole number from 0 to 23.');
  }
  const customNote = String((body && body.customNote) || '').trim().slice(0, 12000);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    misUpsertConfig_(ss, INFINITY_MIS.RECIPIENT_KEY, recipients, 'Daily MIS primary recipients; editable from the app');
    misUpsertConfig_(ss, INFINITY_MIS.CC_KEY, cc, 'Daily MIS CC recipients; editable from the app');
    misUpsertConfig_(ss, INFINITY_MIS.SEND_HOUR_KEY, sendHour, 'Daily MIS send hour in project timezone');
    misUpsertConfig_(ss, INFINITY_MIS.CUSTOM_NOTE_KEY, customNote, 'Optional management note included in the MIS email');
  } finally {
    lock.releaseLock();
  }
  return getDailyMisSettings_(ss);
}

function misEscapeHtml_(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function misDateKey_(value, tz) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  }
  const text = String(value || '').trim();
  if (!text) return '';
  if (/T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    const instant = new Date(text);
    return isNaN(instant.getTime()) ? '' : Utilities.formatDate(instant, tz, 'yyyy-MM-dd');
  }
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
  match = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(text);
  if (match) return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(text);
  if (match) {
    const months = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
    const month = months[match[2].toLowerCase()];
    if (month) return `${match[3]}-${String(month).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? '' : Utilities.formatDate(parsed, tz, 'yyyy-MM-dd');
}

function buildDailyCampaignMisData_(ss) {
  const sheet = ss.getSheetByName('VIDEOS');
  if (!sheet) throw new Error('VIDEOS sheet not found.');
  const tz = 'Asia/Kolkata';
  const today = new Date();
  const todayKey = Utilities.formatDate(today, tz, 'yyyy-MM-dd');
  const values = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const h = misHeaders_(sheet);
  const get = (row, header) => h[header] === undefined ? '' : row[h[header]];
  const rows = values.filter(row => String(get(row, 'Video ID') || '').trim() && String(get(row, 'Archived?')).toLowerCase() !== 'true');
  const todayRows = rows.filter(row => misDateKey_(get(row, 'Publish Date'), tz) === todayKey);
  const statusCount = list => list.reduce((out, row) => {
    const status = String(get(row, 'Production Status') || 'Unassigned').trim() || 'Unassigned';
    out[status] = (out[status] || 0) + 1;
    return out;
  }, {});
  const todayByStatus = statusCount(todayRows);
  const totalByStatus = statusCount(rows);
  const activityToday = rows.filter(row => misDateKey_(get(row, 'Stage Updated At'), tz) === todayKey).length;
  const overdue = rows.filter(row => String(get(row, 'SLA Status') || '').toLowerCase().includes('overdue')).length;
  const blocked = rows.filter(row => String(get(row, 'Blocker') || '').trim()).length;
  const uploadedTotal = Number(totalByStatus.Uploaded || 0);
  const remaining = Math.max(0, rows.length - uploadedTotal);
  const uploadedLast7 = rows.filter(row => {
    if (String(get(row, 'Production Status') || '') !== 'Uploaded') return false;
    const stamp = get(row, 'Stage Updated At');
    const date = stamp instanceof Date ? stamp : new Date(stamp);
    return !isNaN(date.getTime()) && (today.getTime() - date.getTime()) >= 0 && (today.getTime() - date.getTime()) < 7 * 86400000;
  }).length;
  const dailyVelocity = uploadedLast7 / 7;
  const expected7 = Math.min(remaining, Math.round(dailyVelocity * 7));
  const conservative7 = Math.min(remaining, Math.floor(expected7 * 0.75));
  const editingNow = Number(totalByStatus.Editing || 0) + Number(totalByStatus.Changes || 0);
  const stretch7 = Math.min(remaining, Math.max(expected7, editingNow + Number(totalByStatus['QC Pending'] || 0)));

  const activity = opsActivity_(ss);
  const channels = opsChannels_(ss);
  const exceptions = rows.filter(row => ['QC Pending','Changes'].includes(String(get(row,'Production Status'))) || String(get(row,'SLA Status')).toLowerCase().includes('overdue') || get(row,'Blocker')).map(row=>({
    videoId:get(row,'Video ID'), status:get(row,'Production Status'),
    notes:get(row,'QC Change Notes'), blocker:get(row,'Blocker'), due:get(row,'Due At') instanceof Date ? Utilities.formatDate(get(row,'Due At'),tz,'dd MMM HH:mm') : get(row,'Due At')
  }));
  // The management email reports manager-facing work evidence, not internal
  // staffing. A record is included when there was activity today, a stage move
  // today, or an upload-stage completion today.
  const activeVideoIds = new Set((activity.events || []).map(event => String(event.videoId || '')).filter(Boolean));
  const managerAssets = rows.filter(row => {
    const id = String(get(row,'Video ID') || '');
    return activeVideoIds.has(id) || misDateKey_(get(row,'Stage Updated At'),tz) === todayKey ||
      (String(get(row,'Production Status')) === 'Uploaded' && misDateKey_(get(row,'Stage Updated At'),tz) === todayKey);
  }).map(row => ({
    videoId: get(row,'Video ID'),
    title: get(row,'Title / Script Hook') || get(row,'Script Hook') || get(row,'Title') || '',
    status: get(row,'Production Status'),
    rawFolderUrl: apiFolderUrl_(get(row,'RAW Folder ID')),
    finalFolderUrl: apiFolderUrl_(get(row,'FINAL Folder ID')),
    rawFileUrl: get(row,'Raw File URL'),
    finalFileUrl: get(row,'Final File URL'),
    postUrl: get(row,'Post URL')
  }));
  return {
    activity, channels, managerAssets, exceptions,
    attentionUnique: rows.filter(row=>String(get(row,'SLA Status')).toLowerCase().includes('overdue') || String(get(row,'Blocker') || '').trim()).length,
    generatedAt: Utilities.formatDate(today, tz, 'dd MMM yyyy, hh:mm a'),
    dateLabel: Utilities.formatDate(today, tz, 'dd MMM yyyy'),
    plannedToday: todayRows.length,
    uploadedToday: rows.filter(row => String(get(row,'Production Status'))==='Uploaded' && misDateKey_(get(row,'Stage Updated At'),tz)===todayKey).length,
    scriptsToday: Number(todayByStatus['Script Pending'] || 0) + Number(todayByStatus['Script Ready'] || 0),
    editingToday: Number(todayByStatus.Editing || 0),
    qcToday: Number(todayByStatus['QC Pending'] || 0),
    changesToday: Number(todayByStatus.Changes || 0),
    approvedToday: Number(todayByStatus.Approved || 0),
    activityToday,
    overdue,
    blocked,
    totalVideos: rows.length,
    uploadedTotal,
    remaining,
    dailyVelocity: Number(dailyVelocity.toFixed(1)),
    projection: { conservative7, expected7, stretch7 },
    todayByStatus,
    totalByStatus
  };
}

function misMetricCard_(label, value, note, color) {
  return `<td style="width:25%;padding:6px;vertical-align:top"><div style="border:1px solid #fbcfe8;border-radius:12px;padding:14px;background:#fff"><div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:700">${label}</div><div style="font-size:26px;line-height:1.15;color:${color || '#be185d'};font-weight:800;margin-top:5px">${value}</div><div style="font-size:11px;color:#94a3b8;margin-top:4px">${note || ''}</div></div></td>`;
}

function buildDailyCampaignMisHtml_(data, customNote) {
  const completion = data.totalVideos ? Math.round((data.uploadedTotal / data.totalVideos) * 100) : 0;
  const safeCustomNote = misEscapeHtml_(customNote).replace(/\n/g, '<br>');
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)">
    <tr><td style="padding:26px 28px;background:linear-gradient(120deg,#831843,#db2777);color:#fff">
      <div style="font-size:11px;letter-spacing:.14em;font-weight:800;opacity:.8">INFINITY OPERATIONS · DAILY MIS</div>
      <h1 style="font-size:24px;line-height:1.2;margin:7px 0 4px">Daily Operational Governance &amp; Distribution Review</h1>
      <div style="font-size:13px;opacity:.82">${data.dateLabel} · Generated ${data.generatedAt}</div>
    </td></tr>
    <tr><td style="padding:22px 22px 10px">
      <div style="font-size:14px;font-weight:800;margin:0 6px 8px">Today at a glance</div>
      <table role="presentation" width="100%"><tr>
        ${misMetricCard_('Planned', data.plannedToday, 'Scheduled today', '#2563eb')}
        ${misMetricCard_('Uploaded', data.uploadedToday, 'Upload-stage timestamp today', '#059669')}
        ${misMetricCard_('Active Moves', data.activityToday, 'Stage updates today', '#7c3aed')}
        ${misMetricCard_('Attention', data.attentionUnique, `${data.overdue} overdue · ${data.blocked} blocked; may overlap`, '#dc2626')}
      </tr></table>
    </td></tr>
    <tr><td style="padding:10px 28px 18px">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px">Production pipeline</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <tr style="background:#f8fafc;color:#64748b;font-size:11px;text-transform:uppercase"><th align="left" style="padding:10px">Stage</th><th style="padding:10px">Scheduled today</th><th style="padding:10px">Campaign</th></tr>
        ${['Script Pending','Script Ready','Editing','QC Pending','Changes','Approved','Uploaded'].map(status => `<tr><td style="padding:9px 10px;border-top:1px solid #e2e8f0;font-size:13px;font-weight:700">${status}</td><td align="center" style="padding:9px;border-top:1px solid #e2e8f0">${data.todayByStatus[status] || 0}</td><td align="center" style="padding:9px;border-top:1px solid #e2e8f0">${data.totalByStatus[status] || 0}</td></tr>`).join('')}
      </table>
    </td></tr>
    <tr><td style="padding:0 28px 20px">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px">7-day delivery projection</div>
      <table role="presentation" width="100%"><tr>
        ${misMetricCard_('Conservative', data.projection.conservative7, '75% of current velocity', '#64748b')}
        ${misMetricCard_('Expected', data.projection.expected7, `${data.dailyVelocity}/day recent velocity`, '#be185d')}
        ${misMetricCard_('Stretch', data.projection.stretch7, 'Includes current Editing + QC', '#7c3aed')}
        ${misMetricCard_('Remaining', data.remaining, `${completion}% campaign complete`, '#0f172a')}
      </tr></table>
      <p style="font-size:11px;line-height:1.5;color:#64748b;margin:10px 6px 0">Projection is computed from the last 7 days’ completed uploads and current Editing/QC inventory. It is a planning estimate, not a guaranteed commitment.</p>
    </td></tr>
    ${misDetailedSections_(data)}
    ${safeCustomNote ? `<tr><td style="padding:0 28px 20px"><div style="padding:14px;border:1px solid #fbcfe8;border-radius:12px;background:#fff7fb;font-size:12px;line-height:1.55;color:#831843"><strong>Management commentary</strong><br>${safeCustomNote}</div></td></tr>` : ''}
    <tr><td style="padding:16px 28px;background:#fff1f2;color:#9f1239;font-size:12px;line-height:1.5"><strong>Manager focus:</strong> Clear ${data.overdue} overdue and ${data.blocked} blocked item(s); protect the next expected delivery window.</td></tr>
  </table></td></tr></table></body></html>`;
}

function sendDailyCampaignMis(options) {
  options = options || {};
  const automatic = !options.test;
  const deliveryLock = LockService.getScriptLock();
  if (automatic && !deliveryLock.tryLock(1000)) return {ok:false, skipped:true, reason:'Another send is in progress'};
  try {
  const ss = misSpreadsheet_();
  const config = misConfig_(ss);
  const recipients = misNormalizeEmails_(config[INFINITY_MIS.RECIPIENT_KEY], true);
  const cc = misNormalizeEmails_(config[INFINITY_MIS.CC_KEY], false);
  const data = buildDailyCampaignMisData_(ss);
  const sentKey = 'INFINITY_MIS_SENT_' + opsDay_(new Date());
  const properties = PropertiesService.getScriptProperties();
  if (automatic && properties.getProperty(sentKey)) return {ok:true, skipped:true, reason:'Already sent today'};
  const subject = `${options.test ? '[TEST] ' : ''}Infinity Daily MIS · ${data.dateLabel} · ${data.uploadedToday}/${data.plannedToday} uploaded`;
  MailApp.sendEmail({
    to: recipients,
    cc,
    subject,
    body: `Infinity Daily MIS for ${data.dateLabel}. Planned: ${data.plannedToday}, Uploaded: ${data.uploadedToday}, Remaining campaign: ${data.remaining}.`,
    htmlBody: buildDailyCampaignMisHtml_(data, config[INFINITY_MIS.CUSTOM_NOTE_KEY]),
    name: 'Infinity Operations'
  });
  if (automatic) properties.setProperty(sentKey,new Date().toISOString());
  return { ok: true, test: Boolean(options.test), recipients, cc, subject, data };
  } finally {if(automatic) deliveryLock.releaseLock();}
}

function setupDailyMisTrigger() {
  const ss = misSpreadsheet_();
  const config = misConfig_(ss);
  const hour = Math.max(0, Math.min(23, Number(config[INFINITY_MIS.SEND_HOUR_KEY] || INFINITY_MIS.DEFAULT_HOUR)));
  ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === INFINITY_MIS.HANDLER).forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger(INFINITY_MIS.HANDLER).timeBased().everyDays(1).atHour(hour).inTimezone('Asia/Kolkata').create();
  return { ok: true, handler: INFINITY_MIS.HANDLER, hour, timezone: 'Asia/Kolkata' };
}

function sendDailyCampaignMisTest() {
  return sendDailyCampaignMis({ test: true });
}

function previewDailyCampaignMisHtml() {
  const ss = misSpreadsheet_();
  const config = misConfig_(ss);
  return buildDailyCampaignMisHtml_(buildDailyCampaignMisData_(ss), config[INFINITY_MIS.CUSTOM_NOTE_KEY]);
}

function apiGetMisSettings_(ss) {
  return getDailyMisSettings_(ss);
}

function apiSaveMisSettings_(ss, body) {
  return saveDailyMisSettings_(ss, body || {});
}

function apiSendMisTest_() {
  return sendDailyCampaignMisTest();
}

function apiSetupMisTrigger_() {
  return setupDailyMisTrigger();
}


/** Infinity Operations: durable web action queue (Sheet-backed, no new database). */
var WEB_JOB_SHEET_ = 'WEB JOBS';
var WEB_JOB_HEADERS_ = ['Job ID','Request ID','Video ID','Action','Payload JSON','Status','Attempt Count','Max Attempts','Created At','Started At','Finished At','Next Attempt At','Last Error','Result JSON'];
// Drive folder preparation is slow and belongs in the durable queue. QC is a
// lightweight Sheet-only decision and is handled synchronously by apiQcDecision_.
var WEB_JOB_ALLOWED_ = { approve_script: true };

function webJobSheet_(ss) {
  var sh = ss.getSheetByName(WEB_JOB_SHEET_);
  if (!sh) {
    sh = ss.insertSheet(WEB_JOB_SHEET_);
    sh.getRange(1, 1, 1, WEB_JOB_HEADERS_.length).setValues([WEB_JOB_HEADERS_]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.hideSheet();
  }
  return sh;
}

function ensureInfinityWebJobWorker_() {
  var handlers = ScriptApp.getProjectTriggers().map(function(trigger) { return trigger.getHandlerFunction(); });
  if (handlers.indexOf('scanRawFast') >= 0) return { ready: true, handler: 'scanRawFast' };
  if (handlers.indexOf('processInfinityWebJobs_') >= 0) return { ready: true, handler: 'processInfinityWebJobs_' };
  ScriptApp.newTrigger('processInfinityWebJobs_').timeBased().everyMinutes(1).create();
  return { ready: true, handler: 'processInfinityWebJobs_', created: true };
}

function apiQueueWebAction_(ss, body) {
  var queuedAction = String(body.queuedAction || '').trim();
  var requestId = String(body.requestId || '').trim();
  var videoId = String(body.videoId || '').trim();
  if (!WEB_JOB_ALLOWED_[queuedAction]) throw new Error('This action cannot be queued.');
  if (!requestId || !videoId) throw new Error('requestId and videoId are required.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = webJobSheet_(ss);
    var worker = ensureInfinityWebJobWorker_();
    var last = sh.getLastRow();
    if (last > 1) {
      var ids = sh.getRange(2, 2, last - 1, 1).getDisplayValues();
      for (var i = 0; i < ids.length; i++) {
        if (ids[i][0] === requestId) {
          var existing = webJobObject_(sh.getRange(i + 2, 1, 1, WEB_JOB_HEADERS_.length).getValues()[0]);
          existing.worker = worker;
          return existing;
        }
      }
    }
    var jobId = Utilities.getUuid();
    if(last>1) {
      var pendingRows=sh.getRange(2,1,last-1,WEB_JOB_HEADERS_.length).getValues();
      for(var p=0;p<pendingRows.length;p++) {
        var pending=pendingRows[p];
        if(String(pending[2])===videoId && ['Pending','Processing'].indexOf(String(pending[5]))>=0) {
          if(String(pending[3])!==queuedAction) throw new Error('This video already has a pending action. Check Sync & Retries.');
          var same=webJobObject_(pending);same.worker=worker;return same;
        }
      }
    }
    var now = new Date();
    sh.appendRow([jobId, requestId, videoId, queuedAction, JSON.stringify(body.payload || {}), 'Pending', 0, 5, now, '', '', now, '', '']);
    return { ok: true, queued: true, jobId: jobId, requestId: requestId, status: 'Pending', attemptCount: 0, maxAttempts: 5, createdAt: now.toISOString(), worker: worker };
  } finally { lock.releaseLock(); }
}

function apiGetWebJobStatus_(ss, body) {
  var jobId = String(body.jobId || '').trim();
  if (!jobId) throw new Error('jobId is required.');
  var sh = webJobSheet_(ss);
  var last = sh.getLastRow();
  if (last < 2) throw new Error('Job not found.');
  var rows = sh.getRange(2, 1, last - 1, WEB_JOB_HEADERS_.length).getValues();
  for (var i = rows.length - 1; i >= 0; i--) if (String(rows[i][0]) === jobId) return webJobObject_(rows[i]);
  throw new Error('Job not found.');
}

function apiListWebJobs_(ss) {
  var sh = webJobSheet_(ss);
  var last = sh.getLastRow();
  var jobs = last < 2 ? [] : sh.getRange(Math.max(2, last - 99), 1, Math.min(100, last - 1), WEB_JOB_HEADERS_.length).getValues().map(webJobObject_).reverse();
  var counts = { Pending: 0, Processing: 0, Completed: 0, Failed: 0 };
  jobs.forEach(function(job) { counts[job.status] = Number(counts[job.status] || 0) + 1; });
  return { ok: true, jobs: jobs, counts: counts, worker: ensureInfinityWebJobWorker_(), refreshedAt: new Date().toISOString() };
}

function apiRetryWebJob_(ss, body) {
  var jobId = String(body.jobId || '').trim();
  if (!jobId) throw new Error('jobId is required.');
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var sh = webJobSheet_(ss), last = sh.getLastRow();
    if (last < 2) throw new Error('Job not found.');
    var ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (ids[i][0] !== jobId) continue;
      var row = i + 2, status = String(sh.getRange(row, 6).getDisplayValue());
      if (status === 'Completed') return webJobObject_(sh.getRange(row, 1, 1, WEB_JOB_HEADERS_.length).getValues()[0]);
      sh.getRange(row, 6, 1, 8).setValues([['Pending', 0, 5, sh.getRange(row, 9).getValue(), '', '', new Date(), '']]);
      ensureInfinityWebJobWorker_();
      return webJobObject_(sh.getRange(row, 1, 1, WEB_JOB_HEADERS_.length).getValues()[0]);
    }
    throw new Error('Job not found.');
  } finally { lock.releaseLock(); }
}

function webJobObject_(r) {
  return { ok: true, jobId: String(r[0]), requestId: String(r[1]), videoId: String(r[2]), queuedAction: String(r[3]), status: String(r[5]), attemptCount: Number(r[6] || 0), maxAttempts: Number(r[7] || 5), createdAt: webJobIso_(r[8]), startedAt: webJobIso_(r[9]), finishedAt: webJobIso_(r[10]), nextAttemptAt: webJobIso_(r[11]), error: String(r[12] || '') };
}

function webJobIso_(value) { return value instanceof Date ? value.toISOString() : String(value || ''); }

function processInfinityWebJobs_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = webJobSheet_(ss);
  for (var processed = 0; processed < 5; processed++) {
    var claim = claimNextWebJob_(sh);
    if (!claim) return;
    try {
      var payload = JSON.parse(claim.payloadJson || '{}');
      var body = Object.assign({}, payload, { videoId: claim.videoId, requestId: claim.requestId });
      var result;
      if (claim.action === 'approve_script') result = apiApproveScript_(ss, body);
      else throw new Error('Unsupported queued action: ' + claim.action);
      finishWebJob_(sh, claim.row, 'Completed', '', result);
    } catch (err) {
      var terminal = claim.attempt >= claim.maxAttempts;
      finishWebJob_(sh, claim.row, terminal ? 'Failed' : 'Pending', String(err && err.message || err), null, terminal ? null : new Date(Date.now() + Math.min(600000, Math.pow(2, claim.attempt - 1) * 60000)));
    }
  }
}

function claimNextWebJob_(sh) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var last = sh.getLastRow(); if (last < 2) return null;
    var rows = sh.getRange(2, 1, last - 1, WEB_JOB_HEADERS_.length).getValues();
    var now = new Date();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i], status = String(r[5]), next = r[11] instanceof Date ? r[11] : new Date(0), attempt = Number(r[6] || 0), max = Number(r[7] || 5);
      if(status==='Processing' && r[9] instanceof Date && now.getTime()-r[9].getTime()>7*60000) {
        status=attempt<max?'Pending':'Failed';
        sh.getRange(i+2,6).setValue(status);
        sh.getRange(i+2,13).setValue('Worker execution expired; retry scheduled.');
      }
      if (status === 'Pending' && attempt < max && next <= now) {
        sh.getRange(i + 2, 6, 1, 7).setValues([['Processing', attempt + 1, max, r[8], now, '', r[11]]]);
        SpreadsheetApp.flush();
        return { row: i + 2, requestId: String(r[1]), videoId: String(r[2]), action: String(r[3]), payloadJson: String(r[4] || '{}'), attempt: attempt + 1, maxAttempts: max };
      }
    }
    return null;
  } finally { lock.releaseLock(); }
}

function finishWebJob_(sh, row, status, error, result, nextAttempt) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    sh.getRange(row, 6).setValue(status);
    sh.getRange(row, 11).setValue(status === 'Completed' || status === 'Failed' ? new Date() : '');
    sh.getRange(row, 12).setValue(nextAttempt || '');
    sh.getRange(row, 13).setValue(error || '');
    sh.getRange(row, 14).setValue(result ? JSON.stringify(result) : '');
  } finally { lock.releaseLock(); }
}


/** Infinity Operations: prebuilt web snapshots for fast Sheet-backed reads. */
var WEB_SNAPSHOT_SHEET_ = 'WEB SNAPSHOTS';
var WEB_SNAPSHOT_HEADERS_ = ['Resource','Part','Total Parts','Generated At','Compressed Payload'];
var WEB_SNAPSHOT_CHUNK_ = 40000;

function webSnapshotSheet_(ss) {
  var sh = ss.getSheetByName(WEB_SNAPSHOT_SHEET_);
  if (!sh) {
    sh = ss.insertSheet(WEB_SNAPSHOT_SHEET_);
    sh.getRange(1, 1, 1, WEB_SNAPSHOT_HEADERS_.length).setValues([WEB_SNAPSHOT_HEADERS_]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.hideSheet();
  }
  return sh;
}

function ensureInfinitySnapshotWorker_() {
  var handler = 'refreshInfinityWebSnapshots';
  var exists = ScriptApp.getProjectTriggers().some(function(trigger) { return trigger.getHandlerFunction() === handler; });
  if (!exists) ScriptApp.newTrigger(handler).timeBased().everyMinutes(1).create();
  return { ready: true, handler: handler, created: !exists };
}

function webSnapshotChunks_(resource, value, generatedAt) {
  var json = JSON.stringify(value);
  var compressed = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(json, 'application/json', resource + '.json')).getBytes());
  var total = Math.max(1, Math.ceil(compressed.length / WEB_SNAPSHOT_CHUNK_));
  var rows = [];
  for (var i = 0; i < total; i++) rows.push([resource, i + 1, total, generatedAt, compressed.slice(i * WEB_SNAPSHOT_CHUNK_, (i + 1) * WEB_SNAPSHOT_CHUNK_)]);
  return rows;
}

function refreshInfinityWebSnapshots() {
  return refreshInfinityWebSnapshots_(getSS_());
}

function refreshInfinityWebSnapshots_(ss) {
  var startedAt = Date.now();
  var bootstrap = apiDispatchUncachedRead_(ss, 'bootstrap', { limit: 500 });
  var generatedAt = new Date();
  var rows = [];
  rows = rows.concat(webSnapshotChunks_('bootstrap', bootstrap, generatedAt));
  rows = rows.concat(webSnapshotChunks_('dashboard', bootstrap.dashboard || {}, generatedAt));
  rows = rows.concat(webSnapshotChunks_('videos', bootstrap.videos || [], generatedAt));
  rows = rows.concat(webSnapshotChunks_('editor_load', bootstrap.editorLoad || [], generatedAt));
  var sh = webSnapshotSheet_(ss);
  if (sh.getMaxRows() < rows.length + 1) sh.insertRowsAfter(sh.getMaxRows(), rows.length + 1 - sh.getMaxRows());
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, WEB_SNAPSHOT_HEADERS_.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, WEB_SNAPSHOT_HEADERS_.length).setValues(rows);
  CacheService.getScriptCache().remove('infinity_web_snapshot_memory');
  return { ok: true, generatedAt: generatedAt.toISOString(), resources: 4, parts: rows.length, durationMs: Date.now() - startedAt };
}

function apiReadWebSnapshot_(ss, body) {
  var resource = String(body && body.resource || '').trim().toLowerCase();
  if (['bootstrap','dashboard','videos','editor_load'].indexOf(resource) < 0) throw new Error('Unsupported snapshot resource.');
  var sh = webSnapshotSheet_(ss);
  var result = webSnapshotFromSheet_(sh, resource);
  if (!result || result.ageMs > 180000) ensureInfinitySnapshotWorker_();
  if (!result) {
    refreshInfinityWebSnapshots_(ss);
    result = webSnapshotFromSheet_(sh, resource);
  }
  if (!result) throw new Error('Snapshot could not be generated.');
  return result;
}

function webSnapshotFromSheet_(sh, resource) {
  var last = sh.getLastRow();
  if (last < 2) return null;
  var rows = sh.getRange(2, 1, last - 1, WEB_SNAPSHOT_HEADERS_.length).getValues().filter(function(row) { return String(row[0]) === resource; });
  if (!rows.length) return null;
  rows.sort(function(a, b) { return Number(a[1]) - Number(b[1]); });
  var expected = Number(rows[0][2] || 0);
  if (!expected || rows.length !== expected) return null;
  var encoded = rows.map(function(row) { return String(row[4] || ''); }).join('');
  var json = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(encoded), 'application/gzip', resource + '.json.gz')).getDataAsString('UTF-8');
  var generated = rows[0][3] instanceof Date ? rows[0][3] : new Date(rows[0][3]);
  return { ok: true, resource: resource, data: JSON.parse(json), generatedAt: generated.toISOString(), ageMs: Math.max(0, Date.now() - generated.getTime()) };
}


/** Operations workspace v4. All reads/writes use the existing spreadsheet. */
function opsLoginRecord_(ss, body) {
  const name=String(body.username || '').trim().toLowerCase();
  const matches=opsRows_(ss,'USERS').filter(r=>String(r['Login ID']).trim().toLowerCase()===name && (r.Active===true || String(r.Active).toLowerCase()==='true'));
  if(matches.length!==1) return {};
  const r=matches[0];
  return {username:name,role:String(r.Role).toLowerCase(),editor:String(r.Editor || ''),salt:String(r['Password Salt'] || ''),hash:String(r['Password Hash'] || '')};
}

function opsEditorDispatch_(ss, action, body) {
  const actor=body.actor;
  // Recheck the directory on every request: disabling a user takes effect now.
  const record=opsLoginRecord_(ss,{username:actor.username});
  if(record.role!=='editor' || record.editor!==actor.editor) throw new Error('Editor account is inactive or has changed. Please log in again.');
  if(action==='record_ui_activity') return opsRecordUi_(ss,body);
  const context=apiLoadVideoContext_(ss);
  const own=context.items.filter(v=>String(v.editor).trim().toLowerCase()===String(record.editor).trim().toLowerCase());
  if(action==='bootstrap') return {videos:{items:own,total:own.length},editorLoad:[],identity:{role:'editor',editor:record.editor}};
  if(action==='videos') return {items:own,total:own.length};
  const video=own.find(v=>v.videoId===String(body.videoId));
  if(!video) throw new Error('This video is not assigned to your editor account.');
  if(action==='video') return apiGetVideo_(ss,video.videoId);
  if(action==='detect_final') return apiDetectFinal_(ss,video.videoId,record.editor);
  throw new Error('Only a manager can perform this action.');
}

function setupInfinityUserDirectory() {
  const ss=getSS_();
  let sh=ss.getSheetByName('USERS');
  if(sh) return {ok:true,message:'USERS already exists; no data changed.'};
  sh=ss.insertSheet('USERS');
  sh.appendRow(['Login ID','Display Name','Role','Editor','Active','Password Salt','Password Hash']);
  sh.setFrozenRows(1);sh.hideSheet();
  sh.getRange('C2:C200').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['manager','editor'],true).setAllowInvalid(false).build());
  sh.getRange('E2:E200').insertCheckboxes();
  return {ok:true,message:'USERS created. Generate unique credentials with scripts/create-user.js; passwords are not stored here.'};
}

function opsRows_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const headers = values.shift().map(String);
  return values.filter(row => row.some(v => v !== '')).map(row => headers.reduce((o, h, i) => { o[h] = row[i]; return o; }, {}));
}

function opsDay_(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
}

function opsActivity_(ss) {
  const day = opsDay_(new Date());
  const events = opsRows_(ss, 'LOGS').filter(r => opsDay_(r.Timestamp) === day).map(r => ({
    at: r.Timestamp instanceof Date ? r.Timestamp.toISOString() : String(r.Timestamp || ''),
    action: String(r.Action || ''), videoId: String(r['Video ID'] || ''),
    editor: String(r.Editor || ''), status: String(r.Status || ''),
    details: String(r.Details || ''), error: String(r.Error || '')
  }));
  const context = apiLoadVideoContext_(ss);
  const touched = context.items.filter(v => [v.stageUpdatedAt, v.assignmentUpdatedAt].some(t => opsDay_(t) === day));
  const ids = new Set(touched.map(v => v.videoId));
  events.forEach(e => { if (e.videoId) ids.add(e.videoId); });
  return { day, timezone: 'Asia/Kolkata', eventCount: events.length, videoCount: ids.size,
    events: events.sort((a,b) => String(b.at).localeCompare(String(a.at))),
    videos: context.items.filter(v => ids.has(v.videoId)),
    definition: 'Recorded workflow events and timestamped stage/assignment changes. Events are not equivalent to completed videos.' };
}

function opsRecordUi_(ss,body) {
  const events=Array.isArray(body.events)?body.events.slice(0,20):[];
  if(!events.length) return {recorded:0};
  const sh=ss.getSheetByName('LOGS');
  if(!sh) throw new Error('Activity log is missing.');
  const lock=LockService.getScriptLock();lock.waitLock(5000);
  try {
    const rows=events.map(e=>[new Date(),'UI_CLICK','',String(body.actor?.username || 'manager'),'REQUESTED',String(e.label || '').slice(0,120)+' | '+String(e.page || '').slice(0,80),'']);
    sh.getRange(sh.getLastRow()+1,1,rows.length,7).setValues(rows);
    return {recorded:rows.length};
  }finally{lock.releaseLock();}
}

function opsChannels_(ss) {
  return { accounts: opsRows_(ss, 'ACCOUNTS').filter(r => r['Account ID']).map(r => ({
    accountId: String(r['Account ID']), handle: String(r['Username / Channel'] || ''),
    platform: String(r.Platform || ''), status: String(r.Status || ''),
    url: String(r['Profile URL'] || '') || (String(r.Notes || '').match(/https:\/\/www\.instagram\.com\/[A-Za-z0-9._]+\//) || [''])[0],
    apiConnected: false
  })), posts: opsRows_(ss, 'DISTRIBUTION').map(r => ({
    distributionId: String(r['Distribution ID'] || ''), videoId: String(r['Video ID'] || ''),
    account: String(r.Account || ''), status: String(r['Upload Status'] || ''),
    url: String(r['Post URL'] || ''), uploadedAt: r['Uploaded At'] instanceof Date ? r['Uploaded At'].toISOString() : String(r['Uploaded At'] || '')
  })), metrics: opsRows_(ss, 'CHANNEL METRICS').map(r => ({
    date: opsDay_(r.Date), accountId: String(r['Account ID'] || ''),
    views: r.Views === '' ? null : Number(r.Views), reach: r.Reach === '' ? null : Number(r.Reach),
    source: 'Manual'
  })) };
}

function opsSavePost_(ss, body) {
  const videoId = String(body.videoId || '').trim();
  const accountId = String(body.accountId || '').trim();
  const url = String(body.url || '').trim();
  const uploadedAt = new Date(body.uploadedAt);
  if (!/^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?(?:\?[^\s]*)?$/.test(url)) throw new Error('Enter a valid Instagram post or reel URL.');
  if (isNaN(uploadedAt.getTime()) || uploadedAt.getTime() > Date.now() + 60000) throw new Error('Choose a valid publication time, not a future time.');
  const account = opsRows_(ss, 'ACCOUNTS').find(r => String(r['Account ID']) === accountId && r.Platform === 'Instagram');
  if (!account) throw new Error('Instagram account was not found.');
  const video = apiGetVideo_(ss, videoId);
  if (!['Approved','Uploaded'].includes(video.productionStatus)) throw new Error('The video must pass manager QC before publication is recorded.');
  const sh = ss.getSheetByName('DISTRIBUTION');
  if (!sh) throw new Error('DISTRIBUTION sheet is missing.');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const h = misHeaders_(sh);
    const rows = sh.getLastRow() < 2 ? [] : sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();
    const name = String(account['Username / Channel']);
    const index = rows.findIndex(r => String(r[h['Video ID']]) === videoId && [name,accountId].includes(String(r[h.Account])));
    const rowNumber = index < 0 ? sh.getLastRow()+1 : index+2;
    const values = index < 0 ? Array(sh.getLastColumn()).fill('') : rows[index];
    const fields = {'Distribution ID': values[h['Distribution ID']] || Utilities.getUuid(), 'Video ID': videoId,
      Account: name, Editor: video.editor || '', 'Upload Status': 'Uploaded', 'Post URL': url, 'Uploaded At': uploadedAt};
    Object.keys(fields).forEach(k => { if (h[k] === undefined) throw new Error('Missing distribution column: '+k); values[h[k]]=fields[k]; });
    sh.getRange(rowNumber,1,1,values.length).setValues([values]);
    log_(ss,'PUBLICATION_RECORDED',videoId,video.editor || '','SUCCESS',name+' | '+url,'');
    apiInvalidateReadCache_();
    return {saved:true, distributionId:fields['Distribution ID'], videoId, accountId};
  } finally { lock.releaseLock(); }
}

function opsSaveMetrics_(ss, body) {
  const accountId=String(body.accountId || '');
  const date=String(body.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || opsDay_(date+'T12:00:00+05:30') !== date || date > opsDay_(new Date())) throw new Error('Choose a valid metrics date up to today.');
  if (!opsRows_(ss,'ACCOUNTS').some(r=>String(r['Account ID'])===accountId)) throw new Error('Account was not found.');
  const metric = value => {
    if (value === '' || value === null || value === undefined) return '';
    const n=Number(value); if(!Number.isSafeInteger(n)||n<0) throw new Error('Views and reach must be non-negative whole numbers.'); return n;
  };
  const views=metric(body.views), reach=metric(body.reach);
  if(views==='' && reach==='') throw new Error('Enter views or reach. Leave unavailable metrics blank.');
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    let sh=ss.getSheetByName('CHANNEL METRICS');
    if(!sh) { sh=ss.insertSheet('CHANNEL METRICS'); sh.appendRow(['Date','Account ID','Views','Reach','Source','Updated At']); sh.setFrozenRows(1); }
    const rows=sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,6).getValues();
    const i=rows.findIndex(r=>opsDay_(r[0])===date && String(r[1])===accountId);
    sh.getRange(i<0?sh.getLastRow()+1:i+2,1,1,6).setValues([[date,accountId,views,reach,'Manual',new Date()]]);
    log_(ss,'PAGE_METRICS_RECORDED','','','SUCCESS',accountId+' | '+date+' | manual observation','');
    return {saved:true,date,accountId};
  } finally {lock.releaseLock();}
}

function opsMisPreview_(ss, body) {
  const data=buildDailyCampaignMisData_(ss);
  const settings=getDailyMisSettings_(ss);
  return {data, html:buildDailyCampaignMisHtml_(data, body.customNote === undefined ? settings.customNote : String(body.customNote).slice(0,12000))};
}

function misDetailedSections_(data) {
  const esc=misEscapeHtml_;
  const section=(title,body)=>`<tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.65"><h2 style="font-size:16px;margin:0 0 10px">${title}</h2>${body}</td></tr>`;
  const table=(headers,rows)=>`<table width="100%" cellspacing="0" style="border-collapse:collapse;font-size:11px"><thead><tr>${headers.map(h=>`<th align="left" style="padding:7px;background:#f1f5f9">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map(v=>`<td style="padding:7px;border-bottom:1px solid #e2e8f0;vertical-align:top;overflow-wrap:anywhere">${esc(v===null?'Not recorded':v)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" style="padding:10px">No records available for this reporting section.</td></tr>`}</tbody></table>`;
  const a=data.activity || {events:[],videoCount:0,eventCount:0,day:''};
  const ch=data.channels || {accounts:[],posts:[],metrics:[]};
  const todayPosts=ch.posts.filter(p=>p.status==='Uploaded' && opsDay_(p.uploadedAt)===a.day);
  const assetLink=(url,label)=>{
    const value=String(url || '').trim();
    return /^https:\/\/[^\s]+$/i.test(value) ? `<a href="${esc(value)}" style="color:#be185d;font-weight:700">${esc(label)}</a>` : 'Not recorded';
  };
  const assetTable=(rows)=>`<table width="100%" cellspacing="0" style="border-collapse:collapse;font-size:11px"><thead><tr><th align="left" style="padding:7px;background:#f1f5f9">Video</th><th align="left" style="padding:7px;background:#f1f5f9">Stage</th><th align="left" style="padding:7px;background:#f1f5f9">RAW</th><th align="left" style="padding:7px;background:#f1f5f9">FINAL</th><th align="left" style="padding:7px;background:#f1f5f9">Publication</th></tr></thead><tbody>${rows.length?rows.map(v=>`<tr><td style="padding:7px;border-bottom:1px solid #e2e8f0;vertical-align:top"><strong>${esc(v.videoId)}</strong>${v.title?`<br><span style="color:#64748b">${esc(v.title)}</span>`:''}</td><td style="padding:7px;border-bottom:1px solid #e2e8f0">${esc(v.status || 'Not recorded')}</td><td style="padding:7px;border-bottom:1px solid #e2e8f0">${assetLink(v.rawFolderUrl,'RAW folder')}<br>${assetLink(v.rawFileUrl,'RAW file')}</td><td style="padding:7px;border-bottom:1px solid #e2e8f0">${assetLink(v.finalFolderUrl,'FINAL folder')}<br>${assetLink(v.finalFileUrl,'FINAL file')}</td><td style="padding:7px;border-bottom:1px solid #e2e8f0">${assetLink(v.postUrl,'Open post')}</td></tr>`).join(''):`<tr><td colspan="5" style="padding:10px">No manager-facing asset evidence was recorded; RAW and FINAL links are Not recorded.</td></tr>`}</tbody></table>`;
  return section('01 · Operational execution and evidence basis',`<p>This memorandum consolidates production-stage inventory, timestamped operational activity, quality-control disposition and distribution evidence for the India reporting date. The execution register contains <strong>${a.eventCount} recorded events</strong> involving <strong>${a.videoCount} distinct videos</strong>. These measures describe observed activity; repeated actions, retries and failures do not constitute additional completed deliverables.</p><p>Scheduling and execution are reported separately. A zero in the scheduled cohort means no matching publish-date records were identified; it does not establish that no work occurred. Outstanding inventory remains visible regardless of the planned publication date.</p>`)
    +section('02 · Manager-facing RAW and FINAL asset register',`<p>This register identifies today’s recorded work and provides direct source/final-folder evidence for management review. Internal staffing details are intentionally excluded.</p>`+assetTable(data.managerAssets || []))
    +section('03 · Quality assurance and exception register',`<p>${(data.exceptions||[]).length} records meet the QC, revision, overdue or blocker criteria. The following register shows the first 100; remaining records remain available in All Videos.</p>`+table(['Video','Stage','Revision / blocker','Due'],(data.exceptions||[]).slice(0,100).map(v=>[v.videoId,v.status,[v.notes,v.blocker].filter(Boolean).join(' | '),v.due])))
    +section('04 · Publication evidence register',`<p>${todayPosts.length} publication records have a timestamp within this reporting date, covering ${new Set(todayPosts.map(p=>p.videoId)).size} unique videos. Channel-level reporting and platform metrics remain out of this manager email until channel operations are activated.</p>`+table(['Video','Post URL'],todayPosts.map(p=>[p.videoId,p.url])))
    +section('05 · Recorded operational activity appendix',`<p>Latest ${Math.min(200,a.events.length)} of ${a.events.length} recorded events today. Status and errors are retained. System checks and button requests, where recorded, must not be interpreted as successful production outcomes.</p>`+table(['Time / action','Video','Outcome','Recorded detail'],a.events.slice(0,200).map(e=>[e.at+' / '+e.action,e.videoId,e.status,[e.details,e.error].filter(Boolean).join(' | ')])))
    +section('06 · Measurement definitions and reporting limitations','<p><strong>Planned:</strong> videos with today’s publish date. <strong>Active moves:</strong> videos whose latest stage timestamp falls today; historical intermediate transitions require the event register. <strong>Uploaded today:</strong> videos currently marked Uploaded with a stage timestamp today. <strong>Publication evidence:</strong> separate distribution rows with a recorded post URL and upload timestamp. The manager email excludes internal editor staffing and channel-level analysis. <strong>Projection:</strong> recent recorded throughput, constrained by remaining inventory; the stretch scenario is an inventory scenario rather than a forecast commitment.</p><p>All timestamps are interpreted in Asia/Kolkata. Historical clicks not previously logged cannot be reconstructed. Records entered after the scheduled send appear in the next generated preview; an already-sent email is not retrospectively modified.</p>');
}


/** Infinity Operations: durable web action queue (Sheet-backed, no new database). */
var WEB_JOB_SHEET_ = 'WEB JOBS';
var WEB_JOB_HEADERS_ = ['Job ID','Request ID','Video ID','Action','Payload JSON','Status','Attempt Count','Max Attempts','Created At','Started At','Finished At','Next Attempt At','Last Error','Result JSON'];
var WEB_JOB_ALLOWED_ = { approve_script: true, qc_approve: true };

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
    var last = sh.getLastRow();
    if (last > 1) {
      var ids = sh.getRange(2, 2, last - 1, 1).getDisplayValues();
      for (var i = 0; i < ids.length; i++) {
        if (ids[i][0] === requestId) return webJobObject_(sh.getRange(i + 2, 1, 1, WEB_JOB_HEADERS_.length).getValues()[0]);
      }
    }
    var jobId = Utilities.getUuid();
    var now = new Date();
    sh.appendRow([jobId, requestId, videoId, queuedAction, JSON.stringify(body.payload || {}), 'Pending', 0, 5, now, '', '', now, '', '']);
    return { ok: true, queued: true, jobId: jobId, requestId: requestId, status: 'Pending', attemptCount: 0, maxAttempts: 5, createdAt: now.toISOString() };
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
      else if (claim.action === 'qc_approve') result = apiQcDecision_(ss, body, 'Approved');
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

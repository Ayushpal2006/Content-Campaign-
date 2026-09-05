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
  var compressed = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(json, 'application/json')).getBytes());
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
  var json = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(encoded))).getDataAsString();
  var generated = rows[0][3] instanceof Date ? rows[0][3] : new Date(rows[0][3]);
  return { ok: true, resource: resource, data: JSON.parse(json), generatedAt: generated.toISOString(), ageMs: Math.max(0, Date.now() - generated.getTime()) };
}

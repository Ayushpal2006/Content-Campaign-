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

function apiCachedRead_(action, body, producer) {
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
        videos: apiListVideosFromContext_(context, body)
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
  let todayTotal = 0;

  (context.items || []).forEach(item => {
    if (!item || !item.publishDate) return;
    let itemKey = '';
    try {
      const date = item.publishDate instanceof Date ? item.publishDate : new Date(item.publishDate);
      if (!isNaN(date.getTime())) itemKey = Utilities.formatDate(date, tz, 'yyyy-MM-dd');
    } catch (_) {}
    if (itemKey !== todayKey) return;
    todayTotal++;
    const status = String(item.productionStatus || 'Unassigned').trim() || 'Unassigned';
    todayByStatus[status] = (todayByStatus[status] || 0) + 1;
  });

  dashboard.todayTotal = todayTotal;
  dashboard.todayByStatus = todayByStatus;
  dashboard.todayUploaded = Number(todayByStatus.Uploaded || 0);
  return dashboard;
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

function apiDetectFinal_(ss, videoId) {
  const id = apiManagerRequired_(videoId, 'videoId');
  const result = apiManagerLock_(() => {
    const found = apiManagerFind_(ss, id);
    const before = apiGetVideo_(ss, id);
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

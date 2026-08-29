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
  DEFAULT_HOUR: 22,
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

function misDateKey_(value, tz) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? '' : Utilities.formatDate(date, tz, 'yyyy-MM-dd');
}

function buildDailyCampaignMisData_(ss) {
  const sheet = ss.getSheetByName('VIDEOS');
  if (!sheet) throw new Error('VIDEOS sheet not found.');
  const tz = Session.getScriptTimeZone() || 'Asia/Kolkata';
  const today = new Date();
  const todayKey = Utilities.formatDate(today, tz, 'yyyy-MM-dd');
  const values = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const h = misHeaders_(sheet);
  const get = (row, header) => h[header] === undefined ? '' : row[h[header]];
  const rows = values.filter(row => String(get(row, 'Video ID') || '').trim() && get(row, 'Archived?') !== true);
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

  return {
    generatedAt: Utilities.formatDate(today, tz, 'dd MMM yyyy, hh:mm a'),
    dateLabel: Utilities.formatDate(today, tz, 'dd MMM yyyy'),
    plannedToday: todayRows.length,
    uploadedToday: Number(todayByStatus.Uploaded || 0),
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

function buildDailyCampaignMisHtml_(data) {
  const completion = data.totalVideos ? Math.round((data.uploadedTotal / data.totalVideos) * 100) : 0;
  const todayCompletion = data.plannedToday ? Math.round((data.uploadedToday / data.plannedToday) * 100) : 0;
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)">
    <tr><td style="padding:26px 28px;background:linear-gradient(120deg,#831843,#db2777);color:#fff">
      <div style="font-size:11px;letter-spacing:.14em;font-weight:800;opacity:.8">INFINITY OPERATIONS · DAILY MIS</div>
      <h1 style="font-size:24px;line-height:1.2;margin:7px 0 4px">Campaign Production Report</h1>
      <div style="font-size:13px;opacity:.82">${data.dateLabel} · Generated ${data.generatedAt}</div>
    </td></tr>
    <tr><td style="padding:22px 22px 10px">
      <div style="font-size:14px;font-weight:800;margin:0 6px 8px">Today at a glance</div>
      <table role="presentation" width="100%"><tr>
        ${misMetricCard_('Planned', data.plannedToday, 'Scheduled today', '#2563eb')}
        ${misMetricCard_('Uploaded', data.uploadedToday, `${todayCompletion}% of today`, '#059669')}
        ${misMetricCard_('Active Moves', data.activityToday, 'Stage updates today', '#7c3aed')}
        ${misMetricCard_('Attention', data.overdue + data.blocked, `${data.overdue} overdue · ${data.blocked} blocked`, '#dc2626')}
      </tr></table>
    </td></tr>
    <tr><td style="padding:10px 28px 18px">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px">Production pipeline</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <tr style="background:#f8fafc;color:#64748b;font-size:11px;text-transform:uppercase"><th align="left" style="padding:10px">Stage</th><th style="padding:10px">Today</th><th style="padding:10px">Campaign</th></tr>
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
    <tr><td style="padding:16px 28px;background:#fff1f2;color:#9f1239;font-size:12px;line-height:1.5"><strong>Manager focus:</strong> Clear ${data.overdue} overdue and ${data.blocked} blocked item(s); protect the next expected delivery window.</td></tr>
  </table></td></tr></table></body></html>`;
}

function sendDailyCampaignMis() {
  const ss = SpreadsheetApp.getActive();
  const config = misConfig_(ss);
  const recipients = String(config[INFINITY_MIS.RECIPIENT_KEY] || '').trim();
  if (!recipients) throw new Error('Set MIS_RECIPIENT_EMAILS in CONFIG before sending.');
  const data = buildDailyCampaignMisData_(ss);
  MailApp.sendEmail({
    to: recipients,
    cc: String(config[INFINITY_MIS.CC_KEY] || '').trim(),
    subject: `Infinity Daily MIS · ${data.dateLabel} · ${data.uploadedToday}/${data.plannedToday} uploaded`,
    body: `Infinity Daily MIS for ${data.dateLabel}. Planned: ${data.plannedToday}, Uploaded: ${data.uploadedToday}, Remaining campaign: ${data.remaining}.`,
    htmlBody: buildDailyCampaignMisHtml_(data),
    name: 'Infinity Operations'
  });
  return { ok: true, recipients, data };
}

function setupDailyMisTrigger() {
  const ss = SpreadsheetApp.getActive();
  const config = misConfig_(ss);
  const hour = Math.max(0, Math.min(23, Number(config[INFINITY_MIS.SEND_HOUR_KEY] || INFINITY_MIS.DEFAULT_HOUR)));
  ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === INFINITY_MIS.HANDLER).forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger(INFINITY_MIS.HANDLER).timeBased().everyDays(1).atHour(hour).create();
  return { ok: true, handler: INFINITY_MIS.HANDLER, hour, timezone: Session.getScriptTimeZone() };
}

function previewDailyCampaignMisHtml() {
  return buildDailyCampaignMisHtml_(buildDailyCampaignMisData_(SpreadsheetApp.getActive()));
}

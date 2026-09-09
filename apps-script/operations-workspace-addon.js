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
  const byAccount=ch.accounts.map(account=>{
    const posts=todayPosts.filter(p=>[account.accountId,account.handle].includes(p.account));
    const metric=ch.metrics.find(m=>m.accountId===account.accountId && m.date===a.day);
    return [account.handle,posts.length,metric?metric.views:null,metric?metric.reach:null,metric?'Manual / '+metric.date:'Awaiting manual observation'];
  });
  return section('01 · Operational execution and evidence basis',`<p>This memorandum consolidates production-stage inventory, timestamped operational activity, quality-control disposition and distribution evidence for the India reporting date. The execution register contains <strong>${a.eventCount} recorded events</strong> involving <strong>${a.videoCount} distinct videos</strong>. These measures describe observed activity; repeated actions, retries and failures do not constitute additional completed deliverables.</p><p>Scheduling and execution are reported separately. A zero in the scheduled cohort means no matching publish-date records were identified; it does not establish that no work occurred. Outstanding inventory remains visible regardless of the planned publication date.</p>`)
    +section('02 · Editorial capacity and review handoffs',table(['Editor','Editing','Revisions','Awaiting QC','Approved'],(data.workload||[]).map(w=>[w.editor,w.editing,w.changes,w.qc,w.approved]))+'<p>Awaiting-QC inventory represents a manager review dependency. Revision inventory requires editor action. Approved inventory is eligible for distribution but is not evidence of a published post.</p>')
    +section('03 · Quality assurance and exception register',`<p>${(data.exceptions||[]).length} records meet the QC, revision, overdue or blocker criteria. The following register shows the first 100; remaining records remain available in All Videos.</p>`+table(['Video','Editor','Stage','Revision / blocker','Due'],(data.exceptions||[]).slice(0,100).map(v=>[v.videoId,v.editor,v.status,[v.notes,v.blocker].filter(Boolean).join(' | '),v.due])))
    +section('04 · Channel distribution and audience observation',`<p>${todayPosts.length} publication records have a publication timestamp within this reporting date, covering ${new Set(todayPosts.map(p=>p.videoId)).size} unique videos. One video may be distributed through multiple accounts; publication records and unique-video counts therefore use different denominators. Views and reach below are manually supplied page-level observations. Missing observations remain unreported and are not replaced with zero. Reach is not summed across accounts because audiences may overlap.</p>`+table(['Channel','Posts today','Views','Reach','Evidence'],byAccount))
    +section('05 · Publication evidence register',table(['Video','Account','Post URL'],todayPosts.map(p=>[p.videoId,p.account,p.url])))
    +section('06 · Recorded operational activity appendix',`<p>Latest ${Math.min(200,a.events.length)} of ${a.events.length} recorded events today. Status and errors are retained. System checks and button requests, where recorded, must not be interpreted as successful production outcomes.</p>`+table(['Time / action','Video / editor','Outcome','Recorded detail'],a.events.slice(0,200).map(e=>[e.at+' / '+e.action,e.videoId+' / '+e.editor,e.status,[e.details,e.error].filter(Boolean).join(' | ')])))
    +section('07 · Measurement definitions and reporting limitations','<p><strong>Planned:</strong> videos with today’s publish date. <strong>Active moves:</strong> videos whose latest stage timestamp falls today; historical intermediate transitions require the event register. <strong>Uploaded today:</strong> videos currently marked Uploaded with a stage timestamp today. <strong>Publication evidence:</strong> separate distribution rows with a recorded post URL and upload timestamp. <strong>Audience observation:</strong> manual page-level inputs, without an authenticated platform API connection. <strong>Projection:</strong> recent recorded throughput, constrained by remaining inventory; the stretch scenario is an inventory scenario rather than a forecast commitment.</p><p>All timestamps are interpreted in Asia/Kolkata. Historical clicks not previously logged cannot be reconstructed. Records entered after the scheduled send appear in the next generated preview; an already-sent email is not retrospectively modified.</p>');
}

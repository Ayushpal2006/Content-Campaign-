import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {randomBytes,pbkdf2Sync} from 'node:crypto';
import ts from 'typescript';

function sheet(rows) {
  return {rows,getLastRow:()=>rows.length,getLastColumn:()=>rows[0].length,getDataRange(){return this.getRange(1,1,rows.length,rows[0].length);},
    getRange(r,c,h=1,w=1){return {getValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>rows[r-1+i]?.[c-1+j]??'')),getDisplayValues(){return this.getValues().map(row=>row.map(String));},setValues(values){values.forEach((row,i)=>row.forEach((v,j)=>{rows[r-1+i]??=[];rows[r-1+i][c-1+j]=v;}));return this;}};}};
}
function runtime() {
  const tables={
    ACCOUNTS:sheet([['Account ID','Username / Channel','Platform','Status','Notes'],['IG-001','@page.one','Instagram','Active','']]),
    USERS:sheet([['Login ID','Role','Editor','Active','Password Salt','Password Hash'],['ed.a','editor','Editor A',true,'','']]),
    DISTRIBUTION:sheet([['Distribution ID','Video ID','Account','Editor','Upload Status','Post URL','Uploaded At','Views Today','Current Views','Sales','Metrics Last Sync At','Issue / Note']]),
    LOGS:sheet([['Timestamp','Action','Video ID','Editor','Status','Details','Error']]),
    'CHANNEL METRICS':sheet([['Date','Account ID','Views','Reach','Source','Updated At']])
  };
  const videos=[{videoId:'V1',editor:'Editor A',productionStatus:'Approved'},{videoId:'V2',editor:'Editor B',productionStatus:'QC Pending'}];
  const ss={getSheetByName:n=>tables[n]};
  let saves=0;
  const context=vm.createContext({Date,Set,console,Utilities:{getUuid:()=>`row-${++saves}`,formatDate:(d,tz,format)=>format==='yyyy-MM-dd'?new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(d):d.toISOString()},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},apiInvalidateReadCache_(){},apiLoadVideoContext_:()=>({items:videos}),apiGetVideo_:(_,id)=>{const v=videos.find(v=>v.videoId===id);if(!v)throw Error('Missing video');return v;},apiDetectFinal_:(_,id)=>({videoId:id})});
  vm.runInContext(readFileSync('apps-script/daily-mis-addon.js','utf8')+'\n'+readFileSync('apps-script/operations-workspace-addon.js','utf8'),context);
  context.log_=()=>{};
  return {context,ss,tables,videos};
}

test('combined Apps Script parses with no duplicate lexical declarations',()=>{
  assert.doesNotThrow(()=>new vm.Script(readFileSync('apps-script/Code.gs','utf8')));
});
test('India day treats UTC timestamps as instants',()=>{
  const {context:c}=runtime();
  assert.equal(c.opsDay_('2026-09-07T20:00:00Z'),'2026-09-08');
  assert.equal(c.misDateKey_('2026-09-07T20:00:00Z','Asia/Kolkata'),'2026-09-08');
});
test('editor reads are isolated and manager actions are denied, including disabled accounts',()=>{
  const {context:c,ss,tables}=runtime();const actor={username:'ed.a',role:'editor',editor:'Editor A'};
  assert.equal(c.opsEditorDispatch_(ss,'bootstrap',{actor}).videos.items.length,1);
  assert.throws(()=>c.opsEditorDispatch_(ss,'video',{actor,videoId:'V2'}),/not assigned/);
  assert.throws(()=>c.opsEditorDispatch_(ss,'qc_approve',{actor,videoId:'V1'}),/Only a manager/);
  tables.USERS.rows[1][3]=false;
  assert.throws(()=>c.opsEditorDispatch_(ss,'bootstrap',{actor}),/inactive/);
});
test('manual publication upserts a video/account pair and requires QC and a valid post URL',()=>{
  const {context:c,ss,tables}=runtime();
  const body={videoId:'V1',accountId:'IG-001',url:'https://www.instagram.com/reel/ABC123/',uploadedAt:'2026-01-01T10:00:00+05:30'};
  c.opsSavePost_(ss,body);c.opsSavePost_(ss,body);
  assert.equal(tables.DISTRIBUTION.rows.length,2);
  assert.throws(()=>c.opsSavePost_(ss,{...body,videoId:'V2'}),/pass manager QC/);
  assert.throws(()=>c.opsSavePost_(ss,{...body,url:'javascript:alert(1)'}),/valid Instagram/);
  assert.throws(()=>c.opsSavePost_(ss,{...body,uploadedAt:'bad'}),/valid publication/);
});
test('manual metrics preserve unknown values and upsert by date/account',()=>{
  const {context:c,ss,tables}=runtime();
  c.opsSaveMetrics_(ss,{accountId:'IG-001',date:'2026-01-01',views:0,reach:''});
  c.opsSaveMetrics_(ss,{accountId:'IG-001',date:'2026-01-01',views:12,reach:''});
  assert.equal(tables['CHANNEL METRICS'].rows.length,2);
  assert.equal(tables['CHANNEL METRICS'].rows[1][2],12);
  assert.equal(tables['CHANNEL METRICS'].rows[1][3],'');
  assert.throws(()=>c.opsSaveMetrics_(ss,{accountId:'IG-001',date:'2026-02-31',views:1}),/valid metrics date/);
  assert.throws(()=>c.opsSaveMetrics_(ss,{accountId:'IG-001',date:'2026-01-01',views:-1}),/non-negative/);
});
test('corporate report retains QC notes, escapes HTML and does not invent missing metrics',()=>{
  const {context:c}=runtime();
  const html=c.misDetailedSections_({activity:{day:'2026-01-01',events:[],videoCount:0,eventCount:0},channels:{accounts:[{accountId:'IG-001',handle:'@page.one'}],posts:[],metrics:[]},workload:[],exceptions:[{videoId:'V1',notes:'<script>fix colour</script>',status:'Changes'}]});
  assert.match(html,/Not recorded/);
  assert.match(html,/&lt;script&gt;fix colour/);
  assert.doesNotMatch(html,/<script>/);
  assert.match(html,/not constitute additional completed deliverables/);
});
test('individual password verification accepts generated hashes and rejects wrong passwords',async()=>{
  const source=ts.transpileModule(readFileSync('src/lib/server/user-login.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const salt=randomBytes(16).toString('hex');const password='test-password-not-a-production-secret';
  const hash=pbkdf2Sync(password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex');
  assert.equal(await mod.verifyUserPassword(password,{salt,hash}),true);
  assert.equal(await mod.verifyUserPassword('wrong',{salt,hash}),false);
});

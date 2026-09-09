import {readFileSync,writeFileSync} from 'node:fs';
const path='apps-script/Code.gs';
const marker='// BEGIN GENERATED ADDONS';
const source=readFileSync(path,'utf8');
if(!source.includes(marker)) throw new Error('Canonical source marker missing');
const files=['manager-api-addon.js','daily-mis-addon.js','web-action-queue-addon.js','web-snapshot-addon.js','operations-workspace-addon.js'];
const output=source.slice(0,source.indexOf(marker))+marker+' — run npm run build:appscript after editing addon files.\n'+files.map(f=>'\n'+readFileSync('apps-script/'+f,'utf8')+'\n').join('');
writeFileSync(path,output);
console.log('Combined Apps Script written to '+path);

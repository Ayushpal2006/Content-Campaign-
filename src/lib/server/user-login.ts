import type {SessionIdentity} from './auth';

export async function verifyUserPassword(password:string,record:Record<string,unknown>):Promise<boolean> {
  const salt=String(record.salt || ''), expected=String(record.hash || '');
  if(!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{64}$/.test(expected) || password.length>256) return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const saltBytes=Uint8Array.from(salt.match(/../g)!,v=>parseInt(v,16));
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:saltBytes,iterations:100000,hash:'SHA-256'},key,256);
  const actual=Array.from(new Uint8Array(bits),v=>v.toString(16).padStart(2,'0')).join('');
  let difference=0;
  for(let i=0;i<expected.length;i++) difference|=actual.charCodeAt(i)^expected.charCodeAt(i);
  return difference===0;
}

export async function loginUser(username:string,password:string,apiUrl:string,token:string):Promise<SessionIdentity|null> {
  if(!apiUrl || !token) throw new Error('Configure the Apps Script backend before enabling individual logins.');
  const response=await fetch(apiUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'user_login_record',username,token}),signal:AbortSignal.timeout(25000)});
  const raw=await response.json() as Record<string,any>;
  if(!response.ok || raw.ok===false) throw new Error('User directory unavailable. Deploy the updated Apps Script and configure USERS.');
  const record=raw.result || raw.data || raw;
  if(!record.username || !await verifyUserPassword(password,record)) return null;
  if(!['manager','editor'].includes(record.role) || (record.role==='editor' && !record.editor)) return null;
  return {username:record.username,role:record.role,editor:record.editor || ''};
}

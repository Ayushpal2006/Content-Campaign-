// Run locally. Output contains the new password: share privately, never commit.
import {randomBytes,pbkdf2Sync} from 'node:crypto';
const [username,role,editor='']=process.argv.slice(2);
if(!username || !/^[a-z0-9._-]{3,100}$/.test(username) || !['manager','editor'].includes(role) || (role==='editor' && !editor)) {
  console.error('Usage: node scripts/create-user.js login.id manager|editor "Exact editor name"');process.exit(1);
}
const password=randomBytes(18).toString('base64url');
const salt=randomBytes(16).toString('hex');
const hash=pbkdf2Sync(password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex');
console.log('Login ID: '+username+'\nPassword (share privately): '+password);
console.log('\nPaste this tab-separated row into USERS columns A:G:');
console.log([username,editor || username,role,editor,'TRUE',salt,hash].join('\t'));

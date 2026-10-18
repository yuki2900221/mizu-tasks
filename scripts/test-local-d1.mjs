import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SignJWT} from 'jose';
const origin=process.env.MIZU_TEST_ORIGIN||'http://localhost:8789';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Local tests only');
const secret=readFileSync('.dev.vars','utf8').match(/^SESSION_SECRET=(.+)$/m)?.[1];
if(!secret?.startsWith('mizu-local-integration-only-'))throw new Error('Use a test-only secret');
async function token(id){return new SignJWT({sub:id,name:id,email:id+'@example.invalid'}).setProtectedHeader({alg:'HS256'}).setIssuer('mizu').setAudience('mizu').setExpirationTime('10m').sign(new TextEncoder().encode(secret))}
async function sync(id,tasks){const r=await fetch(origin+'/api/tasks/sync',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:'mizu_session='+await token(id)},body:JSON.stringify({tasks})});assert.equal(r.status,200);return (await r.json()).tasks}
const stamp=Date.now();const task={id:crypto.randomUUID(),title:'D1 integration task',note:'test only',category:'仕事',status:'todo',due:'',createdAt:stamp,updatedAt:stamp,deleted:false};
let rows=await sync('mizu-test-alice',[task]);assert.equal(rows.find(t=>t.id===task.id)?.title,task.title);console.log('PASS: real local D1 write and read');
rows=await sync('mizu-test-bob',[]);assert.equal(rows.some(t=>t.id===task.id),false);console.log('PASS: user isolation');
rows=await sync('mizu-test-alice',[{...task,status:'doing',updatedAt:stamp+1}]);assert.equal(rows.find(t=>t.id===task.id)?.status,'doing');console.log('PASS: update persistence');
rows=await sync('mizu-test-alice',[{...task,title:'stale data'}]);assert.equal(rows.find(t=>t.id===task.id)?.status,'doing');assert.equal(rows.find(t=>t.id===task.id)?.title,task.title);console.log('PASS: stale edit cannot overwrite new edit');
rows=await sync('mizu-test-alice',[{...task,deleted:true,updatedAt:stamp+2}]);assert.equal(rows.find(t=>t.id===task.id)?.deleted,true);console.log('PASS: deletion tombstone persistence');

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {mkdtempSync,rmSync,writeFileSync}=require('node:fs');const {tmpdir}=require('node:os');const {join}=require('node:path');
const {Store}=require('../adn-v1/store.cjs');const {Lab}=require('../adn-v1/lab.cjs');const {createServer}=require('../adn-v1/server.cjs');
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'adn-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return join(dir,'lab.sqlite');}
async function until(fn,ms=10000){const end=Date.now()+ms;while(!fn()){if(Date.now()>end)throw Error('timeout');await new Promise(r=>setTimeout(r,20));}}
const sq=n=>n*(n+1)*(2*n+1)/6;
test('identities, permissions, input validation and durable idempotency',t=>{
 const path=fixture(t);const s=new Store(path);t.after(()=>s.close());
 assert.equal(s.report().cells.length,24);assert.equal(new Set(s.report().cells.map(c=>c.group)).size,8);
 s.submit('one',100);s.submit('one',100);assert.equal(s.report().tasks.length,1);
 assert.throws(()=>s.submit('one',101),/CONFLICT/);assert.throws(()=>s.submit('bad',Infinity),/INVALID/);
 assert.throws(()=>s.config(25,'data',1,true),/INVALID/);
 for(const [mode,ch,alive] of [['closed',1,true],['energy',1,true],['data',2,true],['data',1,false]]){s.config(1,mode,ch,alive);assert.equal(s.claim(1),null);}
 assert.equal(s.report().events.filter(e=>e.type==='denied').length,4);
});
test('checkpoint recovery, attempt fencing, validation and exactly one result record',t=>{
 const s=new Store(fixture(t));t.after(()=>s.close());s.submit('t',1000);const a=s.claim(1);
 assert.equal(s.accept(2,{...a,checkpoint:100,total:sq(100)}),false);
 assert.equal(s.accept(1,{...a,checkpoint:100,total:1}),false);
 assert.equal(s.accept(1,{...a,checkpoint:100,total:sq(100)}),true);
 s.release(1);const b=s.claim(2);assert.equal(b.checkpoint,100);assert.equal(b.total,sq(100));assert.equal(b.attempt,2);
 assert.equal(s.accept(1,{...a,checkpoint:1000,total:sq(1000)}),false);
 assert.equal(s.accept(2,{...b,checkpoint:1000,total:sq(1000)}),true);
 assert.equal(s.accept(2,{...b,checkpoint:1000,total:sq(1000)}),false);
 assert.equal(s.report().metrics.completed,1);assert.equal(s.report().metrics.duplicateResultRecords,0);
});
test('restart persists checkpoint and fences every old coordinator write',t=>{
 const path=fixture(t);const a=new Store(path);a.submit('x',1000);const task=a.claim(1);a.accept(1,{...task,checkpoint:100,total:sq(100)});
 const b=new Store(path);t.after(()=>{a.close();b.close();});
 assert.throws(()=>a.submit('old',1),/STALE/);assert.throws(()=>a.accept(1,{...task,checkpoint:200,total:sq(200)}),/STALE/);assert.throws(()=>a.release(1),/STALE/);
 const next=b.claim(2);assert.equal(next.checkpoint,100);b.accept(2,{...next,checkpoint:1000,total:sq(1000)});
 b.submit('x',1000);assert.equal(b.report().metrics.created,1);
});
test('real IPC processes, kill after checkpoint, controlled reassignment and stop/start',async t=>{
 const lab=new Lab(fixture(t));t.after(()=>lab.close());
 lab.store.submit('failure',10000);lab.start();
 await until(()=>lab.report().tasks[0].checkpoint>=100);
 const running=lab.report().tasks[0];const pid=lab.workers.get(running.cell).child.pid;
 assert.notEqual(pid,process.pid);lab.config(running.cell,'both',1,false);
 await until(()=>lab.report().metrics.completed===1);
 const report=lab.report();assert.equal(report.tasks[0].result,sq(10000));assert.ok(report.tasks[0].attempt>=2);
 assert.equal(report.metrics.unaccountedTasks,0);assert.equal(report.metrics.duplicateResultRecords,0);
 assert.ok(report.events.some(e=>e.type==='worker_exit'));
 lab.stop();await until(()=>lab.workers.size===0);lab.store.submit('restart',100);lab.start();await until(()=>lab.report().metrics.completed===2);
});
test('stalled process is detected and replaced',async t=>{
 const lab=new Lab(fixture(t),{count:1,timeoutMs:400});t.after(()=>lab.close());lab.store.submit('stall',2000);lab.start();
 await until(()=>lab.report().tasks[0].checkpoint>=100);const w=lab.workers.get(1);w.child.kill('SIGSTOP');
 await until(()=>lab.report().metrics.completed===1);assert.ok(lab.report().tasks[0].attempt>=2);
});
test('HTTP validates host/origin, actions, serves UI and exports labelled report',async t=>{
 const {server,lab}=createServer(fixture(t));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));await lab.close();});
 const base=`http://127.0.0.1:${server.address().port}`;
 assert.match(await (await fetch(base)).text(),/24 identidades/);
 const post=(m,headers={})=>fetch(base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(m)});
 assert.equal((await post({action:'start'},{Origin:'https://evil.invalid'})).status,403);
 assert.equal((await post({action:'submit',id:'web',n:100})).status,200);
 assert.equal((await post({action:'start'})).status,200);await until(()=>lab.report().metrics.completed===1);
 const s=await(await fetch(base+'/api/state')).json();assert.equal(s.dataSource,'measured_local');assert.equal(s.xrpl,'disabled');
 assert.equal((await post({action:'bad'})).status,400);assert.equal((await fetch(base+'/../store.cjs')).status,404);
});

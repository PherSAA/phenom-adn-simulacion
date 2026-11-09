'use strict';
const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const { Simulation } = require('../engine.js');
// One SQLite file is the serialization authority. Not a multi-host consensus system.
class Store {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS meta (id INTEGER PRIMARY KEY, epoch INTEGER);
      INSERT OR IGNORE INTO meta VALUES(1,0);
      CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,n INTEGER,status TEXT,cell INTEGER,attempt INTEGER DEFAULT 0,checkpoint INTEGER DEFAULT 0,total INTEGER DEFAULT 0,created INTEGER,finished INTEGER,result INTEGER);
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY,at INTEGER,type TEXT,detail TEXT);
      CREATE TABLE IF NOT EXISTS cells(id INTEGER PRIMARY KEY,channel INTEGER,mode TEXT,alive INTEGER);
    `);
    this.epoch = this.tx(() => {
      this.db.exec('UPDATE meta SET epoch=epoch+1 WHERE id=1');
      const epoch = this.db.prepare('SELECT epoch FROM meta').get().epoch;
      this.db.exec("UPDATE tasks SET status='pending',cell=NULL WHERE status='running'");
      for (const c of new Simulation().cells) this.db.prepare('INSERT OR IGNORE INTO cells VALUES(?,?,?,1)').run(c.id,c.key.channel,c.key.mode);
      this.event('coordinator', { epoch }); return epoch;
    }, false);
  }
  tx(fn, fenced = true) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (fenced && this.db.prepare('SELECT epoch FROM meta').get().epoch !== this.epoch) throw Error('STALE_COORDINATOR');
      const r = fn(); this.db.exec('COMMIT'); return r;
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  event(type, detail) { this.db.prepare('INSERT INTO events(at,type,detail) VALUES(?,?,?)').run(Date.now(),type,JSON.stringify(detail)); }
  submit(id = randomUUID(), n = 1000) {
    if (typeof id !== 'string' || !/^[\w-]{1,80}$/.test(id) || !Number.isInteger(n) || n < 1 || n > 100000) throw Error('INVALID_TASK');
    return this.tx(() => {
      const old = this.db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
      if (old) { if (old.n !== n) throw Error('IDEMPOTENCY_CONFLICT'); this.event('idempotent_replay',{id}); return id; }
      if(this.db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n >= 10000) throw Error('TASK_LIMIT');
      this.db.prepare("INSERT INTO tasks(id,n,status,created) VALUES(?,?,'pending',?)").run(id,n,Date.now());
      this.event('submitted',{id,n}); return id;
    });
  }
  config(id, mode, channel, alive) {
    if (!Number.isInteger(id) || id < 1 || id > 24 || !['both','data','closed','energy'].includes(mode) || ![1,2,3,4].includes(channel) || typeof alive !== 'boolean') throw Error('INVALID_CELL');
    this.tx(() => {
      this.db.prepare('UPDATE cells SET mode=?,channel=?,alive=? WHERE id=?').run(mode,channel,+alive,id);
      this.requeue(id); this.event('cell_config',{id,mode,channel,alive});
    });
  }
  requeue(id) {
    this.db.prepare("UPDATE tasks SET status='pending',cell=NULL WHERE cell=? AND status='running'").run(id);
  }
  release(id) { this.tx(() => {this.requeue(id); this.event('worker_exit',{id});}); }
  claim(id) {
    return this.tx(() => {
      const c = this.db.prepare('SELECT * FROM cells WHERE id=?').get(id);
      if (!c?.alive || c.channel !== 1 || !['both','data'].includes(c.mode)) { this.event('denied',{id,operation:'claim'}); return null; }
      if (this.db.prepare("SELECT id FROM tasks WHERE cell=? AND status='running'").get(id)) return null;
      const t = this.db.prepare("SELECT * FROM tasks WHERE status='pending' ORDER BY created,id LIMIT 1").get();
      if (!t) return null;
      this.db.prepare("UPDATE tasks SET status='running',cell=?,attempt=attempt+1 WHERE id=?").run(id,t.id);
      this.event('assigned',{id:t.id,cell:id,attempt:t.attempt+1});
      return {...t,cell:id,attempt:t.attempt+1,epoch:this.epoch};
    });
  }
  accept(cell, m) {
    return this.tx(() => {
      const t = this.db.prepare('SELECT * FROM tasks WHERE id=?').get(m.id);
      const c = this.db.prepare('SELECT * FROM cells WHERE id=?').get(cell);
      if (!t || t.status !== 'running' || t.cell !== cell || t.attempt !== m.attempt || m.epoch !== this.epoch || !c.alive || c.channel !== 1 || !['both','data'].includes(c.mode)) {
        this.event('rejected',{id:m.id,cell,reason:'STALE_OR_UNAUTHORIZED'}); return false;
      }
      const k=m.checkpoint;
      const expected=k*(k+1)*(2*k+1)/6;
      if (!Number.isInteger(k) || k<=t.checkpoint || k>t.n || m.total!==expected) { this.event('rejected',{id:m.id,cell,reason:'INVALID_CHECKPOINT'}); return false; }
      const done=k===t.n;
      this.db.prepare('UPDATE tasks SET checkpoint=?,total=?,status=?,finished=?,result=? WHERE id=?').run(k,m.total,done?'done':'running',done?Date.now():null,done?m.total:null,t.id);
      this.event(done?'completed':'checkpoint',{id:t.id,cell,attempt:m.attempt,checkpoint:k}); return true;
    });
  }
  report() {
    const tasks=this.db.prepare('SELECT * FROM tasks ORDER BY created,id').all();
    const cells=new Simulation().cells.map(c=>({id:c.id,group:c.group,slot:c.slot,...this.db.prepare('SELECT * FROM cells WHERE id=?').get(c.id),modeSource:'os_process',capacity:1,tasks:tasks.filter(t=>t.cell===c.id).map(t=>t.id)}));
    const done=tasks.filter(t=>t.status==='done');
    const elapsed=tasks.length?Math.max(1,Date.now()-Math.min(...tasks.map(t=>t.created))):0;
    return {schemaVersion:1,mode:'local_processes',dataSource:'measured_local',epoch:this.epoch,xrpl:'disabled',cells,tasks,
      metrics:{created:tasks.length,completed:done.length,pending:tasks.filter(t=>t.status==='pending').length,running:tasks.filter(t=>t.status==='running').length,throughput:elapsed?done.length*1000/elapsed:0,meanLatencyMs:done.length?done.reduce((s,t)=>s+t.finished-t.created,0)/done.length:0,unaccountedTasks:tasks.filter(t=>!['done','pending','running'].includes(t.status)).length,duplicateResultRecords:done.length-new Set(done.map(t=>t.id)).size},
      events:this.db.prepare('SELECT * FROM events ORDER BY seq').all(),note:'Procesos independientes en una máquina; SQLite y coordinador únicos. Sin alta disponibilidad. Pérdidas = tareas no contabilizadas, no paquetes de red; duplicados = registros de resultados, no ejecuciones.'};
  }
  close(){this.db.close();}
}
module.exports={Store};

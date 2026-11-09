'use strict';
const {fork}=require('node:child_process');
const {join}=require('node:path');
const {Store}=require('./store.cjs');
class Lab {
  constructor(path,{count=3,timeoutMs=3000}={}) {
    this.store=new Store(path); this.workers=new Map();this.running=false;this.count=count;this.timeoutMs=timeoutMs;
    this.timer=setInterval(()=>this.tick(),100);
  }
  start(){this.running=true;this.tick();}
  stop(){this.running=false;for(const w of this.workers.values())w.child.kill('SIGKILL');}
  spawn(id){
    const child=fork(join(__dirname,'worker.cjs'),[],{stdio:['ignore','ignore','ignore','ipc']});
    const w={child,ready:false,last:Date.now(),busy:false};this.workers.set(id,w);
    child.on('message',m=>{try{
      w.last=Date.now();
      if(m.ready){w.ready=true;w.busy=false;}else this.store.accept(id,m);
    }catch(e){this.error=e.message;this.stop();}});
    child.on('exit',()=>{if(this.workers.get(id)!==w)return;this.workers.delete(id);try{this.store.release(id);}catch(e){this.error=e.message;this.stop();}});
    child.on('error',e=>{this.error=e.message;});
  }
  tick(){
    if(!this.running)return;
    try{
      const cells=this.store.report().cells;
      for(let id=1;id<=this.count;id++){
        const c=cells[id-1];const w=this.workers.get(id);
        if(!c.alive || c.channel!==1 || !['data','both'].includes(c.mode)){if(w)w.child.kill('SIGKILL');continue;}
        if(!w){this.spawn(id);continue;}
        if(Date.now()-w.last>this.timeoutMs && (w.busy || !w.ready)){w.child.kill('SIGKILL');continue;}
        if(w.ready){const t=this.store.claim(id);if(t){w.ready=false;w.busy=true;w.last=Date.now();w.child.send(t);}}
      }
    }catch(e){this.error=e.message;this.stop();}
  }
  config(id,mode,channel,alive){this.store.config(id,mode,channel,alive);this.workers.get(id)?.child.kill('SIGKILL');}
  report(){return {...this.store.report(),running:this.running,error:this.error||null,cells:this.store.report().cells.map(c=>({...c,pid:this.workers.get(c.id)?.child.pid||null,processState:this.workers.has(c.id)?'spawned':'not_started'}))};}
  async close(){clearInterval(this.timer);this.stop();await Promise.all([...this.workers.values()].map(w=>new Promise(r=>w.child.once('exit',r))));this.store.close();}
}
module.exports={Lab};

'use strict';
const {mkdtempSync,rmSync,writeFileSync}=require('node:fs');const {tmpdir,cpus}=require('node:os');const {join}=require('node:path');const {Lab}=require('./lab.cjs');
(async()=>{
 const dir=mkdtempSync(join(tmpdir(),'adn-bench-'));const lab=new Lab(join(dir,'lab.sqlite'));const start=performance.now();
 try{
  for(let i=0;i<30;i++)lab.store.submit(`bench-${i}`,2000);
  lab.start();let injected=false;
  while(lab.report().metrics.completed<30){
   if(performance.now()-start>30000)throw Error('BENCHMARK_TIMEOUT');
   const task=lab.report().tasks.find(t=>t.status==='running' && t.checkpoint>0);
   if(task&&!injected){lab.config(task.cell,'both',1,false);injected=true;}
   await new Promise(r=>setTimeout(r,10));
  }
  lab.stop();const report=lab.report();
  const result={...report,benchmark:{requested:30,workers:3,failureInjected:injected,elapsedMs:performance.now()-start,node:process.version,cpus:cpus().length,platform:process.platform},verified:report.tasks.every(t=>t.result===t.n*(t.n+1)*(2*t.n+1)/6)};
  if(!injected || !result.verified || report.metrics.unaccountedTasks || report.metrics.duplicateResultRecords)throw Error('INVALID_RESULT');
  const json=JSON.stringify(result,null,2);if(process.argv[2])writeFileSync(process.argv[2],json);console.log(JSON.stringify({metrics:result.metrics,benchmark:result.benchmark,verified:result.verified}));
 }finally{await lab.close();rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
// Independent OS process. Only its parent's IPC channel is trusted in this lab.
process.on('message', async t => {
  let total=t.total;
  for(let k=t.checkpoint+1;k<=t.n;k++) {
    total+=k*k;
    if(k%100===0 || k===t.n) {
      process.send({id:t.id,attempt:t.attempt,epoch:t.epoch,checkpoint:k,total});
      await new Promise(r=>setTimeout(r,5));
    }
  }
  process.send({ready:true});
});
process.send({ready:true});

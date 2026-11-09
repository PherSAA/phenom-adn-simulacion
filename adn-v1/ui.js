'use strict';
const $=id=>document.getElementById(id);
const sim=new Phenom.Simulation();sim.autoTraffic=false;sim.setAutoRecovery(false);
let mode='simulation',selected=1,state=null,busy=false,last=performance.now();
function uuid(){return crypto.randomUUID?crypto.randomUUID():`task-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function notice(s){$('status').textContent=s;}
function download(r){const u=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=`phersaa-adn-${mode}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
async function api(m){const r=await fetch(m?'/api/action':'/api/state',m?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(m)}:{});const s=await r.json();if(!r.ok)throw Error(s.error||'Backend no disponible');state=s;return s;}
async function act(m,fn){try{if(mode==='real')await api(m);else fn();notice('Operación registrada.');render();}catch(e){notice(e.message);}}
function render(){
 const real=mode==='real';const cells=real?(state?.cells||[]):sim.cells;const m=real?state?.metrics:sim.metrics();
 $('source').textContent=real?'MEDICIÓN REAL · procesos locales. Solo las células con PID tienen un proceso. Canal de trabajo: 1.':'DATOS SIMULADOS · 24 células lógicas dentro de este navegador. Tiempo y energía ficticios.';
 if(!m){$('metrics').textContent='Sin medición: inicia el servidor local indicado en la documentación.';$('cells').replaceChildren();$('detail').textContent='Sin conexión con el laboratorio.';$('events').textContent='';return;}
 const values=real?[[m.throughput.toFixed(2),'tareas/s · desde primera tarea'],[m.meanLatencyMs.toFixed(0)+' ms','latencia media'],[m.unaccountedTasks,'tareas no contabilizadas'],[m.duplicateResultRecords,'resultados duplicados']]:[[m.rate.toFixed(2),'tareas/s simuladas'],[m.meanLatency.toFixed(2)+' s','latencia simulada'],[m.created-m.completed-m.outstandingTasks,'tareas no contabilizadas'],['N/D','duplicados · ver invariantes']];
 $('metrics').replaceChildren(...values.map(([v,l])=>{const d=document.createElement('div');d.className='metric';const strong=document.createElement('strong');strong.textContent=v;d.append(strong,document.createTextNode(l));return d;}));
 if(!$('cells').children.length){
  for(let i=1;i<=8;i++){
   const d=document.createElement('div');d.className='group';const label=document.createElement('small');label.textContent=`GRUPO ${String(i).padStart(2,'0')}`;
   const row=document.createElement('div');row.className='members';
   cells.filter(c=>c.group===i).forEach(c=>{const b=document.createElement('button');b.id='cell-'+c.id;b.onclick=()=>{selected=c.id;render();};row.append(b);});d.append(label,row);$('cells').append(d);
  }
 }
 for(const c of cells){const b=$('cell-'+c.id);b.className=`cell ${c.alive?'active':'off'} ${c.id===selected?'selected':''}`;b.setAttribute('aria-pressed',String(c.id===selected));const strong=document.createElement('strong');strong.textContent='C'+c.id;b.replaceChildren(strong,document.createTextNode(real?(c.pid?'PID '+c.pid:'Sin proceso'):(c.alive?'Disponible':'Fallo simulado')));}

 const c=cells.find(c=>c.id===selected);$('selected').textContent='Célula '+selected;
 $('detail').textContent=real?JSON.stringify({identidad:c.id,grupo:c.group,estado:c.alive?'habilitada':'fallo inducido',pid:c.pid,permiso:c.mode,canal:c.channel,capacidad:c.capacity,tareas:c.tasks},null,2):JSON.stringify({identidad:c.id,grupo:c.group,estado:c.alive?'disponible':'fallo simulado',permiso:c.key.mode,canal:c.key.channel,capacidad:sim.capacity,enCurso:c.running.map(t=>t.jobId),completadas:c.completed},null,2);
 if(document.activeElement!==$('permission'))$('permission').value=real?c.mode:c.key.mode;
 if(document.activeElement!==$('channel'))$('channel').value=real?c.channel:c.key.channel;
 $('events').textContent=real?state.events.slice(-30).reverse().map(e=>`${e.seq} ${e.type} ${e.detail}`).join('\n'):sim.events.map(e=>`${e.simulatedSeconds.toFixed(2)}s ${e.type} · ${e.message}`).join('\n');
}
$('mode').onchange=async()=>{sim.paused=true;mode=$('mode').value;state=null;try{if(mode==='real')await api();notice(mode==='real'?'Laboratorio conectado.':'Simulación seleccionada.');}catch(e){notice('Sin conexión. Ejecuta node adn-v1/server.cjs y abre su URL local.');}render();};
$('start').onclick=()=>act({action:'start'},()=>{sim.paused=false;});
$('stop').onclick=()=>act({action:'stop'},()=>{sim.paused=true;});
$('submit').onclick=()=>{const id=$('taskId').value||uuid();$('taskId').value=id;act({action:'submit',id,n:10000},()=>sim.addTasks(1));};
function config(alive){const mode=$('permission').value,channel=Number($('channel').value);return {action:'cell',id:selected,mode,channel,alive};}
$('key').onclick=()=>{const alive=mode==='real'?!!state?.cells.find(c=>c.id===selected)?.alive:sim.cell(selected).alive;act(config(alive),()=>sim.setKey(selected,$('permission').value,Number($('channel').value)));};
$('fault').onclick=()=>act(config(false),()=>sim.fail(selected));
$('recover').onclick=()=>act(config(true),()=>sim.recover(selected));
$('export').onclick=()=>{if(mode==='real'&&!state)return notice('Sin resultados reales.');download(mode==='real'?state:sim.report());};
setInterval(async()=>{if(mode==='real'&&!busy){busy=true;try{await api();render();}catch(e){state=null;render();notice('Conexión perdida; no se muestran mediciones antiguas.');}finally{busy=false;}}},1000);
setInterval(()=>{const now=performance.now();if(mode==='simulation'){sim.advance((now-last)/1000);if(!sim.paused)render();}last=now;},100);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='simulation'){sim.paused=true;notice('Simulación pausada al ocultar la página.');}});
render();

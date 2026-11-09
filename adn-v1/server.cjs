'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {Lab}=require('./lab.cjs');
function createServer(dbPath){
 const lab=new Lab(dbPath);
 const files={'/':'index.html','/ui.js':'ui.js','/style.css':'style.css','/engine.js':'../engine.js'};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'");
  try{
   const url=new URL(req.url,'http://localhost');
   if(req.method==='GET' && files[url.pathname]){const f=files[url.pathname];res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8');return res.end(fs.readFileSync(path.join(__dirname,f)));}
   res.setHeader('Content-Type','application/json');
   if(req.method==='GET' && url.pathname==='/api/state')return res.end(JSON.stringify(lab.report()));
   if(req.method!=='POST' || url.pathname!=='/api/action'){res.statusCode=404;return res.end('{}');}
   // Browser CSRF / DNS rebinding boundary for a loopback-only lab.
   if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'') && !/^localhost:\d+$/.test(req.headers.host||''))throw Error('FORBIDDEN_HOST');
   if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`)throw Error('FORBIDDEN_ORIGIN');
   if(req.headers['content-type']!=='application/json')throw Error('JSON_REQUIRED');
   let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw Error('BODY_LIMIT');}
   const m=JSON.parse(body);
   if(m.action==='start')lab.start();
   else if(m.action==='stop')lab.stop();
   else if(m.action==='submit')lab.store.submit(m.id,m.n);
   else if(m.action==='cell')lab.config(m.id,m.mode,m.channel,m.alive);
   else throw Error('INVALID_ACTION');
   res.end(JSON.stringify(lab.report()));
  }catch(e){res.statusCode=e.message.startsWith('FORBIDDEN')?403:400;res.end(JSON.stringify({error:e.message}));}
 });return {server,lab};
}
if(require.main===module){
 const {server,lab}=createServer(process.env.ADN_DB||path.join(__dirname,'lab.sqlite'));
 server.listen(Number(process.env.PORT||8788),'127.0.0.1',()=>console.log(`PHERSAA ADN: http://127.0.0.1:${server.address().port} (loopback only)`));
 process.on('SIGINT',()=>server.close(async()=>{await lab.close();process.exit();}));
 process.on('SIGTERM',()=>server.close(async()=>{await lab.close();process.exit();}));
}
module.exports={createServer};

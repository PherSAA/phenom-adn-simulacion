'use strict';
// Build a standalone simulation review artifact. Real processes require the local server.
const {readFileSync,writeFileSync}=require('node:fs');const {join}=require('node:path');
let html=readFileSync(join(__dirname,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+readFileSync(join(__dirname,'style.css'),'utf8')+'</style>');
for(const [src,file] of [['engine.js','../engine.js'],['ui.js','ui.js']])html=html.replace(`<script src="${src}"></script>`,()=>'<script>'+readFileSync(join(__dirname,file),'utf8')+'</script>');
html=html.replace('<option value="real">Procesos reales · laboratorio local</option>','<option value="real" disabled>Procesos reales · requieren servidor local</option>');
writeFileSync(process.argv[2]||'phersaa-adn-mobile.html',html);

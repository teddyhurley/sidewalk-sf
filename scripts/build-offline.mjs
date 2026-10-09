// Deterministic single-file packaging of the tested browser modules.
// No third-party assets or live APIs are needed for the fictional demo.
import {readFile,writeFile} from 'node:fs/promises';
const modules=['geo','facilities','facility-pins','walk-plans','demo','analysis','block-geometry','report-scope','report-areas','route-metrics','live-comparison','theme'].map(name=>'dist/lib/'+name+'.mjs').concat('dist/app.mjs');
const source=(await Promise.all(modules.map(file=>readFile(file,'utf8')))).map(code=>code.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')).join('\n');
let html=await readFile('dist/index.html','utf8');
const css=await readFile('dist/styles.css','utf8'),icon=await readFile('dist/favicon.svg');
html=html.replace('<html lang="en">','<html lang="en" data-offline-demo>').replace('href="/favicon.svg"',`href="data:image/svg+xml;base64,${icon.toString('base64')}"`).replace('<link rel="stylesheet" href="/styles.css">',()=>'<style>'+css+'</style>').replaceAll('href="/"','href="#"').replace('<script type="module" src="/app.mjs"></script>',()=>'<script type="module">\n'+source.replace(/<\/script/gi,'<\\/script')+'\n</script>');
const target=process.argv[2]||'../sidewalk-demo.html';await writeFile(target,html);console.log('Created the standalone fictional demo.');

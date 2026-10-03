// 既有浏览器回归会写回自己的截图与 JSON，运行前后保留其原字节。
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const preserved=new Map();
for(const folder of ['acceptance-chat-polish','acceptance-map-plan-polish']){
  const directory=path.join(root,folder);
  for(const name of fs.readdirSync(directory)){
    const file=path.join(directory,name);if(fs.statSync(file).isFile())preserved.set(file,fs.readFileSync(file));
  }
}
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(directory,x.name)):[path.join(directory,x.name)]);}
const files=walk(root),results=[];
try{
  for(const [kind,paths] of [['syntax',files.filter(x=>x.endsWith('.js'))],['test',files.filter(x=>x.endsWith('.test.cjs'))]]){
    for(const file of paths){const result=spawnSync(process.execPath,kind==='syntax'?['--check',file]:[file],{encoding:'utf8'});results.push({kind,file:path.relative(root,file),exitCode:result.status,passed:result.status===0,output:result.stdout+result.stderr});}
  }
}finally{for(const [file,bytes] of preserved)fs.writeFileSync(file,bytes);}
const report={observedAt:new Date().toISOString(),jsChecked:results.filter(x=>x.kind==='syntax').length,testFilesRun:results.filter(x=>x.kind==='test').length,failedChecks:results.filter(x=>!x.passed&&x.kind==='syntax').map(x=>x.file),failedTests:results.filter(x=>!x.passed&&x.kind==='test').map(x=>x.file),preservedPreviousEvidence:true,results};
fs.writeFileSync(path.join(__dirname,'test-results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:undefined},null,2));
if(results.some(x=>!x.passed))process.exitCode=1;

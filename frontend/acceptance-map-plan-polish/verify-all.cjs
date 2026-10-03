const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else files.push(p);}}walk(root);
// 全套旧测试会重写第十一批验收文件；恢复开工时已有字节，不混入本批提交。
const old=path.join(root,'acceptance-chat-polish'),before=new Map(fs.readdirSync(old).filter(f=>fs.statSync(path.join(old,f)).isFile()).map(f=>[f,fs.readFileSync(path.join(old,f))]));
const results=[];let preserved;
try{
 for(const [kind,list] of [['syntax',files.filter(f=>f.endsWith('.js'))],['test',files.filter(f=>f.endsWith('.test.cjs'))]])for(const file of list){const run=spawnSync(process.execPath,kind==='syntax'?['--check',file]:[file],{cwd:path.resolve(root,'..'),encoding:'utf8',timeout:120000});results.push({kind,file:path.relative(root,file).replaceAll('\\','/'),exitCode:run.status,stdout:run.stdout?.trim(),stderr:run.stderr?.trim(),error:run.error?.message});console.log((run.status===0?'PASS':'FAIL')+' '+kind+' '+path.basename(file));}
}finally{
 for(const [file,bytes] of before)fs.writeFileSync(path.join(old,file),bytes);
 preserved=[...before].every(([file,bytes])=>crypto.createHash('sha256').update(bytes).digest('hex')===crypto.createHash('sha256').update(fs.readFileSync(path.join(old,file))).digest('hex'));
}
fs.writeFileSync(path.join(__dirname,'all-tests.json'),JSON.stringify({time:new Date().toISOString(),syntax:results.filter(r=>r.kind==='syntax').length,tests:results.filter(r=>r.kind==='test').length,preservedPreviousEvidence:preserved,results},null,2));
if(!preserved||results.some(r=>r.exitCode!==0))process.exitCode=1;

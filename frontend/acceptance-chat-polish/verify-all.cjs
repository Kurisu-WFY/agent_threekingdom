/* 只验证前端：语法、全部测试、联调资源与本地 SHA256、提交范围。 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const frontend=path.resolve(__dirname,'..'),root=path.resolve(frontend,'..');
const git='C:/Program Files/Git/cmd/git.exe';
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
(async()=>{
 const files=walk(frontend),report={generatedAt:new Date().toISOString(),syntax:[],tests:[],resources:[]};
 for(const file of files.filter(f=>f.endsWith('.js'))){const r=cp.spawnSync(process.execPath,['--check',file],{encoding:'utf8'});report.syntax.push({file:path.relative(root,file).replaceAll('\\','/'),exit:r.status,output:r.stdout+r.stderr});}
 for(const file of files.filter(f=>f.endsWith('.test.cjs'))){const r=cp.spawnSync(process.execPath,[file],{encoding:'utf8',timeout:60000});report.tests.push({file:path.relative(root,file).replaceAll('\\','/'),exit:r.status,output:r.stdout+r.stderr});}
 for(const file of ['index.html','app.js','character-chat.js','chenshou-guide.js','cultural-node.js','journal.js','styles.css']){
   const response=await fetch('http://localhost:8002/'+(file==='index.html'?'':file)+'?v=chat-polish11-20261003',{signal:AbortSignal.timeout(10000)});
   const local=hash(fs.readFileSync(path.join(frontend,file))),remote=hash(Buffer.from(await response.arrayBuffer()));
   report.resources.push({file,httpStatus:response.status,local,remote,equal:local===remote});
 }
 const staged=cp.spawnSync(git,['diff','--cached','--name-only'],{cwd:root,encoding:'utf8'}).stdout.trim().split(/\r?\n/).filter(Boolean);
 report.staged=staged;report.stagedOnlyFrontend=staged.every(f=>f.startsWith('frontend/'));
 const check=cp.spawnSync(git,['diff','--check','--','frontend'],{cwd:root,encoding:'utf8'});report.diffCheck={exit:check.status,output:check.stdout+check.stderr};
 report.passed=report.syntax.every(r=>r.exit===0)&&report.tests.every(r=>r.exit===0)&&report.resources.every(r=>r.equal&&r.httpStatus===200)&&report.stagedOnlyFrontend&&report.diffCheck.exit===0;
 fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:report.passed,syntax:report.syntax.length,tests:report.tests.length,resources:report.resources.length,failures:[...report.syntax,...report.tests].filter(r=>r.exit!==0)}));
 if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

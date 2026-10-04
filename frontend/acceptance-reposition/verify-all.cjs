const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]);}
const evidenceDirs=['acceptance-chat-polish','acceptance-map-plan-polish'].map(d=>path.join(root,d));
const snapshots=new Map(evidenceDirs.flatMap(d=>fs.existsSync(d)?files(d).map(p=>[p,fs.readFileSync(p)]):[]));
const unitOnly=process.argv.includes('--unit');const results=[];
try{
 for(const p of files(root).filter(p=>p.endsWith('.js'))){const r=cp.spawnSync(process.execPath,['--check',p],{encoding:'utf8'});results.push({file:path.relative(root,p),kind:'syntax',code:r.status});if(r.status)console.log(r.stderr);}
 for(const p of files(root).filter(p=>p.endsWith('.test.cjs')&&(!unitOnly||!['chat-polish.test.cjs','map-plan-polish.test.cjs'].includes(path.basename(p))))){const r=cp.spawnSync(process.execPath,[p],{encoding:'utf8',timeout:180000});results.push({file:path.relative(root,p),kind:'test',code:r.status});console.log((r.status===0?'PASS':'FAIL')+' '+path.basename(p));if(r.status)console.log((r.stdout+r.stderr).slice(-3500));}
}finally{
 for(const d of evidenceDirs)if(fs.existsSync(d))for(const p of files(d)){if(snapshots.has(p))fs.writeFileSync(p,snapshots.get(p));else fs.unlinkSync(p);}
 const counts=k=>results.filter(r=>r.kind===k);const failures=results.filter(r=>r.code!==0);
 const report={syntax:counts('syntax').length,tests:counts('test').length,failures,results};
 fs.writeFileSync(path.join(__dirname,unitOnly?'unit-verification.json':'verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({syntax:report.syntax,tests:report.tests,failed:failures.length}));if(failures.length)process.exitCode=1;
}

const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
  const files=['index.html','styles.css','landing.js','stories.js'],results=[];
  const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
  for(const file of files){const response=await fetch('http://localhost:8002/'+file,{cache:'no-store'});const local=hash(fs.readFileSync(path.join(__dirname,'..',file))),served=hash(Buffer.from(await response.arrayBuffer()));results.push({file,status:response.status,local,served,match:response.ok&&local===served});}
  fs.writeFileSync(path.join(__dirname,'resource-hashes.json'),JSON.stringify({observedAt:new Date().toISOString(),results},null,2));
  console.log('SHA256 matches: '+results.filter(x=>x.match).length+'/'+results.length);
  if(results.some(x=>!x.match))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});

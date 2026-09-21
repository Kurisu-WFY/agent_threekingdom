const assert = require('node:assert/strict');
const {request} = require('./chat-transport.js');
const encoder = new TextEncoder();
function response(events, crlf=false) {
  const bytes = encoder.encode(events.map(e=>'data: '+JSON.stringify(e)+(crlf?'\r\n\r\n':'\n\n')).join(''));
  return new Response(new ReadableStream({start(c) {
    // Split inside UTF-8 characters and SSE separators.
    for (let i=0;i<bytes.length;i+=3) c.enqueue(bytes.slice(i,i+3));
    c.close();
  }}));
}
(async()=>{
  for (const crlf of [false,true]) {
    const seen=[];
    const result=await request({message:'陈寿'}, e=>seen.push(e), async()=>response([
      {type:'session',session_id:'opaque'}, {type:'delta',text:'南充'},
      {type:'tool',name:'list_scenic_spots',status:'FINISHED'},
      {type:'result',data:{answer:'南充景点',session_id:'opaque'}}],crlf));
    assert.equal(result.answer,'南充景点');assert.equal(seen[1].text,'南充');
  }
  await assert.rejects(request({},()=>{},async()=>response([{type:'delta',text:'未完成'}])),/完整回答/);
  await assert.rejects(request({},()=>{},async()=>response([{type:'error',message:'测试失败'}])),/测试失败/);
  await assert.rejects(request({},()=>{},async()=>new Response('',{status:502})),/502/);
  console.log('PASS SSE: chunked UTF8, LF/CRLF, session/tool events, incomplete/error/HTTP failure');
})().catch(e=>{console.error(e);process.exitCode=1;});

const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync(__dirname+'/styles.css','utf8');
const root=css.slice(css.indexOf(':root {'),css.indexOf('\n}',css.indexOf(':root {'))+2);
const tokens=Object.fromEntries([...root.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
function value(k){const raw=tokens[k];assert.ok(raw,'missing '+k);const alias=/^var\(--([\w-]+)\)$/.exec(raw);return alias?value(alias[1]):raw;}
function luminance(hex){const rgb=hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a,b){const x=luminance(value(a)),y=luminance(value(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const originals=['ink','ink-soft','muted','line','paper','surface','surface-2','shu','shu-2','brass','jade','shadow-lg','shadow-sm','radius','panel-width','layout-duration','layout-easing','history-width','header-height'];
for(const k of [...originals,...Array.from({length:6},(_,i)=>'space-'+(i+1)),...['xs','sm','base','lg','xl','2xl','3xl'].map(x=>'text-'+x),...['map','panel','chat','toast'].map(x=>'z-'+x),...['fast','base','slow'].map(x=>'motion-'+x)])value(k);
let min=Infinity;
for(const fg of ['ink','ink-soft','muted','shu','shu-2','jade','jade-deep','brass-ink'])for(const bg of ['paper','surface','surface-2','jade-soft','brass-soft']){const ratio=contrast(fg,bg);min=Math.min(min,ratio);assert.ok(ratio>=4.5,`${fg}/${bg}: ${ratio.toFixed(2)} < 4.5`);}
for(const bg of ['shu','shu-deep','jade-deep'])assert.ok(contrast('surface',bg)>=4.5);
assert.ok(contrast('status-ink','status-surface')>=4.5);assert.ok(contrast('line-strong','surface')>=3);assert.ok(contrast('focus-ring','paper')>=3);
const outside=css.replace(root,'');assert.equal(/#[a-f\d]{3,8}\b|rgba?\([\d.,\s]+\)/i.test(outside),false,'raw colors must stay in root');
assert.ok(css.includes('min-height:var(--target-size)!important'));
assert.ok(css.includes('--layout-duration:0ms'));assert.ok(css.includes('animation:none!important'));
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const conversationStart=html.indexOf('<section class="conversation">');
const conversation=html.slice(conversationStart,html.indexOf('</aside>',conversationStart));
assert.ok(conversation.indexOf('id="messages"')<conversation.indexOf('id="chat-form"'));
assert.ok(conversation.indexOf('id="chat-form"')<conversation.indexOf('class="chat-options"'));
assert.ok(!/class="demo-note"|class="composer-bottom"/.test(conversation));
assert.ok(html.includes('class="content-footer"'));
assert.ok(/--panel-width:min\(680px,42vw\)/.test(css));
assert.ok(!/body\.chat-open \.content\s*\{[^}]*\b(?:transform|height|margin):/.test(css));
assert.ok(!/body\.chat-open \.content-heading\s*>\s*span\s*\{\s*display:none/.test(css));
assert.ok(/\.composer-send\s*\{[^}]*border-radius:50%/.test(css));
assert.ok(/\.composer textarea\s*\{[^}]*padding:[^;]*64px/.test(css));
console.log('PASS: original token semantics, complete scales, no raw component colors, text AA min='+min.toFixed(2)+', controls/focus >=3, reduced motion and touch target contract');

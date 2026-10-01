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
assert.ok(/data-q="[^"]*门票[^"]*"[^>]*>票价与预算/.test(html));
assert.ok(!/data-q="[^"]*(?:酒店|住宿|房间)/.test(html));
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
assert.ok(/\.composer textarea\s*\{[^}]*padding:[^;]*48px/.test(css));
assert.ok(/\.composer-send\s*\{[^}]*width:32px; height:32px; min-width:32px!important; min-height:32px!important/.test(css));
assert.ok(/@media\(max-width:760px\)\s*\{\s*\.chat-panel \.composer textarea\s*\{[^}]*min-height:56px; padding-right:64px;[^}]*\}\s*\.chat-panel \.composer-send\s*\{[^}]*min-width:44px!important; min-height:44px!important/.test(css));
assert.ok(/\.messages\s*\{[^}]*padding:\s*var\(--space-3\)[^}]*gap:\s*var\(--space-2\)/.test(css));
assert.ok(/\.bubble\s*\{[^}]*padding:\s*var\(--space-2\) var\(--space-3\);\s*font-size:\s*var\(--text-base\);\s*line-height:\s*var\(--leading-body\)/.test(css));
assert.ok(/\.agent-prose p\s*\{\s*margin:var\(--space-1\) 0/.test(css));
assert.ok(/\.character-answer \.module-button\s*\{[^}]*display:inline-flex[^}]*min-height:30px!important[^}]*border-radius:999px/.test(css));
assert.ok(/@media\(max-width:760px\)\s*\{\s*\.character-answer \.module-button\s*\{\s*min-height:var\(--target-size\)!important/.test(css));
assert.ok(/\.character-answer \.character-place-link\s*\{[^}]*min-height:0!important[^}]*margin:0/.test(css));
assert.ok(/\.workspace\s*\{[^}]*transition:padding-right var\(--layout-duration\) var\(--layout-easing\)/.test(css));
assert.ok(/@media\(prefers-reduced-motion:reduce\)[\s\S]*?\*,\*::before,\*::after\s*\{[^}]*transition:none!important/.test(css));
console.log('PASS: original token semantics, complete scales, no raw component colors, text AA min='+min.toFixed(2)+', controls/focus >=3, reduced motion and touch target contract');

assert.ok(/\.meta\s*\{[^}]*flex-wrap:\s*nowrap/.test(css),'N13 metadata is a single line');
assert.ok(/\.trust-info\s*\{[^}]*flex-wrap:\s*nowrap/.test(css));
assert.ok(/\.tag\[data-trust-state=unverified\]\s*\{[^}]*font-size:var\(--text-xs\)/.test(css));

assert.equal(value('font-chat'),'-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif');
assert.ok(contrast('chat-ink','surface-2')>=7,'chat contrast AAA');
assert.ok(/\.agent-prose h2\s*\{[^}]*font-weight:700/.test(css));
assert.ok(/\.agent-prose h4\s*\{[^}]*font-weight:600/.test(css));
assert.ok(!/fonts\.googleapis|fonts\.gstatic|@font-face/.test(css+html));

assert.ok(luminance(value('composer-surface'))<luminance(value('surface')));
assert.ok(contrast('muted','composer-surface')>=4.5);
assert.ok(/\.composer textarea\s*\{[^}]*border:0/.test(css));
assert.ok(/\.composer textarea:focus\s*\{[^}]*outline:[^;]*var\(--focus-ring\)/.test(css));
assert.ok(/\.content-switch button\[aria-current="location"\]\s*\{[^}]*background:var\(--jade-soft\)/.test(css));

for(const [name,base] of Object.entries({city:13,county:11,route:10,chapter:13,stamp:11,story:12,footprint:8}))
  assert.equal(value('map-text-'+name),base+'px','map label base size '+name);
for(const [selector,token] of [['city-label','city'],['county-label','county'],['route-number','route'],['story-map-label','story']]){
  const blocks=[...css.matchAll(new RegExp('(?:^|})\\s*\\.'+selector+'\\s*\\{([^}]*)\\}','gm'))].map(m=>m[1]);
  assert.equal(blocks.filter(b=>/\bfont-size\s*:/.test(b)).length,1,selector+' font size has one source');
  assert.ok(blocks.every(b=>!/\bfont\s*:/.test(b)),selector+' must not also set font shorthand');
  assert.ok(blocks.some(b=>b.includes('font-size:calc(var(--map-text-'+token+') * var(--map-unit,1))')),selector+' compensates viewport scale');
}
for(const selector of ['chapter-number-text','chapter-complete-stamp']){
  const blocks=[...css.matchAll(new RegExp('(?:^|})\\s*\\.'+selector+'\\s*\\{([^}]*)\\}','gm'))].map(m=>m[1]);
  assert.equal(blocks.filter(b=>/\bfont-size\s*:/.test(b)).length,1);
  assert.ok(blocks.every(b=>!/\bfont\s*:/.test(b)));
}
assert.ok(css.includes('counter-scaled story glyph'),'chapter and stamp text inherit a screen-sized glyph');

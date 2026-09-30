/* 手动浏览器回归：不由产品页面加载。只使用渲染夹具，不调用后端。 */
(() => {
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const q=selector=>document.querySelector(selector), style=node=>getComputedStyle(node);
  function assert(ok,label) { if(!ok) throw new Error(label); }
  function contrast(a,b) {
    const lum=value=>{const c=value.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
    const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
  }
  window.runRound4Acceptance=async () => {
    const report={width:innerWidth};
    const oldOpen=!q('#chat-panel').hidden,oldView=currentContentView;
    const savedScroll=[...document.querySelectorAll('[data-view-panel]')].map(n=>[n,n.scrollTop]);
    const oldY=scrollY;
    try {
      toggleChat(true);await wait(500);
      const fixture={role:'assistant',persona:'诸葛亮',text:'## 剑门关与三国文化\n### 走进关楼\n#### 从材料开始\n**剑门关**与阆中，可以从人物和地点理解。\n- 第一段说明\n- 第二段说明\n| 名称 | 状态 |\n| --- | --- |\n| 剑门关 | 待核验 |',data:{intent:{intent:'culture_qa'},data_status:'sample',sources:[{title:'公开资料标题（仅渲染夹具）',source_url:'https://example.com',source_level:'C'}]}};
      q('#messages').replaceChildren(...['陈寿','诸葛亮','张飞'].map(persona=>messageNode({...fixture,persona})),messageNode({role:'user',text:'我想了解这个地方。'}));
      const answer=q('.character-answer');
      assert(!answer.querySelector('.character-evidence,.character-sources,.character-raw,details'),'N12/N14 evidence wrappers');
      assert(!/AI解读，非人物原话|展开来源|当前资料中未找到可靠记载/.test(answer.innerText),'N12/N14 injected text');
      assert(answer.querySelector('h2')&&answer.querySelector('ul')&&answer.querySelector('table')&&answer.querySelector('.character-place-link'),'N14 Markdown and inline place links');
      report.N12_N14={wrappers:0,markdown:'heading/list/table/place links'};
      const names=[...document.querySelectorAll('.message-name')].map(n=>n.innerText);
      assert(names.join(',')==='陈寿,诸葛亮,张飞,你','N17 immutable persona names');
      for(const row of document.querySelectorAll('.message')) {
        const identity=row.querySelector('.message-identity').getBoundingClientRect(),body=row.querySelector('.body').getBoundingClientRect(),bounds=row.getBoundingClientRect();
        assert(body.left>=bounds.left-1&&body.right<=bounds.right+1,'N17 bubble within message');
        assert(row.classList.contains('user')?body.right<=identity.left:identity.right<=body.left,'N17 identity/body alignment');
        assert(style(row.querySelector('.message-name')).whiteSpace==='nowrap','N17 name no wrapping');
      }
      report.N17=names;
      for(const meta of document.querySelectorAll('.meta')) {
        assert(style(meta).flexWrap==='nowrap','N13 metadata no wrapping');
        const tagHeight=Math.max(...[...meta.querySelectorAll('.tag')].map(n=>n.offsetHeight));
        assert(meta.offsetHeight<=tagHeight+18,'N13 metadata height single line plus scrollbar');
        assert(style(meta.querySelector('.trust-info')).flexWrap==='nowrap','N13 trust no wrapping');
        assert(meta.querySelector('.trust-info').offsetHeight<=tagHeight+1,'N13 trust height single line');
        for(const tag of meta.querySelectorAll('.tag'))assert(parseFloat(style(tag).fontSize)<=12,'N13 all tags <=12px');
        if(meta.scrollWidth>meta.clientWidth) { meta.scrollLeft=meta.scrollWidth;assert(meta.scrollLeft>0,'N13 horizontal scrolling'); }
      }
      report.N13={metaHeight:q('.meta').offsetHeight,tagHeight:q('.tag').offsetHeight,scrollWidth:q('.meta').scrollWidth,clientWidth:q('.meta').clientWidth};
      const prose=q('.agent-prose'),bubble=q('.bubble'),font=style(prose).fontFamily;
      assert(font.startsWith('-apple-system')&&font.includes('Segoe UI')&&!/Noto Serif|Songti/.test(font),'N15 DSH font');
      assert(parseFloat(style(bubble).fontSize)>=16,'N15 size');
      assert(style(q('.message.user .bubble')).color===style(bubble).color,'N15 user正文近黑');
      for(const pending of answer.querySelectorAll('[data-trust-state=unverified]'))assert(parseFloat(style(pending).fontSize)>=16&&style(pending).color===style(bubble).color,'N15 inline pending正文');
      const ratio=contrast(style(bubble).color,style(bubble).backgroundColor);
      assert(ratio>=7,'N15 contrast');
      const headings=[...prose.querySelectorAll('h2,h3,h4')].map(n=>({tag:n.tagName,size:parseFloat(style(n).fontSize),weight:parseFloat(style(n).fontWeight)}));
      assert(headings[0].size>headings[1].size&&headings[1].size>headings[2].size&&headings.every(n=>n.weight>=(n.tag==='H4'?600:700)),'N15 hierarchy');
      report.N15={font,size:style(bubble).fontSize,contrast:ratio,headings};
      const input=q('#message');input.blur();
      assert(parseFloat(style(input).borderWidth)===0,'N16 border removed');
      const placeholder=contrast(getComputedStyle(input,'::placeholder').color,style(input).backgroundColor);
      assert(placeholder>=4.5,'N16 placeholder contrast');
      input.focus({preventScroll:true});assert(parseFloat(style(input).outlineWidth)>0&&style(input).outlineStyle!=='none','N16 visible focus');
      report.N16={background:style(input).backgroundColor,border:style(input).borderWidth,focus:style(input).outlineWidth,placeholderContrast:placeholder,sendWidth:q('.composer-send').getBoundingClientRect().width};
      input.blur();
      report.N10_close=[];
      for(const method of ['launcher','close','Escape']) {
        toggleChat(false);await wait(500);showContentView('welcome');q('#welcome-view').scrollTop=240;
        toggleChat(true);await wait(500);q('#welcome-view').scrollTop=640;
        if(method==='Escape')document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        else q(method==='launcher'?'#launcher':'#close-chat').click();
        await wait(500);
        assert(Math.abs(q('#welcome-view').scrollTop-240)<=2,'N10/N9 internal position restore '+method);
        assert(q('#chat-panel').hidden&&document.activeElement===q('#launcher'),'N10/N9 close state and focus '+method);
        report.N10_close.push({method,innerTop:q('#welcome-view').scrollTop});
      }
      report.N10=[];
      for(const opened of [false,true]) {
        toggleChat(opened);await wait(500);window.scrollTo({top:20,behavior:'instant'});
        const tops=[];
        for(const view of ['map','story','journal','welcome','map','welcome']) { showContentView(view);await wait(250);tops.push(q('.content').getBoundingClientRect().top); }
        const delta=Math.max(...tops)-Math.min(...tops);assert(delta<=2,'N10 stable content top');
        const welcome=q('#welcome-view');welcome.scrollTop=welcome.scrollHeight;
        assert(Math.abs(welcome.scrollTop-(welcome.scrollHeight-welcome.clientHeight))<2,'N10 bottom reachable');
        report.N10.push({opened,delta,bottom:welcome.scrollTop});
      }
      toggleChat(false);await wait(500);showContentView('welcome');q('#welcome-view').scrollTop=0;window.scrollTo({top:0,behavior:'instant'});await wait(300);
      const brand=q('.brand'),header=q('.topbar'),baseWidth=brand.getBoundingClientRect().width,headerHeight=header.getBoundingClientRect().height;
      window.scrollTo({top:20,behavior:'instant'});await wait(300);
      const documentScroll=scrollY>4;
      if(!documentScroll) { q('#welcome-view').scrollTop=100;await wait(300); }
      assert(parseFloat(style(brand).opacity)<1&&brand.getBoundingClientRect().width<baseWidth,'N11 scrolled brand');
      assert(header.getBoundingClientRect().height===headerHeight,'N11 header height unchanged');
      const compactWidth=brand.getBoundingClientRect().width;
      window.scrollTo({top:0,behavior:'instant'});q('#welcome-view').scrollTop=0;await wait(300);
      assert(style(brand).opacity==='1'&&Math.abs(brand.getBoundingClientRect().width-baseWidth)<1,'N11 top recovery');
      q('#welcome-view').scrollTop=100;await wait(300);assert(header.classList.contains('is-scrolled'),'N11 internal scroll');
      q('#welcome-view').scrollTop=0;await wait(300);assert(!header.classList.contains('is-scrolled'),'N11 internal top recovery');
      if(matchMedia('(prefers-reduced-motion: reduce)').matches)assert(style(brand).transitionDuration==='0s','N11 reduced motion');
      report.N11={baseWidth,compactWidth,headerHeight,documentScroll,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
      assert(document.documentElement.scrollWidth<=innerWidth,'global no document overflow');
      report.overflow=false;
      return report;
    } finally {
      render();showContentView(oldView);savedScroll.forEach(([node,top])=>{node.scrollTop=top;});toggleChat(oldOpen);window.scrollTo({top:oldY,behavior:'instant'});
    }
  };
})();

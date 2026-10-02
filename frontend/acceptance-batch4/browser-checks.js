// 专项开发验收脚本；产品页不自动加载。1920×1080，按阶段重放。
(() => {
  const q=s=>document.querySelector(s), wait=ms=>new Promise(r=>setTimeout(r,ms));
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  window.runBatch4VisualChecks=async stage=>{
    assert(innerWidth===1920&&innerHeight===1080,'第四批只验收1920×1080');
    await window.TravelMap.ready;
    const oldView=[...document.querySelectorAll('[data-view-panel]')].find(e=>!e.hidden&&!e.hasAttribute('data-node-source'))?.dataset.viewPanel||'welcome',oldOpen=document.body.classList.contains('chat-open');
    const oldTop=q('#welcome-view').scrollTop;
    const report={viewport:[innerWidth,innerHeight]};
    try {
      if(stage==='outline') {
        const lines=[...document.querySelectorAll('.city-outline')];
        assert(lines.length===21,'21个市州轮廓保持');
        report.widths=lines.map(l=>({selected:l.classList.contains('boundary-selected'),width:parseFloat(getComputedStyle(l).strokeWidth),vector:getComputedStyle(l).vectorEffect}));
        assert(report.widths.every(l=>l.width>=2.5&&l.vector==='non-scaling-stroke'),'F3市州粗线保持屏幕宽度');
        const normal=report.widths.find(l=>!l.selected),selected=report.widths.find(l=>l.selected);
        if(selected)assert(selected.width>normal.width,'F3选中市州更粗');
      }
      if(stage==='header') {
        report.height=q('.topbar').offsetHeight;assert(report.height===48,'F4顶栏48px');
        report.states=[];
        for(const open of [false,true]){
          toggleChat(open);await wait(550);
          const parts=['.brand','.topbar-center','.status'].map(s=>{const e=q(s),r=e.getBoundingClientRect();return {name:s,left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height};});
          assert(parts.every(p=>p.top>=0&&p.bottom<=48&&p.right<=1920),'F4三项单行不溢出');
          assert(parts.slice(1).every((p,i)=>p.left>=parts[i].right),'F4三项不相交');
          assert(document.documentElement.scrollWidth<=1920&&document.documentElement.scrollHeight<=1080,'F4文档无多余滚动');
          report.states.push({open,parts,content:q('.content').offsetHeight,workspace:q('.workspace').offsetHeight,documentHeight:document.documentElement.scrollHeight});
        }
      }
      if(stage==='brand') {
        toggleChat(false);showContentView('welcome');q('#welcome-view').scrollTop=0;await wait(350);
        const brand=q('.brand'),base=brand.getBoundingClientRect().width;
        q('#welcome-view').scrollTop=100;await wait(350);
        const after=brand.getBoundingClientRect().width;
        assert(q('.topbar').classList.contains('is-scrolled'),'F5真实内部滚动状态');
        assert(Math.abs(base-after)<0.1&&getComputedStyle(brand).transform==='none','F5滚动品牌不缩放');
        report.brand={before:base,after,opacity:getComputedStyle(brand).opacity,transform:getComputedStyle(brand).transform};
      }
      if(stage==='logo') {
        const logo=q('.brand-mark'),s=getComputedStyle(logo);
        report.logo={width:logo.offsetWidth,height:logo.offsetHeight,radius:s.borderRadius,background:s.background,fontSize:s.fontSize,fontWeight:s.fontWeight};
        assert(logo.offsetWidth===29&&logo.offsetHeight===29&&parseFloat(s.borderRadius)===8,'F6圆润正方形尺寸与8px圆角');
        assert(s.fontWeight==='700'&&s.fontSize==='18px'&&s.background.includes('rgb(156, 43, 37)')&&s.background.includes('rgb(173, 59, 48)'),'F6配色字号字重保持');
      }
      return report;
    } finally {showContentView(oldView);toggleChat(oldOpen);q('#welcome-view').scrollTop=oldTop;}
  };
})();

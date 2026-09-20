/* Versioned device-local exploration records; no account or location verification. */
(() => {
  'use strict';
  const key = 'sgt.story-progress.v1', records = new Map(), listeners = [];
  let saved = {}, available = true;
  try { saved = JSON.parse(window.localStorage.getItem(key) || '{}'); if (!saved || Array.isArray(saved) || typeof saved !== 'object') saved = {}; }
  catch (_) { available = false; }
  const signature = story => JSON.stringify((story.chapters || []).map(c => [c.id || '', c.placeId, c.name]));
  function get(story) {
    const sig = signature(story), n = (story.chapters || []).length;
    if (records.get(story.id)?.signature === sig) return records.get(story.id);
    const raw = saved[story.id]?.signature === sig ? saved[story.id] : {};
    const valid = xs => new Set(Array.isArray(xs) ? xs.filter(i => Number.isInteger(i) && i >= 0 && i < n) : []);
    const s = { signature: sig, current: Number.isInteger(raw.current) && raw.current >= 0 && raw.current < n ? raw.current : 0,
      completed: valid(raw.completed), skipped: valid(raw.skipped), asked: new Set(), started: raw.started === true,
      mode: ['大众体验版','亲子故事版','学术探索版'].includes(raw.mode) ? raw.mode : '大众体验版' };
    if (n && s.skipped.size === n) s.skipped.clear();
    if (s.skipped.has(s.current)) s.current = (story.chapters || []).findIndex((_, i) => !s.skipped.has(i));
    records.set(story.id, s); return s;
  }
  function save(story) {
    const s = get(story);
    saved[story.id] = {signature:s.signature,current:s.current,completed:[...s.completed],skipped:[...s.skipped],started:s.started,mode:s.mode};
    try { window.localStorage.setItem(key, JSON.stringify(saved)); available = true; } catch (_) { available = false; }
    listeners.forEach(fn => fn(story));
  }
  function status(story) { const s=get(story), n=(story.chapters || []).length; return n && s.completed.size===n ? '已寻迹' : s.started || s.completed.size ? '探索中' : '未开始'; }
  function choose(story, kept) {
    const n=(story.chapters || []).length, valid=new Set(kept.filter(i=>Number.isInteger(i)&&i>=0&&i<n));
    if (!valid.size) return false;
    const s=get(story); s.skipped=new Set((story.chapters || []).map((_,i)=>i).filter(i=>!valid.has(i)));
    if(s.skipped.has(s.current)) s.current=[...valid][0]; save(story); return true;
  }
  window.StoryProgress = {get,save,status,choose,subscribe:fn=>listeners.push(fn),
    notice:()=>available ? '探索进度仅保存在此浏览器本地，未与账号或后端同步；手动记录不代表实际到访。' : '本地存储不可用，探索进度仅本页保留；未与账号或后端同步。'};
})();

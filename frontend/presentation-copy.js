/* 游客文案适配：只改显示措辞，不改原始回答、数据状态或核查结论。 */
(function (root) {
  const phrases = [
    ['数据库坐标尚未核验，不能用于精确落点或导航。', '地点位置仅供概览；实际导航请使用高德地点搜索。'],
    ['回答提及的文献出处尚未核验，请勿作为已核验引文。', '文献引用请结合原始文献阅读，不作为直接引文使用。'],
    ['实时信息出处尚未核验，请查询最新预报。', '出行前请查看最新预报。'],
    ['坐标待核验，暂不能定位', '地点位置仅供概览，请通过高德搜索定位'],
    ['坐标和可行性仍未核验', '地点位置与行程可行性仅供参考'],
    ['坐标待核验', '位置仅供概览'],
    ['位置待核验', '位置仅供概览'],
    ['入口待核验', '入口请以地图及现场指引为准'],
    ['开放时间及票价须核验', '开放时间及票价以景区公告为准'],
    ['开放时间及票价仍需核验', '开放时间及票价以景区公告为准'],
    ['景区坐标、开放时间与票价待核验', '地点位置仅供概览；开放时间与票价以景区公告为准'],
    ['开放时段等实时信息仍需核验', '开放时段请以景区当日公告为准'],
    ['开放时段等实时信息仍待核验', '开放时段请以景区当日公告为准'],
    ['开放时间：待核验', '开放时间：以景区当日公告为准'],
    ['更新时间 · 待核验', '更新时间 · 未提供'],
    ['来源链接待核验', '请查阅原始文献'],
    ['来源等级 · 待核验', '来源等级 · 未标注'],
    ['来源 · 待核验', '参考资料'],
    ['史料仍需核验', '史料请结合原始文献阅读'],
    ['史料待核验', '史料阅读参考'],
    ['现实可行性待核验', '行程安排供讨论参考'],
    ['仍需核验', '仅供参考'], ['仍待核验', '仅供参考'],
    ['尚未核验', '仅供参考'], ['尚未验证', '仅供参考'],
    ['未核验', '仅供参考'], ['未验证', '仅供参考'],
    ['待核验', '供参考'], ['待验证', '供参考'],
    ['需再核验', '请结合来源阅读'], ['需要核验', '请结合来源阅读'], ['需核验', '请结合来源阅读']
  ];
  function humanize(value) {
    return phrases.reduce((text, [from, to]) => text.split(from).join(to), String(value ?? ''));
  }
  const excluded = 'script,style,textarea,input,select,pre,code,blockquote,.message.user,[contenteditable],[data-preserve-copy]';
  function refresh(scope) {
    if (!scope || scope.nodeType !== 1 || scope.closest(excluded)) return;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode;
      if (text.parentElement?.closest(excluded)) continue;
      const next = humanize(text.nodeValue);
      if (next !== text.nodeValue) text.nodeValue = next;
    }
  }
  function start() {
    refresh(document.body);
    const observer = new MutationObserver(records => {
      const scopes = new Set();
      for (const record of records) {
        if (record.type === 'characterData') scopes.add(record.target.parentElement);
        else for (const added of record.addedNodes) scopes.add(added.nodeType === 1 ? added : added.parentElement);
      }
      scopes.forEach(refresh);
    });
    observer.observe(document.body, {childList: true, subtree: true, characterData: true});
  }
  root.TouristCopy = {humanize, refresh};
  if (typeof module !== 'undefined') module.exports = root.TouristCopy;
  if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
    else start();
  }
})(typeof window === 'undefined' ? globalThis : window);

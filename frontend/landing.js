// 所有旅程入口共用现有会话和 /chat 请求流程。
(() => {
  const $ = selector => document.querySelector(selector);
  const field = $('#hero-message'), submit = $('#hero-send');
  const modes = {
    plan: ['想去哪里，和谁一起出发？', '告诉我时间、出发地和兴趣，一起梳理游览顺序。', '例如：带孩子从南充出发，玩两天，想去阆中，少走路、多听三国故事。'],
    culture: ['眼前的山河，藏着什么故事？', '可以问人物、事件或景点；请向导区分正史与演义，说明资料依据。', '例如：陈寿为什么写《三国志》？万卷楼与他有什么关系？'],
    character: ['如果能问古人，你想问什么？', '这是基于资料的 AI 人物解读，不是历史人物原话；不确定的内容应明确说明。', '例如：我想问张飞，他与阆中有什么关系？哪些是史实，哪些来自演义？'],
    review: ['这一程，你想怎样调整？', '说说走过的地方、喜欢的故事或新的需求，在当前对话中继续完善。', '例如：把刚才的路线改得轻松一点，少走路，多留时间听陈寿的故事。']
  };
  let mode = 'plan';
  const drafts = {};
  function update() { submit.disabled = !field.value.trim(); }
  function switchMode(next) {
    if (!modes[next] || next === mode) return;
    drafts[mode] = field.value;
    mode = next;
    field.value = drafts[mode] || '';
    $('#journey-question-label').textContent = modes[mode][0];
    $('#journey-mode-hint').textContent = modes[mode][1];
    field.placeholder = modes[mode][2];
    document.querySelectorAll('[data-journey-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.journeyMode === mode)));
    $('#journey-feedback').textContent = field.value ? '已恢复这个主题的草稿。' : '已切换主题，其他主题的草稿仍在本页保留。';
    update();
  }
  function ask(question, options = {}) {
    if (!question.trim()) return;
    toggleChat(true);
    if (chats[active].pending) {
      // 追加内容，不覆盖尚未发送的会话草稿。
      const summary=options.displayText || question;
      input.value = input.value.trim() ? input.value + '\n\n' + summary : summary;
      if(options.displayText)(chats[active].draftRequests ||= []).push({summary,question,options});
      if(options.activityPlan)chats[active].draftActivityPlan={question,activityPlan:options.activityPlan};
      saveDraft(); updateComposer();
      $('#journey-feedback').textContent = '向导正在回答，新问题已放入对话草稿，稍后可发送。';
    } else { send(question, options); $('#journey-feedback').textContent = '已交给向导，可以在对话中继续追问。'; }
  }
  window.SGTJourney = { ask };
  field.addEventListener('input', update);
  $('#hero-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!field.value.trim()) return;
    const preferences = [];
    if ($('#journey-profile').value) preferences.push('同行方式：' + $('#journey-profile').value);
    if ($('#journey-style').value) preferences.push('讲解偏好：' + $('#journey-style').value);
    if (mode === 'character') preferences.push('请基于史料解读人物，区分史实、演义与推测，不编造人物原话。');
    const question = field.value.trim() + (preferences.length ? '\n\n' + preferences.join('；') : '');
    ask(question,{displayText:field.value.trim()+(preferences.length?'（'+preferences.filter(p=>!p.startsWith('请基于')).join('；')+'）':'')}); field.value = ''; drafts[mode] = ''; update();
  });
  document.querySelectorAll('[data-journey-mode]').forEach(button => button.addEventListener('click', () => switchMode(button.dataset.journeyMode)));
  document.querySelectorAll('[data-agent-question]').forEach(button => button.addEventListener('click', () => ask(button.dataset.agentQuestion)));
  function prepare(next) {
    switchMode(next);
    const desk = $('#journey-desk');
    const disclosure = desk.closest('details');
    if (disclosure) disclosure.open = true;
    desk.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    field.focus({ preventScroll: true });
  }
  $('[data-prepare-character]').addEventListener('click', () => prepare('character'));
  $('[data-prepare-review]').addEventListener('click', () => prepare('review'));
  update();
})();

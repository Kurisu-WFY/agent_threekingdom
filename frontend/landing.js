// The homepage is another entrance into the same chat state and /chat request flow.
(() => {
  const field = document.querySelector('#hero-message');
  const submit = document.querySelector('#hero-send');
  function update() { submit.disabled = !field.value.trim(); }
  function ask(question) {
    if (!question.trim()) return;
    toggleChat(true);
    if (chats[active].pending) {
      input.value = question; saveDraft(); updateComposer();
    } else { send(question); }
  }
  field.addEventListener('input', update);
  document.querySelector('#hero-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!field.value.trim()) return;
    ask(field.value.trim()); field.value = ''; update();
  });
  document.querySelectorAll('[data-agent-question]').forEach(button => button.addEventListener('click', () => ask(button.dataset.agentQuestion)));
  update();
})();

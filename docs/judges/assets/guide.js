
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const feature = document.body.dataset.feature;
  const storageKey = 'futureai-judge-progress-v1';
  const readProgress = () => { try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; } };
  const writeProgress = (value) => localStorage.setItem(storageKey, JSON.stringify(value));
  const toast = (message) => { const node = $('[data-toast]'); if (!node) return; node.textContent = message; node.classList.add('show'); clearTimeout(window.__guideToast); window.__guideToast = setTimeout(() => node.classList.remove('show'), 1800); };
  $$('[data-print]').forEach(button => button.addEventListener('click', () => window.print()));
  const sections = $$('.manual-page');
  const seen = new Set();
  const updateSectionProgress = () => { const total = sections.length; const label = $('[data-progress-label]'); const bar = $('[data-progress-bar]'); if (label) label.textContent = seen.size + ' / ' + total; if (bar) bar.style.width = (seen.size / total * 100) + '%'; };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) return; entry.target.classList.add('visible'); seen.add(entry.target.id); const nav = $('[data-nav-section="' + entry.target.id + '"]'); if (nav) nav.classList.add('seen'); $$('.guide-nav nav a').forEach(a => a.classList.toggle('active', a === nav)); updateSectionProgress(); }), { threshold: .34 });
    sections.forEach(section => observer.observe(section));
  } else { sections.forEach(section => section.classList.add('visible')); }
  $$('[data-guide-step]').forEach(card => { const button = $('.hotspot', card); if (button) button.addEventListener('click', () => { card.classList.toggle('done'); toast(card.classList.contains('done') ? '這一步已完成' : '已取消完成標記'); }); });
  $$('[data-complete-guide]').forEach(button => button.addEventListener('click', () => { if (!feature) return; const progress = readProgress(); progress[feature] = true; writeProgress(progress); toast('本功能已標記完成，可以前往下一份教學'); button.textContent = '✓ 已完成'; }));

  const learning = $('[data-simulator="learning"]');
  if (learning) {
    const update = () => { const force = Number($('[data-force]', learning).value); const mass = Number($('[data-mass]', learning).value); $('[data-force-out]', learning).textContent = force + ' N'; $('[data-mass-out]', learning).textContent = mass + ' kg'; $('[data-acceleration]', learning).textContent = (force / mass).toFixed(1); learning.style.setProperty('--sim-distance', Math.min(250, force / mass * 42) + 'px'); };
    $$('input[type=range]', learning).forEach(input => input.addEventListener('input', update)); update();
    $('[data-sim-play]', learning).addEventListener('click', () => { const cart = $('[data-cart]', learning); cart.style.transform = 'translateX(var(--sim-distance))'; setTimeout(() => cart.style.transform = 'translateX(0)', 1200); });
  }
  const resources = $('[data-simulator="resources"]');
  if (resources) {
    let category = '';
    const update = () => { const checks = $$('[data-resource-condition]', resources).filter(x => x.checked).length; const status = $('[data-resource-status]', resources); const copy = $('[data-resource-copy]', resources); const result = $('[data-resource-result]', resources); status.textContent = category ? (checks === 2 ? '可能符合' : '待確認條件') : '待選擇'; copy.textContent = category ? '目前選擇：' + category + '。補充情況後，系統會整理候選資源。' : '請先選擇最接近的需求類別。'; result.textContent = category === '就學' && checks === 2 ? '就學貸款與助學資源｜可能符合｜下一步：向學校承辦窗口確認。' : category ? category + '資源｜仍需補充所在地與需求條件。' : '選擇「就學」並勾選情況，看看推薦如何改變。'; };
    $$('[data-category]', resources).forEach(button => button.addEventListener('click', () => { category = button.dataset.category; $$('[data-category]', resources).forEach(x => x.classList.toggle('active', x === button)); update(); }));
    $$('[data-resource-condition]', resources).forEach(input => input.addEventListener('change', update));
  }
  const alerts = $('[data-simulator="alerts"]');
  if (alerts) {
    const updateUnread = () => $('[data-unread]', alerts).textContent = $$('[data-alert-card]:not(.read)', alerts).length;
    $$('[data-alert-tab]', alerts).forEach(button => button.addEventListener('click', () => { $$('[data-alert-tab]', alerts).forEach(x => x.classList.toggle('active', x === button)); $$('[data-alert-card]', alerts).forEach(card => card.hidden = button.dataset.alertTab !== 'all' && card.dataset.type !== button.dataset.alertTab); }));
    $$('[data-mark-read]', alerts).forEach(button => button.addEventListener('click', () => { button.closest('[data-alert-card]').classList.add('read'); button.textContent = '已讀'; updateUnread(); }));
  }
  const teacher = $('[data-simulator="teacher"]');
  if (teacher) {
    $$('[data-topic]', teacher).forEach(button => button.addEventListener('click', () => { $$('[data-topic]', teacher).forEach(x => x.classList.toggle('active', x === button)); $('[data-topic-choice]', teacher).textContent = button.dataset.topic; $('[data-plan-status]', teacher).textContent = button.dataset.count + ' 次卡點訊號'; }));
    $('[data-plan]', teacher).addEventListener('click', event => { event.currentTarget.textContent = '✓ 已加入複習計畫'; $('[data-plan-status]', teacher).textContent = '已安排'; });
  }
  const government = $('[data-simulator="government"]');
  if (government) $$('[data-region]', government).forEach(button => button.addEventListener('click', () => { $$('[data-region]', government).forEach(x => x.classList.toggle('active', x === button)); $('[data-event-total]', government).textContent = button.dataset.events; $('[data-need-total]', government).textContent = button.dataset.needs; $('[data-region-copy]', government).textContent = button.dataset.region + ' · 聚合資料，不含姓名或原始對話'; $$('.mini-trend i', government).forEach((bar, index) => bar.style.height = (35 + ((Number(button.dataset.needs) + index * 13) % 43)) + '%'); }));

  const progress = readProgress();
  if (feature && progress[feature]) $$('[data-complete-guide]').forEach(button => button.textContent = '✓ 已完成');
})();

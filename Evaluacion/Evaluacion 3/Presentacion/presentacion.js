/* Motor de la presentación: pantallas, pasos dentro de cada pantalla, índice, notas y contadores.
   Cada pantalla emite «slideenter» al mostrarse y «slidestep» al avanzar un paso. */
(() => {
  'use strict';
  const slides = window.TERRA_SLIDES, deck = document.getElementById('deck');
  if (!slides?.length) { deck.textContent = 'No se pudo cargar la presentación. Conserva index.html y los demás archivos en la misma carpeta.'; return; }
  const bare = new Set(['cover', 'divider', 'closing']);
  deck.innerHTML = slides.map((s, i) => {
    const foot = (s.cls || '').split(' ').some(c => bare.has(c)) ? '' :
      `<div class="foot"><b>${String(i + 1).padStart(2, '0')}</b><span>TerraSense · Tecnologías Aplicadas a los Sistemas Inteligentes · Evaluación 3</span><img src="assets/inacap.png" alt=""></div>`;
    return `<section id="s-${s.id}" class="slide ${s.cls || ''}" aria-label="${i + 1}. ${s.title}" ${i ? 'hidden' : ''}>${s.html}${foot}</section>`;
  }).join('');
  const panels = [...deck.querySelectorAll('.slide')];
  const indexDialog = document.getElementById('index-dialog'), notesDialog = document.getElementById('notes-dialog');
  const $ = id => document.getElementById(id);
  let current = 0, step = 0;
  const stepsOf = i => slides[i].steps || 0;
  const esc = s => s.replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  $('index-items').innerHTML = slides.map((s, i) => `<button data-index="${i}"><span>${String(i + 1).padStart(2, '0')}</span><span>${s.title}</span></button>`).join('');

  // Contadores: <b data-count="175556" data-dec="0" data-suffix=" %">. Corren cuando quedan visibles.
  const fmtNum = (v, d) => v.toLocaleString('es-CL', {minimumFractionDigits: d, maximumFractionDigits: d});
  function runCounters(panel) {
    panel.querySelectorAll('[data-count]').forEach(el => {
      if (el.dataset.done === '1' || el.closest('.is-hidden')) return;
      el.dataset.done = '1';
      const target = Number(el.dataset.count), d = Number(el.dataset.dec || 0), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      const t0 = performance.now(), dur = Number(el.dataset.dur || 1400);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = pre + fmtNum(target, d) + suf; return; }
      const tick = now => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3;
        el.textContent = pre + fmtNum(target * e, d) + suf;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  function resetCounters(panel) { panel.querySelectorAll('[data-count]').forEach(el => { el.dataset.done = ''; el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || ''); }); }

  function setStep(k) {
    step = Math.max(0, Math.min(stepsOf(current), k));
    const panel = panels[current], total = stepsOf(current);
    panel.dataset.step = step;
    panel.querySelectorAll('[data-reveal]').forEach(e => e.classList.toggle('is-hidden', Number(e.dataset.reveal) > step));
    panel.dispatchEvent(new CustomEvent('slidestep', {detail: {step}}));
    runCounters(panel);
    $('counter').textContent = `${current + 1} / ${slides.length}` + (total ? `  ${'●'.repeat(step + 1)}${'○'.repeat(total - step)}` : '');
    $('next').disabled = current === slides.length - 1 && step === total;
    $('previous').disabled = current === 0 && step === 0;
  }
  // initialStep: 0 al avanzar con la flecha; sin indicarlo, la pantalla aparece completa.
  function show(index, focus = false, initialStep = Infinity) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    panels.forEach((p, i) => {
      if (i === current) return;
      p.hidden = true; p.classList.remove('is-active');
      p.querySelectorAll('video').forEach(v => v.pause());
    });
    const panel = panels[current], s = slides[current];
    panel.hidden = false; panel.classList.remove('is-active');
    void panel.offsetWidth; // reinicia las animaciones de entrada
    panel.classList.add('is-active');
    resetCounters(panel);
    $('chapter-name').textContent = s.chapter;
    $('progress-bar').style.width = `${(current + 1) / slides.length * 100}%`;
    document.querySelectorAll('[data-index]').forEach(b => b.setAttribute('aria-current', String(Number(b.dataset.index) === current)));
    $('announce').textContent = `Pantalla ${current + 1} de ${slides.length}. ${s.title}`;
    if (location.hash !== `#${s.id}`) history.replaceState(null, '', `#${s.id}`);
    document.title = `TerraSense · ${s.title}`;
    panel.dispatchEvent(new CustomEvent('slideenter'));
    setStep(initialStep);
    if (focus) panel.querySelector('h2,h1')?.focus({preventScroll: true});
  }
  const next = () => { if (step < stepsOf(current)) setStep(step + 1); else if (current < slides.length - 1) show(current + 1, false, 0); };
  const previous = () => { if (step > 0) setStep(step - 1); else if (current > 0) show(current - 1); };
  window.TERRA_DECK = {show, next, previous, setStep, get current() { return current; }, get step() { return step; }, ids: slides.map(s => s.id)};

  function resize() {
    if (innerWidth <= 800) { deck.style.transform = 'none'; return; }
    const v = $('viewport');
    deck.style.transform = `scale(${Math.min(v.clientWidth / 1440, v.clientHeight / 810)})`;
  }
  const fromHash = () => { const i = slides.findIndex(s => `#${s.id}` === location.hash); show(i >= 0 ? i : 0); };
  function openIndex() { indexDialog.showModal(); indexDialog.querySelector('[aria-current=true]')?.focus(); }
  function openNotes() {
    const s = slides[current];
    $('notes-content').innerHTML = `<p>${esc(s.notes || '')}</p>` + (s.sources?.length ? `<h3>Fuentes</h3>${s.sources.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(l)}</a>`).join('')}` : '');
    notesDialog.showModal();
  }
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { $('announce').textContent = 'El navegador no permitió la pantalla completa.'; }
  }
  $('previous').addEventListener('click', previous);
  $('next').addEventListener('click', next);
  $('open-index').addEventListener('click', openIndex);
  $('notes-button').addEventListener('click', openNotes);
  $('fullscreen').addEventListener('click', fullscreen);
  document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = document.fullscreenElement ? 'Salir' : 'Pantalla completa'; resize(); });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('[data-index]').forEach(b => b.addEventListener('click', () => { indexDialog.close(); show(Number(b.dataset.index), true); }));
  deck.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) show(slides.findIndex(s => s.id === g.dataset.goto), true); });
  document.addEventListener('keydown', e => {
    if (indexDialog.open || notesDialog.open || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest('input,textarea,select,video,iframe,[contenteditable="true"]')) return;
    const key = e.key.toLowerCase();
    if (['arrowright', 'pagedown'].includes(key)) { e.preventDefault(); next(); }
    else if (['arrowleft', 'pageup'].includes(key)) { e.preventDefault(); previous(); }
    else if (key === 'home') { e.preventDefault(); show(0); }
    else if (key === 'end') { e.preventDefault(); show(slides.length - 1); }
    else if (key === ' ' && !e.target.closest('button,a')) { e.preventDefault(); next(); }
    else if (key === 'f') fullscreen(); else if (key === 'i') openIndex(); else if (key === 'n') openNotes();
  });
  addEventListener('resize', resize);
  addEventListener('hashchange', fromHash);
  // Los demás módulos (escenas y gráficos) se registran antes de mostrar la primera pantalla.
  addEventListener('load', () => { fromHash(); resize(); });
  resize();
})();

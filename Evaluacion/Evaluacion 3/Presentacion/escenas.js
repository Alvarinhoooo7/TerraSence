/* Escenas animadas de cada pantalla. Escuchan «slideenter» y «slidestep» que emite presentacion.js. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const on = (id, handlers) => {
    const s = $('s-' + id);
    if (!s) return;
    if (handlers.enter) s.addEventListener('slideenter', () => handlers.enter(s));
    if (handlers.step) s.addEventListener('slidestep', e => handlers.step(s, e.detail.step));
    handlers.init?.(s);
  };
  /* Lluvia: gotas con posición y velocidad al azar. */
  document.querySelectorAll('[data-rain]').forEach(r => {
    r.innerHTML = Array.from({length: Number(r.dataset.rain)}, () =>
      `<i style="left:${Math.random() * 100}%;animation-duration:${.5 + Math.random() * .6}s;animation-delay:${-Math.random() * 2}s;opacity:${.4 + Math.random() * .6}"></i>`).join('');
  });

  /* Video del ensamblaje: cada característica salta a su momento y se ilumina durante la reproducción. */
  const video = $('assembly');
  if (video) {
    const chapters = [...document.querySelectorAll('[data-video-time]')];
    chapters.forEach(b => b.addEventListener('click', () => { video.currentTime = Number(b.dataset.videoTime); video.play().catch(() => {}); }));
    video.addEventListener('timeupdate', () => {
      let cur = chapters[0];
      chapters.forEach(b => { if (video.currentTime + .05 >= Number(b.dataset.videoTime)) cur = b; });
      chapters.forEach(b => b.classList.toggle('on', b === cur));
    });
  }
})();

/* Gráficos de consumo dibujados como SVG desde datos.js (registros reales del piloto V2).
   Cada gráfico responde al evento «slidestep» de su pantalla para revelarse por pasos. */
(() => {
  'use strict';
  const D = window.TERRA_DATA;
  if (!D?.profile) return;
  const NS = 'http://www.w3.org/2000/svg';
  // Paleta (despierto esperando · midiendo · dormido · pérdida) sobre fondo blanco; el texto nunca va en rojo.
  const C = {wait: '#c97a14', loss: '#9a9a9a', measure: '#3a7fd0', sleep: '#228a5a', ink: '#202b26', muted: '#5d6c63', grid: '#e3e8e4', axis: '#c9d0cb', raw: '#a9b8c6', surface: '#ffffff'};
  const fmt = (x, d = 1) => x.toLocaleString('es-CL', {minimumFractionDigits: d, maximumFractionDigits: d});
  const P = D.phases;
  const PHASES = {
    A: {name: 'Anuncio BLE', sub: 'despierto, esperando al teléfono', cat: 'wait'},
    D1: {name: 'Reposo profundo', sub: 'equipo dormido', cat: 'sleep'},
    B: {name: '10 mediciones', sub: 'con esperas entre lecturas', cat: 'measure'},
    G: {name: 'Espera posterior', sub: 'despierto tras la última lectura', cat: 'wait'},
    D2: {name: 'Reposo profundo', sub: 'vuelve a dormir solo', cat: 'sleep'}
  };

  const lin = (d0, d1, r0, r1) => v => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
  function el(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, str, attrs = {}) { const t = el('text', {x, y, ...attrs}, parent); t.textContent = str; return t; }
  function root(container, W, H, label) {
    container.querySelector('svg')?.remove();
    const s = el('svg', {viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label, class: 'viz-svg'});
    container.prepend(s);
    return s;
  }
  // Barra horizontal: base recta en el eje y extremo de datos redondeado (4 px).
  function hbar(parent, x0, y, w, h, fill) {
    const r = Math.min(4, w / 2, h / 2);
    return el('path', {d: `M${x0},${y}H${x0 + w - r}Q${x0 + w},${y} ${x0 + w},${y + r}V${y + h - r}Q${x0 + w},${y + h} ${x0 + w - r},${y + h}H${x0}Z`, fill}, parent);
  }
  function vbar(parent, x, y0, w, h, fill) {
    const r = Math.min(4, w / 2, h / 2), top = y0 - h;
    return el('path', {d: `M${x},${y0}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${y0}Z`, fill}, parent);
  }
  function svgPoint(svg, e) {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  // Recuadro de lectura dentro del SVG: se escala con la pantalla igual que el gráfico.
  function tooltip(svg, W) {
    const g = el('g', {class: 'viz-tip', 'pointer-events': 'none', visibility: 'hidden'}, svg);
    const box = el('rect', {rx: 6, fill: C.ink}, g);
    const lines = [0, 1, 2].map(i => txt(g, 0, 0, '', {'font-size': i ? 15 : 16, 'font-weight': i ? 400 : 650, fill: i ? '#dfe7e2' : '#fff'}));
    return {
      show(x, y, rows) {
        rows.forEach((r, i) => { lines[i].textContent = r || ''; });
        g.setAttribute('visibility', 'visible');
        const w = Math.max(...lines.map(l => l.getComputedTextLength())) + 28, h = rows.filter(Boolean).length * 22 + 16;
        const left = x + 16 + w > W ? x - 16 - w : x + 16, top = Math.max(4, y - h - 10);
        box.setAttribute('x', left); box.setAttribute('y', top); box.setAttribute('width', w); box.setAttribute('height', h);
        lines.forEach((l, i) => { l.setAttribute('x', left + 14); l.setAttribute('y', top + 25 + i * 22); });
      },
      hide() { g.setAttribute('visibility', 'hidden'); }
    };
  }
  function yGrid(g, ticks, y, x0, x1, label = v => fmt(v, 0)) {
    ticks.forEach(v => {
      el('line', {x1: x0, x2: x1, y1: y(v), y2: y(v), stroke: v ? C.grid : C.axis, 'stroke-width': 1}, g);
      txt(g, x0 - 12, y(v) + 5, label(v), {'text-anchor': 'end', class: 'tick'});
    });
  }
  const range = (a, b, s) => { const out = []; for (let v = a; v <= b + 1e-9; v += s) out.push(+v.toFixed(6)); return out; };

  /* 1 · Perfil completo del ensayo de reposo (potencia, cubetas de 250 ms). */
  function profile(container, step) {
    const W = 1000, H = 430, m = {l: 70, r: 18, t: 92, b: 54};
    const pr = D.profile, phases = pr.phases;
    const svg = root(container, W, H, 'Potencia medida en la entrada USB durante el ensayo de reposo: anuncio, reposo, diez mediciones, gracia de dos minutos y reposo.');
    // Escala hasta 800 mW: los pocos picos mayores se rotulan en el borde, no se ocultan.
    const ymax = 800, peak = Math.max(...pr.hi), peakAt = pr.t[pr.hi.indexOf(peak)];
    const x = lin(0, pr.duration, m.l, W - m.r), y = lin(0, ymax, H - m.b, m.t);
    const shown = Math.min(step, phases.length - 1);
    phases.forEach((ph, idx) => {
      const g = el('g', {class: 'reveal' + (idx > shown ? ' is-hidden' : '')}, svg);
      el('rect', {x: x(ph.start), y: m.t - 78, width: x(ph.end) - x(ph.start), height: H - m.b - m.t + 78, fill: C[PHASES[ph.key].cat], opacity: .08}, g);
      const cx = (x(ph.start) + x(ph.end)) / 2;
      txt(g, cx, m.t - 52, PHASES[ph.key].name, {'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: C.ink});
      txt(g, cx, m.t - 22, `${fmt(P[ph.key].p, 0)} mW`, {'text-anchor': 'middle', 'font-size': 25, 'font-weight': 700, fill: C.ink});
    });
    const axes = el('g', {}, svg);
    yGrid(axes, range(0, ymax, 100), y, m.l, W - m.r);
    range(0, Math.floor(pr.duration / 100) * 100, 100).forEach(v => txt(axes, x(v), H - m.b + 24, `${v} s`, {'text-anchor': 'middle', class: 'tick'}));
    txt(axes, 18, (m.t + H - m.b) / 2, 'Potencia (mW)', {transform: `rotate(-90 18 ${(m.t + H - m.b) / 2})`, 'text-anchor': 'middle', class: 'tick'});
    const clipId = 'clip-profile';
    const clip = el('rect', {x: m.l, y: 0, height: H, width: x(phases[shown].end) - m.l}, el('clipPath', {id: clipId}, el('defs', {}, svg)));
    const data = el('g', {'clip-path': `url(#${clipId})`}, svg);
    const n = pr.t.length;
    let area = '';
    for (let k = 0; k < n; k++) area += `${k ? 'L' : 'M'}${x(pr.t[k]).toFixed(1)},${y(Math.min(ymax, pr.hi[k])).toFixed(1)}`;
    for (let k = n - 1; k >= 0; k--) area += `L${x(pr.t[k]).toFixed(1)},${y(pr.lo[k]).toFixed(1)}`;
    el('path', {d: area + 'Z', fill: '#7f8f86', opacity: .16}, data);
    if (peak > ymax) {
      el('path', {d: `M${x(peakAt) - 6},${m.t + 9}L${x(peakAt)},${m.t}L${x(peakAt) + 6},${m.t + 9}Z`, fill: C.muted}, data);
      const right = x(peakAt) > W - 260;
      txt(data, x(peakAt) + (right ? -10 : 10), m.t + 10, `pico de ${fmt(peak, 0)} mW`, {'font-size': 14, fill: C.muted, 'text-anchor': right ? 'end' : 'start'});
    }
    phases.forEach(ph => {
      let d = '';
      for (let k = 0; k < n; k++) if (pr.t[k] >= ph.start - .2 && pr.t[k] <= ph.end + .2) d += `${d ? 'L' : 'M'}${x(pr.t[k]).toFixed(1)},${y(pr.p[k]).toFixed(1)}`;
      el('path', {d, fill: 'none', stroke: C[PHASES[ph.key].cat], 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}, data);
    });
    // Animación del recorte hasta el final de la fase revelada.
    const target = x(phases[shown].end) - m.l, prev = Number(container.dataset.clip || 0);
    container.dataset.clip = target;
    if (prev && prev < target && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const t0 = performance.now();
      clip.setAttribute('width', prev);
      const tick = now => { const k = Math.min(1, (now - t0) / 700), e = 1 - (1 - k) ** 3; clip.setAttribute('width', prev + (target - prev) * e); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
    // Lectura al pasar el puntero: media de 1 s y fase.
    const cross = el('line', {y1: m.t, y2: H - m.b, stroke: C.ink, 'stroke-width': 1, visibility: 'hidden'}, svg);
    const dot = el('circle', {r: 5, stroke: C.surface, 'stroke-width': 2, visibility: 'hidden'}, svg);
    const tip = tooltip(svg, W);
    const hit = el('rect', {x: m.l, y: m.t - 78, width: W - m.l - m.r, height: H - m.b - m.t + 78, fill: 'transparent'}, svg);
    hit.addEventListener('pointermove', e => {
      const limit = phases[shown].end, t = Math.min(limit, Math.max(0, (svgPoint(svg, e).x - m.l) / (W - m.l - m.r) * pr.duration));
      let lo = 0, hi = n - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (pr.t[mid] < t) lo = mid + 1; else hi = mid; }
      const ph = phases.find(p => pr.t[lo] <= p.end + .1) || phases[phases.length - 1];
      const px = x(pr.t[lo]), py = y(pr.p[lo]);
      cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('fill', C[PHASES[ph.key].cat]); dot.setAttribute('visibility', 'visible');
      tip.show(px, py, [PHASES[ph.key].name, `${fmt(pr.p[lo], 0)} mW · ${fmt(pr.i[lo], 1)} mA`, `t = ${fmt(pr.t[lo], 0)} s · media de 1 s`]);
    });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tip.hide(); });
  }

  /* 2 · Potencia media por estado (barras horizontales; la corriente va como dato secundario). */
  function states(container) {
    const W = 1000, H = 400, m = {l: 300, r: 210, t: 14, b: 44};
    const asleep = k => (P.D1[k] + P.D2[k]) / 2;
    const rows = [
      {key: 'A', p: P.A.p, i: P.A.i}, {key: 'B', p: P.B.p, i: P.B.i},
      {key: 'G', p: P.G.p, i: P.G.i}, {key: 'D1', p: asleep('p'), i: asleep('i'), name: 'Reposo profundo', sub: 'media de los dos tramos dormidos'}
    ];
    const svg = root(container, W, H, 'Potencia media por estado: anuncio, mediciones, gracia y reposo profundo.');
    const x = lin(0, 350, m.l, W - m.r), band = (H - m.t - m.b) / rows.length;
    const axes = el('g', {}, svg);
    range(0, 300, 100).forEach(v => {
      el('line', {x1: x(v), x2: x(v), y1: m.t, y2: H - m.b, stroke: v ? C.grid : C.axis}, axes);
      txt(axes, x(v), H - m.b + 26, `${v} mW`, {'text-anchor': 'middle', class: 'tick'});
    });
    const tip = tooltip(svg, W);
    rows.forEach((r, idx) => {
      const ph = PHASES[r.key], cy = m.t + band * idx + band / 2;
      const g = el('g', {class: 'viz-row', tabindex: 0}, svg);
      txt(g, 0, cy - 4, r.name || ph.name, {'font-size': 21, 'font-weight': 600, fill: C.ink});
      txt(g, 0, cy + 20, r.sub || ph.sub, {'font-size': 15, fill: C.muted});
      hbar(g, x(0), cy - 12, x(r.p) - x(0), 24, C[ph.cat]);
      const value = txt(g, x(r.p) + 14, cy + 8, `${fmt(r.p, 0)} mW`, {'font-size': 24, 'font-weight': 700, fill: C.ink});
      const extra = el('tspan', {'font-size': 16, 'font-weight': 400, fill: C.muted, dx: 10}, value);
      extra.textContent = `${fmt(r.i, 1)} mA` + (r.key === 'D1' ? ` · −${fmt(D.reductionPct, 1)} % de corriente` : '');
      el('rect', {x: 0, y: cy - band / 2, width: W, height: band, fill: 'transparent'}, g);
      const show = () => tip.show(x(r.p), cy - 14, [r.name || ph.name, `${fmt(r.p, 1)} mW · ${fmt(r.i, 1)} mA`, 'media del tramo, sin 2 s de cada borde']);
      g.addEventListener('pointerenter', show); g.addEventListener('focus', show);
      g.addEventListener('pointerleave', tip.hide); g.addEventListener('blur', tip.hide);
    });
  }

  /* 3 · Energía de una sesión: medir frente a esperar despierto. */
  function session(container, step) {
    const S = D.session, W = 1000, H = 410, m = {l: 330, r: 150, t: 8};
    const svg = root(container, W, H, 'Energía de una sesión: una medición frente a la gracia de dos minutos despierto y los mismos dos minutos dormido.');
    const rows = [
      {name: 'Una medición completa', sub: `conexión, lectura y envío · ${fmt(D.connectionWindowSeconds, 1)} s`, e: S.measurement, cat: 'measure', note: 'media de 10 ventanas medidas'},
      {name: 'Esperar 2 min despierto', sub: 'después de la última lectura', e: S.grace, cat: 'wait', note: `tramo medido de ${fmt(S.graceSeconds, 1)} s`},
      {name: 'Esos 2 min, dormido', sub: 'calculado con el consumo dormido medido', e: S.graceAsleep, cat: 'sleep', note: `${fmt(S.asleepMw, 0)} mW × ${fmt(S.graceSeconds, 1)} s`}
    ];
    const x = lin(0, 11, m.l, W - m.r), band = 92;
    const tip = tooltip(svg, W);
    rows.forEach((r, idx) => {
      const cy = m.t + band * idx + band / 2;
      const g = el('g', {class: 'reveal viz-row' + (idx > step ? ' is-hidden' : ''), tabindex: 0}, svg);
      txt(g, 0, cy - 4, r.name, {'font-size': 21, 'font-weight': 600, fill: C.ink});
      txt(g, 0, cy + 20, r.sub, {'font-size': 15, fill: C.muted});
      el('line', {x1: x(0), x2: x(0), y1: cy - band / 2 + 10, y2: cy + band / 2 - 10, stroke: C.axis}, g);
      hbar(g, x(0), cy - 12, Math.max(3, x(r.e) - x(0)), 24, C[r.cat]);
      txt(g, Math.max(x(r.e), x(0) + 3) + 14, cy + 9, `${fmt(r.e, 2)} mWh`, {'font-size': 25, 'font-weight': 700, fill: C.ink});
      el('rect', {x: 0, y: cy - band / 2, width: W, height: band, fill: 'transparent'}, g);
      const show = () => tip.show(Math.max(x(r.e), x(0) + 3), cy - 14, [r.name, `${fmt(r.e, 3)} mWh`, r.note]);
      g.addEventListener('pointerenter', show); g.addEventListener('focus', show);
      g.addEventListener('pointerleave', tip.hide); g.addEventListener('blur', tip.hide);
    });
    // Equivalencia: la gracia despierta medida en «mediciones».
    const count = Math.round(S.graceInMeasurements);
    const g = el('g', {class: 'reveal' + (step < 1 ? ' is-hidden' : '')}, svg);
    const top = m.t + band * 3 + 22;
    el('line', {x1: 0, x2: W, y1: top - 8, y2: top - 8, stroke: C.grid}, g);
    txt(g, 0, top + 30, 'Esperar despierto gasta como', {'font-size': 19, fill: C.muted});
    txt(g, 0, top + 62, `≈ ${count} mediciones`, {'font-size': 24, 'font-weight': 700, fill: C.ink});
    for (let k = 0; k < count; k++) el('circle', {cx: m.l + 12 + k * 17.2, cy: top + 44, r: 6.5, fill: C.measure}, g);
  }

  /* 4 · Una medición de cerca (muestras de 10 ms y media móvil de 250 ms). */
  function detail(container) {
    const d = D.detail, W = 1000, H = 400, m = {l: 70, r: 18, t: 64, b: 50};
    const svg = root(container, W, H, 'Potencia de la quinta medición, desde dos segundos antes de conectar hasta dos segundos después de desconectar.');
    const ymax = Math.ceil(Math.max(...d.p) / 100) * 100, t0 = d.t[0], t1 = d.t[d.t.length - 1];
    const x = lin(t0, t1, m.l, W - m.r), y = lin(0, ymax, H - m.b, m.t);
    el('rect', {x: x(d.connected), y: m.t - 34, width: x(d.disconnected) - x(d.connected), height: H - m.b - m.t + 34, fill: C.measure, opacity: .08}, svg);
    const axes = el('g', {}, svg);
    yGrid(axes, range(0, ymax, 200), y, m.l, W - m.r);
    range(Math.ceil(t0), Math.floor(t1), 1).forEach(v => txt(axes, x(v), H - m.b + 24, `${fmt(v, 0)} s`, {'text-anchor': 'middle', class: 'tick'}));
    txt(axes, 18, (m.t + H - m.b) / 2, 'Potencia (mW)', {transform: `rotate(-90 18 ${(m.t + H - m.b) / 2})`, 'text-anchor': 'middle', class: 'tick'});
    [[d.connected, 'Conectado'], [d.disconnected, 'Desconectado']].forEach(([v, label]) => {
      el('line', {x1: x(v), x2: x(v), y1: m.t - 34, y2: H - m.b, stroke: C.muted, 'stroke-width': 1}, svg);
      txt(svg, x(v), m.t - 44, label, {'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: C.ink});
    });
    txt(svg, (x(d.connected) + x(d.disconnected)) / 2, m.t - 12, `con el teléfono · ${fmt(d.disconnected, 1)} s`, {'text-anchor': 'middle', 'font-size': 15, fill: C.muted});
    const path = vals => vals.map((v, k) => `${k ? 'L' : 'M'}${x(d.t[k]).toFixed(1)},${y(v).toFixed(1)}`).join('');
    el('path', {d: path(d.p), fill: 'none', stroke: C.raw, 'stroke-width': 1, opacity: .75}, svg);
    el('path', {d: path(d.avg), fill: 'none', stroke: C.measure, 'stroke-width': 2.4, 'stroke-linejoin': 'round'}, svg);
    const cross = el('line', {y1: m.t, y2: H - m.b, stroke: C.ink, visibility: 'hidden'}, svg);
    const dot = el('circle', {r: 5, fill: C.measure, stroke: C.surface, 'stroke-width': 2, visibility: 'hidden'}, svg);
    const tip = tooltip(svg, W);
    const hit = el('rect', {x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent'}, svg);
    hit.addEventListener('pointermove', e => {
      const t = t0 + (svgPoint(svg, e).x - m.l) / (W - m.l - m.r) * (t1 - t0);
      let k = d.t.findIndex(v => v >= t); if (k < 0) k = d.t.length - 1;
      cross.setAttribute('x1', x(d.t[k])); cross.setAttribute('x2', x(d.t[k])); cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', x(d.t[k])); dot.setAttribute('cy', y(d.avg[k])); dot.setAttribute('visibility', 'visible');
      tip.show(x(d.t[k]), y(d.avg[k]), [`t = ${fmt(d.t[k], 2)} s`, `${fmt(d.avg[k], 0)} mW media de 250 ms`, `${fmt(d.p[k], 0)} mW muestra de 10 ms`]);
    });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tip.hide(); });
  }

  /* 5 · Energía de las diez ventanas de medición. */
  function energy(container) {
    const ms = D.measurements, W = 1000, H = 400, m = {l: 70, r: 150, t: 30, b: 50};
    const svg = root(container, W, H, `Energía de las diez ventanas de medición; media de ${fmt(D.energyMean, 3)} mWh.`);
    const x = lin(0, ms.length, m.l, W - m.r), y = lin(0, .4, H - m.b, m.t), slot = (W - m.l - m.r) / ms.length;
    const axes = el('g', {}, svg);
    yGrid(axes, range(0, .4, .1), y, m.l, W - m.r, v => fmt(v, 1));
    txt(axes, 18, (m.t + H - m.b) / 2, 'Energía (mWh)', {transform: `rotate(-90 18 ${(m.t + H - m.b) / 2})`, 'text-anchor': 'middle', class: 'tick'});
    const tip = tooltip(svg, W);
    const emax = Math.max(...ms.map(r => r.e)), emin = Math.min(...ms.map(r => r.e));
    ms.forEach((r, k) => {
      const cx = x(k) + slot / 2, g = el('g', {class: 'viz-row', tabindex: 0}, svg);
      vbar(g, cx - 12, y(0), 24, y(0) - y(r.e), C.measure);
      txt(g, cx, H - m.b + 24, String(k + 1), {'text-anchor': 'middle', class: 'tick'});
      if (r.e === emax || r.e === emin) txt(g, cx, y(r.e) - 12, fmt(r.e, 3), {'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: C.ink});
      el('rect', {x: cx - slot / 2, y: m.t, width: slot, height: H - m.t - m.b, fill: 'transparent'}, g);
      const show = () => tip.show(cx, y(r.e) - 10, [`Medición ${k + 1}`, `${fmt(r.e, 3)} mWh en ${fmt(r.seconds, 2)} s`, `${fmt(r.i, 1)} mA medios en la ventana`]);
      g.addEventListener('pointerenter', show); g.addEventListener('focus', show);
      g.addEventListener('pointerleave', tip.hide); g.addEventListener('blur', tip.hide);
    });
    el('line', {x1: m.l, x2: W - m.r, y1: y(D.energyMean), y2: y(D.energyMean), stroke: C.ink, 'stroke-width': 1.5}, svg);
    txt(svg, W - m.r + 12, y(D.energyMean) - 4, 'media', {'font-size': 15, fill: C.muted});
    txt(svg, W - m.r + 12, y(D.energyMean) + 20, `${fmt(D.energyMean, 3)} mWh`, {'font-size': 19, 'font-weight': 700, fill: C.ink});
    txt(svg, (m.l + W - m.r) / 2, H - 4, 'Número de medición', {'text-anchor': 'middle', class: 'tick'});
  }

  /* 6 · Resultados: utilidad de cada año (barras), recuperación de la inversión financiada con el crédito
     (línea verde) y deuda pendiente con el banco (línea gris). Eje de tiempo continuo: t = 0 es el inicio de 2027.
     La línea verde parte en la inversión y suma el flujo de cada año después de pagar las cuotas; las cuotas que
     cubre el pie de los socios se tratan como pago de ese mismo crédito, por lo que no se suman como ingreso. */
  function results(container, step) {
    const F = D.financial, rows = F.rows, W = 1000, H = 470, m = {l: 70, r: 24, t: 24, b: 92};
    const svg = root(container, W, H, `Utilidad anual 2027–2036, recuperación de la inversión de ${fmt(F.inversion / 1e6, 1)} millones a los ${fmt(F.payback, 1)} años y deuda con el banco hasta 2036.`);
    const x = lin(0, rows.length, m.l, W - m.r), y = lin(-100, 600, H - m.b, m.t), band = x(1) - x(0);
    const axes = el('g', {}, svg);
    yGrid(axes, range(0, 600, 100), y, m.l, W - m.r, v => fmt(v, 0));
    el('line', {x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), stroke: C.ink, 'stroke-width': 1.4}, axes);
    txt(axes, 16, (m.t + H - m.b) / 2, 'Millones de pesos', {transform: `rotate(-90 16 ${(m.t + H - m.b) / 2})`, 'text-anchor': 'middle', class: 'tick'});
    // Pie aplicado a las cuotas de cada año y saldo del crédito (cuota francesa mensual).
    let pie = F.downpayment;
    const pieYear = rows.map(() => { const used = Math.min(pie, F.monthly * 12); pie -= used; return used; });
    const im = (1 + F.rate) ** (1 / 12) - 1;
    let debt = F.credit;
    const debtPts = [[0, debt / 1e6]];
    rows.forEach((r, k) => { for (let j = 0; j < 12; j++) debt = debt * (1 + im) - F.monthly; debtPts.push([k + 1, Math.max(0, debt) / 1e6]); });
    let acc = -F.inversion / 1e6;
    const pts = [[0, acc]];
    const tip = tooltip(svg, W);
    rows.forEach((r, k) => {
      const u = r.util_neta / 1e6, cx = x(k + .5), g = el('g', {class: 'viz-row', tabindex: 0}, svg);
      acc += (r.flujo - pieYear[k]) / 1e6; pts.push([k + 1, acc]);
      const h = Math.max(2, Math.abs(y(u) - y(0)));
      if (u >= 0) vbar(g, cx - 17, y(0), 34, h, C.ink); else el('rect', {x: cx - 17, y: y(0), width: 34, height: h, rx: 3, fill: C.loss}, g);
      txt(g, cx, u >= 0 ? y(u) - 8 : y(0) - 8, (u < 0 ? '−' : '') + fmt(Math.abs(u), 1), {'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: C.ink});
      txt(g, cx, y(-100) + 22, String(r.anio), {'text-anchor': 'middle', class: 'tick'});
      el('rect', {x: cx - band / 2, y: m.t, width: band, height: y(-100) - m.t, fill: 'transparent'}, g);
      const saldo = acc, deuda = debtPts[k + 1][1];
      const show = () => tip.show(cx, y(Math.max(u, 0)) - 10, [`${r.anio} · ${u < 0 ? 'pérdida' : 'utilidad'} de $${fmt(Math.abs(u), 1)} M`, `Recuperación: ${saldo < 0 ? '−' : '+'}$${fmt(Math.abs(saldo), 1)} M`, `Deuda con el banco: $${fmt(deuda, 1)} M`]);
      g.addEventListener('pointerenter', show); g.addEventListener('focus', show); g.addEventListener('pointerleave', tip.hide); g.addEventListener('blur', tip.hide);
    });
    const path = ps => ps.map(([t, v], k) => `${k ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join('');
    // Línea gris: deuda pendiente con el banco.
    const gray = '#8a8a8a';
    el('path', {d: path(debtPts), fill: 'none', stroke: gray, 'stroke-width': 3, 'stroke-dasharray': '8 5'}, svg);
    txt(svg, x(0) + 10, y(debtPts[0][1]) - 26, `Deuda con el banco: $${fmt(F.credit / 1e6, 1)} M`, {'font-size': 14, 'font-weight': 700, fill: '#555'});
    txt(svg, x(rows.length) - 6, y(0) + 22, '$0 en 2036', {'text-anchor': 'end', 'font-size': 14, 'font-weight': 700, fill: '#555'});
    // Línea verde: recuperación de la inversión (segundo paso).
    const line = el('g', {class: 'reveal' + (step < 1 ? ' is-hidden' : ''), 'pointer-events': 'none'}, svg);
    el('path', {d: path(pts), fill: 'none', stroke: C.sleep, 'stroke-width': 3.5, 'stroke-linejoin': 'round'}, line);
    pts.forEach(([t, v]) => el('circle', {cx: x(t), cy: y(v), r: 5, fill: v < 0 ? '#fff' : C.sleep, stroke: C.sleep, 'stroke-width': 2.5}, line));
    txt(line, x(0) + 10, y(pts[0][1]) + 22, `Inversión: −$${fmt(F.inversion / 1e6, 1)} M`, {'font-size': 15, 'font-weight': 700, fill: '#17643f'});
    pts.slice(2, 5).forEach(([t, v]) => txt(line, x(t), v < 0 ? y(v) + 20 : y(v) - 12, (v < 0 ? '−' : '+') + fmt(Math.abs(v), 1), {'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#17643f'}));
    const last = pts[pts.length - 1];
    txt(line, x(last[0]) - 8, y(last[1]) - 12, `+$${fmt(last[1], 1)} M`, {'text-anchor': 'end', 'font-size': 16, 'font-weight': 700, fill: '#17643f'});
    const xz = x(F.payback);
    el('line', {x1: xz, x2: xz, y1: y(0) - 150, y2: y(0) - 44, stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': '5 5'}, line);
    el('circle', {cx: xz, cy: y(0), r: 8, fill: C.sleep, stroke: '#fff', 'stroke-width': 3}, line);
    txt(line, xz - 10, y(0) - 158, `${fmt(F.payback, 1)} años`, {'text-anchor': 'end', 'font-size': 22, 'font-weight': 700, fill: C.ink});
    txt(line, xz - 10, y(0) - 138, 'se recupera la inversión', {'text-anchor': 'end', 'font-size': 14, fill: C.muted});
  }

  /* 7 · Sensibilidad: VAN según la caída de ventas, con las zonas de decisión. */
  function sensitivity(container) {
    const F = D.financial, T = F.sensitivity, W = 1000, H = 440, m = {l: 74, r: 24, t: 40, b: 56};
    const svg = root(container, W, H, 'VAN del proyecto según la caída de ventas entre 0 y 30 %.');
    const vmin = Math.floor(Math.min(...T.map(r => r.van)) / 2e7) * 20, vmax = Math.ceil(Math.max(...T.map(r => r.van)) / 2e7) * 20;
    const x = lin(0, 30, m.l, W - m.r), y = lin(vmin, vmax, H - m.b, m.t);
    const L1 = F.limits.cajaMin * 100, L2 = F.limits.van * 100;
    [[0, L1, C.sleep, 'Sin pedir más dinero'], [L1, L2, '#c97a14', 'Falta caja'], [L2, 30, C.wait, 'No crea valor']].forEach(([a, b, c, t]) => {
      el('rect', {x: x(a), y: m.t, width: x(b) - x(a), height: H - m.t - m.b, fill: c, opacity: .08}, svg);
      txt(svg, (x(a) + x(b)) / 2, m.t - 12, t, {'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: C.ink});
    });
    const axes = el('g', {}, svg);
    yGrid(axes, range(vmin, vmax, 20), y, m.l, W - m.r, v => (v < 0 ? '−' : '') + fmt(Math.abs(v), 0));
    el('line', {x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), stroke: C.ink, 'stroke-width': 1.2}, axes);
    range(0, 30, 5).forEach(v => txt(axes, x(v), H - m.b + 24, `−${v} %`, {'text-anchor': 'middle', class: 'tick'}));
    txt(axes, (m.l + W - m.r) / 2, H - 6, 'Caída de ventas frente al plan', {'text-anchor': 'middle', class: 'tick'});
    txt(axes, 18, (m.t + H - m.b) / 2, 'VAN (millones de pesos)', {transform: `rotate(-90 18 ${(m.t + H - m.b) / 2})`, 'text-anchor': 'middle', class: 'tick'});
    el('path', {d: T.map((r, k) => `${k ? 'L' : 'M'}${x(r.drop * 100).toFixed(1)},${y(r.van / 1e6).toFixed(1)}`).join(''), fill: 'none', stroke: C.ink, 'stroke-width': 3}, svg);
    [[L1, `${fmt(L1, 1)} %`], [L2, `${fmt(L2, 1)} %`]].forEach(([v, t]) => {
      el('line', {x1: x(v), x2: x(v), y1: m.t, y2: H - m.b, stroke: C.muted, 'stroke-width': 1}, svg);
      txt(svg, x(v) + 6, H - m.b - 10, t, {'font-size': 14, 'font-weight': 700, fill: C.muted});
    });
    const dot = el('circle', {r: 9, fill: C.wait, stroke: '#fff', 'stroke-width': 3}, svg);
    const label = txt(svg, 0, 0, '', {'font-size': 18, 'font-weight': 700, fill: C.ink});
    const place = v => {
      const r = T[v]; dot.setAttribute('cx', x(v)); dot.setAttribute('cy', y(r.van / 1e6));
      label.textContent = `$${fmt(r.van / 1e6, 1)} M`; label.setAttribute('x', x(v) + (v > 24 ? -110 : 14)); label.setAttribute('y', y(r.van / 1e6) - 12);
    };
    place(Number(document.getElementById('drop-range')?.value || 0));
    const slide = container.closest('.slide');
    if (container._onDrop) slide?.removeEventListener('sensdrop', container._onDrop);
    container._onDrop = e => place(e.detail);
    slide?.addEventListener('sensdrop', container._onDrop);
  }

  const RENDER = {profile, states, session, detail, energy, results, sensitivity};
  function draw(container) {
    const slide = container.closest('.slide');
    RENDER[container.dataset.chart](container, Number(slide?.dataset.step ?? 99));
  }
  document.querySelectorAll('[data-chart]').forEach(c => {
    draw(c);
    c.closest('.slide')?.addEventListener('slidestep', () => draw(c));
  });
  // Alternar entre el detalle de una medición y la energía de las diez.
  document.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => {
    const c = document.getElementById('detail-viz'), energyView = b.dataset.detail === 'energy';
    c.dataset.chart = energyView ? 'energy' : 'detail';
    c.querySelector('figcaption').textContent = energyView
      ? 'Integral de V × I a 100 muestras/s, desde 0,3 s antes de conectar hasta 0,3 s después de desconectar · campaña consumo · 21-11-2026'
      : 'Medición 5 · campaña consumo · 21-11-2026 · el registro no separa eléctricamente la lectura de la sonda y el envío Bluetooth';
    c.querySelector('.viz-legend').hidden = energyView;
    document.getElementById('detail-download').href = `graficos/${energyView ? 'energia-mediciones' : 'detalle-medicion-mw'}.png`;
    document.querySelectorAll('[data-detail]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    draw(c);
  }));
})();

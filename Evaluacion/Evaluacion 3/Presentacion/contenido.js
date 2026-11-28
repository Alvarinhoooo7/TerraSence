/* Contenido de la presentación. Las cifras de ensayo y finanzas llegan de datos.js (preparar.py).
   Criterio de redacción: presentación de grado. Registro formal, frases claras que se entiendan
   leyendo la lámina, sin coloquialismos. Ningún texto va en rojo. */
(() => {
  const D = window.TERRA_DATA, F = D.financial, S = D.session;
  const num = (x, d = 0) => x.toLocaleString('es-CL', {minimumFractionDigits: d, maximumFractionDigits: d});
  const money = x => '$' + num(Math.round(x));
  const mill = (x, d = 1) => '$' + num(x / 1e6, d) + ' M';
  const I = {
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    leaf: '<path d="M5 20c0-9 6-15 15-15 0 9-6 15-15 15zM5 20l7-7"/>',
    flask: '<path d="M9 3h6M10 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-10V3"/>',
    gauge: '<path d="M12 14l4-4M4 18a9 9 0 1 1 16 0"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z"/>',
    battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2M6 10v4M10 10v4"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9M12 6v2M12 16v2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
    sprout: '<path d="M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 12c0-4 3-7 8-7 0 5-3 7-8 7z"/>',
    plug: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-3 3.6M6.6 6.6A16 16 0 0 0 3 12s4 6 9 6a9 9 0 0 0 4.4-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    pin: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    hand: '<path d="M7 11V5a1.5 1.5 0 0 1 3 0v5M10 10V3.5a1.5 1.5 0 0 1 3 0V10M13 10V5a1.5 1.5 0 0 1 3 0v6M16 11V8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4.5a1.5 1.5 0 0 1 2.5-1.5L7 14"/>',
    wifiOff: '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01M3 3l18 18"/>',
    radio: '<path d="M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4"/><circle cx="12" cy="12" r="2"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>'
  };
  const ic = (n, cls = '') => `<span class="icon ${cls}"><svg viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg></span>`;
  const head = (kicker, title, lead = '', cls = '') => `<header class="slide-head ${cls}"><p class="kicker anim" style="--d:0">${kicker}</p><h2 class="anim" style="--d:1" tabindex="-1">${title}</h2>${lead ? `<p class="lead anim" style="--d:2">${lead}</p>` : ''}</header>`;
  // Portada de sección: solo el título y, si corresponde, una línea de presentación.
  const divider = (title, text = '') => `<svg class="soil" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60 Q180 20 360 60 T720 60 T1080 60 T1440 60 V120 H0Z" fill="#fff"/></svg><div class="inner"><h2 class="anim" tabindex="-1">${title}</h2>${text ? `<p class="anim" style="--d:1">${text}</p>` : ''}<div class="bar"></div></div>`;
  const cards = (items, d0 = 2) => items.map(([i, t, p], k) => `<article class="anim" style="--d:${d0 + k}">${ic(i)}<div><h3>${t}</h3><p>${p}</p></div></article>`).join('');
  const src = {
    odepaCenso: ['ODEPA (2024) · Censo Agropecuario y Forestal 2021: distribución de las unidades productivas', 'https://www.odepa.gob.cl/publicaciones/articulos/censo-agropecuario-y-forestal-2021-distribucion-de-las-unidades-productivas'],
    battery: ['IEC 62133-2 · Seguridad de baterías de litio', 'https://webstore.iec.ch/en/publication/70017'],
    ip: ['IEC 60529 · Grados de protección IP', 'https://webstore.iec.ch/en/publication/2447'],
    drop: ['IEC 60068-2-31 · Golpes y caídas por manipulación', 'https://webstore.iec.ch/en/publication/1155'],
    subtel: ['SUBTEL · Res. Exenta N° 1.985/2017, norma técnica de equipos de alcance reducido (literal k, IoT)', 'https://www.bcn.cl/leychile/navegar?idNorma=1109333'],
    subtelCert: ['SUBTEL · Equipos de alcance reducido: certificación', 'https://www.subtel.gob.cl/equipos-de-alcance-reducido/'],
    fogape: ['FOGAPE · garantía de créditos', 'https://www.fogape.cl/instituciones/']
  };
  window.TERRA_SOURCES = src;
  const L = keys => keys.map(k => src[k]);
  const rows = F.rows;
  const parts = Object.fromEntries(F.price.parts.map(p => [p.name, p.value]));
  const groups = [
    ['Fabricación del equipo', parts['Materiales del equipo'] + parts['Merma, garantía y envío'], 'Materiales, mermas, garantía y despacho.'],
    ['Personal', parts['Personas'], 'Remuneraciones del equipo de fabricación, venta y soporte.'],
    ['Administración', parts['Administración'], 'Arriendo, servicios, patente y software.'],
    ['Comercialización', parts['Publicidad'] + parts['Comisión a canales'], 'Publicidad digital y comisión a los canales de venta.']
  ];
  const maxGroup = Math.max(...groups.map(g => g[1]));
  const term10 = F.terms.find(t => t.years === 10);
  const interest10 = term10.monthly * 120 - F.credit;
  const inv = F.investment;
  const sam = 120000;

  /* Energía por fase, medida en la entrada USB del piloto (21-11-2026). */
  const pairing = (D.timings.busqueda_s + D.timings.conexion_s) * S.awakeMw / 3600;
  const reading = D.energyMean;
  const waiting = S.grace;
  const perMeasurement = pairing + reading + waiting;
  const sleepMw = 40e-3 * 3.7; // 40 µA de la placa del instrumento (hoja de datos) a 3,7 V

  /* Duración de la batería: modelo de autonomía del informe 3 (celda de 2.000 mAh, 1.600 mAh útiles,
     autodescarga del 2 % mensual), escalado a la batería de 5.000 mAh con la misma proporción útil. */
  const useful2 = 1600 * 3.7, useful5 = 4000 * 3.7, selfDischarge = u => .02 * u / 4.33;
  const scale = weeks2 => useful5 / (useful2 / weeks2 - selfDischarge(useful2) + selfDischarge(useful5));
  const habitual = [22.4, 27.8].map(scale), intensive = [7, 9.5].map(scale);
  const habitualMeas = habitual.map(w => w * 20), intensiveMeas = intensive.map(w => w * 70);
  const months = w => w / 4.33;

  window.TERRA_SLIDES = [
    {id: 'portada', chapter: 'TerraSense', title: 'TerraSense', cls: 'cover', notes: 'Presentación del proyecto de título. Abrir con la pregunta: «¿Cómo sabe hoy un agricultor si conviene regar?». El equipo de la imagen es una visualización del modelo 3D del prototipo.', html: `
      <div class="cover-left"><img class="inacap anim fade" src="assets/inacap.png" alt="INACAP">
        <div class="cover-title"><h1 tabindex="-1"><span class="anim" style="--d:2">Terra</span><span class="anim" style="--d:3">Sense</span></h1></div>
        <dl class="credits anim" style="--d:6"><dt>Integrantes</dt><dd>Álvaro Villena · Alan Escobar</dd><dt>Docente</dt><dd>Osvaldo Javier Duarte Faúndez</dd></dl></div>
      <div class="cover-right"><div class="device-stage anim pop" style="--d:3"><div class="ble-rings"><i></i><i></i><i></i></div><img src="assets/piloto.jpg" alt="Equipo TerraSense ensamblado"></div></div>`},

    {id: 'cap-problema', chapter: 'Problemática', title: 'Problemática', cls: 'divider', notes: 'Problema central: el pequeño y mediano agricultor debe decidir qué hacer en su campo sin conocer el estado del suelo o sin comprender lo que indican las mediciones. Se presenta desde el agricultor y desde las opciones que hoy tiene: el laboratorio y los instrumentos de medición.', html: divider('Problemática')},

    {id: 'agricultor', chapter: 'Problemática', title: 'El agricultor', notes: 'Problemas del usuario. Se respeta la experiencia del agricultor: el mensaje es que le falta información actual de su propio suelo y una interpretación según su cultivo.', html: head('Problemática', 'El agricultor') + `
      <div class="central anim" style="--d:2">El agricultor decide en su campo <b>sin conocer el estado del suelo</b> o <b>sin entender lo que miden</b>.</div>
      <div class="pcards">${cards([
        ['eyeOff', 'Decisiones a ciegas', 'Riega y siembra por costumbre o calendario.'],
        ['search', 'Mediciones sin significado', 'Un número no le dice qué hacer con su cultivo.'],
        ['layers', 'Todo por igual', 'Trata igual cada cultivo y cada etapa.'],
        ['clock', 'Daño detectado tarde', 'El suelo afecta al cultivo antes de que se note.'],
        ['history', 'Sin historial', 'No puede comparar temporadas ni resultados.'],
        ['coin', 'Riesgo económico', 'Perder agua, insumos o cosecha golpea el ingreso familiar.']
      ], 3)}</div>`},

    {id: 'laboratorio', chapter: 'Problemática', title: 'Laboratorio e instrumentos de medición', notes: 'El laboratorio es la referencia de exactitud y TerraSense lo complementa: su límite para el uso diario es la frecuencia; precio y plazo dependen del análisis y del proveedor. Instrumentos comparables: Hanna GroLine HI9814 y Bluelab Pulse (dos o tres variables, a pilas) y nodos fijos de telemetría (un punto del campo y suscripción mensual). Los medidores portátiles no cobran suscripción y Bluelab Pulse funciona sin red: no afirmar lo contrario.', html: head('Problemática', 'Laboratorio e instrumentos de medición', 'El laboratorio es la referencia y los instrumentos son la vía rápida, pero ninguno de los dos dice qué hacer hoy.') + `
      <div class="pcards">${[
        ['Laboratorio', 'coin', 'Costo por muestra', 'Se analiza una o dos veces por temporada.'],
        ['Laboratorio', 'clock', 'Días de espera', 'Tomar la muestra, enviarla y esperar el resultado toma días.'],
        ['Laboratorio', 'pin', 'Pocos puntos', 'No permite recorrer ni comparar sectores.'],
        ['Instrumentos', 'gauge', 'Pocas variables', 'Los medidores de mano entregan dos o tres datos.'],
        ['Instrumentos', 'search', 'Números sin interpretación', 'Ni el informe ni el medidor dicen qué hacer según el cultivo y su etapa.'],
        ['Instrumentos', 'trash', 'Pilas o mensualidad', 'Los portátiles usan pilas desechables; los nodos fijos miden un solo punto y cobran mensualidad.']
      ].map(([g, i, t, p], k) => `<article class="anim" style="--d:${3 + k}">${ic(i)}<div><p class="kicker">${g}</p><h3>${t}</h3><p>${p}</p></div></article>`).join('')}</div>`},

    {id: 'cap-objetivos', chapter: 'Nuestros objetivos', title: 'Nuestros objetivos', cls: 'divider', notes: 'Objetivo general y objetivos específicos del proyecto.', html: divider('Nuestros objetivos')},

    {id: 'objetivos', chapter: 'Nuestros objetivos', title: 'Objetivos del proyecto', notes: 'Los cuatro objetivos específicos son las cualidades que el equipo debe cumplir.', html: head('Nuestros objetivos', 'Objetivos del proyecto') + `
      <div class="goal anim" style="--d:2">${ic('target', 'white')}<div><p class="kicker">Objetivo general</p><p>Diseñar y validar una <b>sonda portátil multivariable</b> para el sensado agronómico, capaz de entregar <b>en el momento un plan de acción</b>, sin cobros extra.</p></div></div>
      <div class="goals goals-4">${[
        ['hand', 'Portátil', 'Equipo de mano, con batería propia, que permite medir en cualquier sector del campo.'],
        ['battery', 'Autonomía energética', 'Gran capacidad de batería y bajo consumo: el equipo reposa entre mediciones para que una carga dure el mayor tiempo posible.'],
        ['book', 'Razonamiento correcto', 'Interpretar las diez variables según la especie y su etapa, con criterios respaldados por fuentes establecidas.'],
        ['wifiOff', 'Funcionamiento sin conexión', 'Medir, interpretar y guardar los resultados en el campo, sin necesidad de internet.']
      ].map(([i, t, p], k) => `<article class="anim" style="--d:${3 + k}">${ic(i)}<div><span class="n">OBJETIVO ESPECÍFICO ${k + 1}</span><h3>${t}</h3><p>${p}</p></div></article>`).join('')}</div>`},

    {id: 'propuesta', chapter: 'Nuestros objetivos', title: 'No le entregamos un número: le entregamos qué hacer.', notes: 'Mismo contenido que la propuesta de valor de Comercialización. Funcional, económico y emocional son las tres clases de valor del informe 3. El pago único es diferencia frente al laboratorio (cobra por muestra) y al monitoreo remoto (mensualidad), no frente a otros medidores portátiles, que tampoco cobran cuota. La orientación es cualitativa: no prescribe dosis.', html: head('Propuesta de valor', 'No le entregamos un número:<br>le entregamos qué hacer.') + `
      <div class="why-box anim" style="--d:2"><p class="kicker">¿Por qué un agricultor debería elegirnos?</p><p>Medimos <b>10 variables en una sola inserción</b> y las convertimos en un <b>plan de acción</b> según la especie y la etapa de su cultivo, en el mismo campo.</p></div>
      <div class="value-grid">${[
        ['list', 'Funcional', 'Qué le permite hacer', [['Un plan de acción, no un número', 'Le indica si regar, esperar o corregir el manejo.'], ['Según la especie y la etapa', 'Criterios para 111 especies, ajustados a la etapa del cultivo.'], ['10 variables en una inserción', '7 del suelo y 3 del ambiente, en el mismo punto y momento.'], ['Considera el pronóstico', 'Si se esperan 5 mm de lluvia o más, sugiere postergar el riego.']]],
        ['coin', 'Económico', 'Qué le cuesta estar informado', [['Pago único de ' + money(F.price.list), 'Aplicación, actualizaciones y especies incluidas: sin el cobro por muestra del laboratorio ni la mensualidad del monitoreo remoto.'], ['Medir cuantas veces quiera', 'El laboratorio cobra entre $50.000 y $70.000 por muestra; repetir con la sonda no tiene costo.'], ['Menos agua e insumos perdidos', 'Aplica solo lo que el cultivo aprovecha en su etapa.']]],
        ['heart', 'Emocional', 'Qué incertidumbre le quita', [['Decidir con seguridad', 'Equivocarse en un riego o una fertilización cuesta mucho más que medir.'], ['Un criterio confiable', 'Respaldado por fuentes chilenas: INE, ODEPA, CIREN, SAG e INFOR.']]]
      ].map(([i, k, q, items], n) => `<article class="value-col anim" style="--d:${3 + n}"><header>${ic(i)}<div><p class="kicker">${q}</p><h3>${k}</h3></div></header>${items.map(([t, p]) => `<div class="value-item"><b>${t}</b><span>${p}</span></div>`).join('')}</article>`).join('')}</div>`},

    {id: 'cap-hardware', chapter: 'Hardware', title: 'Hardware', cls: 'divider', notes: 'Qué mide el equipo y cómo se integra con la aplicación, la base de datos y la web de administración.', html: divider('Hardware')},

    {id: 'variables', chapter: 'Hardware', title: '¿Qué mide TerraSense?', notes: 'Siete variables del suelo, con la sonda 7 en 1 por RS-485, y tres del ambiente, con el sensor BME280. N, P y K son valores de referencia: derivan de la conductividad y no se usan para prescribir dosis. La batería es información de estado, no una variable agronómica.', html: head('Hardware', '¿Qué mide TerraSense?') + `
      <div class="vars3">
        <section><p class="kicker anim" style="--d:2">Suelo · 7 variables</p><div class="vtiles">${[
          ['drop', 'Humedad', '%'], ['thermo', 'Temperatura', '°C'], ['bolt', 'Conductividad eléctrica', 'µS/cm'], ['flask', 'pH', 'acidez'],
          ['leaf', 'Nitrógeno', 'mg/kg'], ['leaf', 'Fósforo', 'mg/kg'], ['leaf', 'Potasio', 'mg/kg']
        ].map(([i, t, u], k) => `<div class="vtile anim pop" style="--d:${3 + k}">${ic(i)}<b>${t}</b><small>${u}</small></div>`).join('')}</div></section>
        <section><p class="kicker anim" style="--d:9">Ambiente · 3 variables</p><div class="vtiles">${[
          ['thermo', 'Temperatura del aire', '°C'], ['drop', 'Humedad del aire', '%'], ['gauge', 'Presión atmosférica', 'hPa']
        ].map(([i, t, u], k) => `<div class="vtile air anim pop" style="--d:${10 + k}">${ic(i, 'white')}<b>${t}</b><small>${u}</small></div>`).join('')}</div></section>
      </div>`},

    {id: 'arquitectura', chapter: 'Hardware', title: 'Arquitectura del sistema', notes: 'El equipo se comunica con el teléfono por Bluetooth de bajo consumo (BLE), sin internet. La aplicación interpreta con el motor agronómico que vive en el propio teléfono. Con conexión, el historial se respalda en la base de datos. La web de administración es de uso exclusivo del soporte técnico: busca equipos, revisa su estado y sus últimas mediciones y envía actualizaciones, que llegan al equipo a través de la aplicación. PAIR: dos pulsaciones despiertan el equipo y mantenerlo tres segundos abre la vinculación.', html: head('Hardware', 'Arquitectura del sistema') + `
      <div class="arch">
        <svg class="arch-lines" viewBox="0 0 1312 540" aria-hidden="true">
          <path class="ble" d="M452 275H652"/><path class="arrow" d="M0 0L-14 -8L-14 8Z" transform="translate(656 275)"/>
          <circle class="ring" cx="985" cy="275" r="200"/>
          <path class="arrow" d="M0 0L-14 -8L-14 8Z" transform="translate(885 102) rotate(-30)"/>
          <path class="arrow" d="M0 0L-14 -8L-14 8Z" transform="translate(1185 275) rotate(90)"/>
          <path class="arrow" d="M0 0L-14 -8L-14 8Z" transform="translate(885 448) rotate(210)"/>
          <text class="arc-label" x="862" y="84" text-anchor="end">Respaldo</text>
          <text class="arc-label" x="1200" y="280">Soporte</text>
          <text class="arc-label" x="862" y="478" text-anchor="end">Actualizaciones</text>
        </svg>
        <div class="device-box anim" style="--d:2"><p class="kicker">Equipo TerraSense</p>${[
          ['battery', 'Energía', 'Batería recargable de 5.000 mAh, carga USB y protección contra sobrecorriente e inversión de polaridad.'],
          ['leaf', 'Sensores', 'Sonda de suelo 7 en 1 (RS-485) y sensor ambiental BME280.'],
          ['chip', 'ESP32', 'Lee los sensores, envía los datos y reposa entre mediciones.'],
          ['plug', 'Interfaz', 'Pulsador de emparejamiento, LED, zumbador e interruptor.']
        ].map(([i, t, p]) => `<div class="dblock">${ic(i)}<div><b>${t}</b><span>${p}</span></div></div>`).join('')}</div>
        <div class="ble-label anim" style="--d:3"><b>Bluetooth (BLE)</b><span>sin internet</span></div>
        ${[
          ['phone', 'node-phone', 'Teléfono', 'Aplicación con el motor agronómico: interpreta, recomienda y guarda cada medición.'],
          ['database', 'node-db', 'Base de datos', 'Respalda el historial, las cuentas y los equipos cuando hay conexión.'],
          ['monitor', 'node-web', 'Web de administración', 'Soporte técnico: revisa los equipos y envía actualizaciones a través de la aplicación.']
        ].map(([i, c, t, p], k) => `<article class="node ${c} anim pop" style="--d:${4 + k}">${ic(i)}<div><b>${t}</b><span>${p}</span></div></article>`).join('')}
      </div>`},

    {id: 'cap-equipo', chapter: 'El equipo', title: 'El equipo', cls: 'divider', notes: 'Presentar el video del ensamblaje.', html: divider('El equipo', 'A continuación, presentamos un video del ensamblaje del equipo.')},

    {id: 'ensamblaje', chapter: 'El equipo', title: 'Ensamblaje del equipo', notes: 'Animación del ensamblaje generada desde el modelo 3D de la placa y la carcasa. Cada característica se ilumina cuando el video llega a esa pieza y, al pulsarla, el video salta a ese momento; se pausa solo al cambiar de pantalla.', html: head('El equipo', 'Ensamblaje del equipo') + `
      <div class="video-layout anim" style="--d:2"><video id="assembly" controls playsinline preload="metadata" poster="assets/despiece.jpg" aria-label="Animación del ensamblaje de TerraSense"><source src="assets/ensamblaje.mp4" type="video/mp4"></video>
        <div class="chapters">${[
          [0, 'Batería y placa', 'La batería queda fijada en la base de la carcasa y sobre ella va la placa, fija mediante tornillos.'],
          [8, 'Acrílico protector', 'Cubre los orificios de los LED de estado: se ven desde afuera sin que ingrese humedad ni agua.'],
          [11.2, 'Prensaestopa', 'Sella herméticamente el cable de la sonda en su entrada a la carcasa.'],
          [17.6, 'Tapa del puerto de carga', 'El puerto de carga suele ser el eslabón más débil de un ensamblaje; su tapa lo protege mientras no se carga.']
        ].map(([t, n, p]) => `<button data-video-time="${t}"><b>${n}</b><span>${p}</span></button>`).join('')}<p>Modelo 3D de la placa y la carcasa.</p></div></div>`},

    {id: 'normas', chapter: 'El equipo', title: 'Cumplimiento normativo', sources: L(['subtel', 'subtelCert', 'ip', 'battery', 'drop']), notes: 'ESP32: potencia de transmisión Bluetooth de hasta +9 dBm según su hoja de datos, cerca de 8 mW; es el presupuesto de diseño y se mide sobre el equipo terminado. SUBTEL, Res. Exenta 1.985/2017, literal k) Internet de las Cosas: en 2.400–2.483,5 MHz, potencia máxima radiada de 1 W para la comunicación de sensores con mecanismos de compartición de frecuencias. La verificación formal del producto terminado se tramita antes de la venta (Res. 737/2025). Las normas IEC son referencias de diseño, no certificaciones obtenidas; IP67 es un objetivo voluntario sujeto al ensayo completo.', html: head('Normativa', 'Cumplimiento normativo') + `
      <div class="norms2">
        <article class="rf-card anim" style="--d:2"><p class="kicker">Radio Bluetooth · SUBTEL</p><h3>Potencia de transmisión</h3>
          <div class="rf-row"><span>Límite SUBTEL para equipos IoT en 2,4 GHz</span><div class="rf-track"><i style="width:100%"></i></div><b>1.000 mW</b></div>
          <div class="rf-row esp"><span>Potencia máxima del ESP32 (+9 dBm)</span><div class="rf-track"><i style="width:1%"></i></div><b>≈ 8 mW</b></div>
          <p class="rf-result">El equipo opera muy por debajo del límite permitido. Antes de su venta, se acredita mediante la medición del equipo terminado.</p>
          <p class="rf-note">mW: milivatio, unidad de potencia · 1.000 mW = 1 W</p></article>
        <article class="field-card anim" style="--d:3"><p class="kicker">Resistencia en el campo · IEC</p><h3>Diseñado para el trabajo en terreno</h3>${[
          ['drop', 'Polvo y agua · IP67', 'Sellado contra el polvo y contra una inmersión temporal.', 'IEC 60529'],
          ['battery', 'Batería de litio', 'Seguridad de la celda frente a cortocircuito, golpes y temperatura.', 'IEC 62133-2'],
          ['shield', 'Golpes y caídas', 'Resistencia a la manipulación y al transporte diario.', 'IEC 60068-2-31']
        ].map(([i, t, p, c]) => `<div class="field-item">${ic(i)}<div><b>${t}</b><span>${p}</span><small>${c}</small></div></div>`).join('')}</article>
      </div>
      <p class="source">Referencias de diseño del equipo final; los ensayos se acreditan en laboratorio antes de la venta.</p>`},

    {id: 'cap-energia', chapter: 'Consumo energético', title: 'Consumo energético', cls: 'divider', notes: 'Cuánta energía usa cada fase de una medición y cuánto dura la batería.', html: divider('Consumo energético')},

    {id: 'fases', chapter: 'Consumo energético', title: 'Consumo por fase de medición', notes: `Registros reales del piloto, medidos en la entrada USB a 100 muestras por segundo (21-11-2026). Emparejamiento: búsqueda y conexión (${num(D.timings.busqueda_s + D.timings.conexion_s, 1)} s) a ${num(S.awakeMw)} mW. Lectura y envío: media de diez ventanas de conexión. Espera: tramo medido de ${num(S.graceSeconds, 1)} s despierto tras la última lectura. Reposo profundo: 40 µA de la placa del instrumento según su hoja de datos; el piloto de banco consume más dormido porque usa módulos de desarrollo. La corriente baja un ${num(D.reductionPct, 1)} % al pasar a reposo.`, html: head('Consumo energético', 'Consumo por fase de medición', 'mWh (milivatio-hora): energía consumida. A menor consumo, mayor duración de la batería.') + `
      <div class="phases">
        <div class="phase phead anim" style="--d:2"><span></span><span>Fase</span><span>Duración</span><span>Energía</span></div>${[
        ['1', 'Emparejamiento', 'El agricultor presiona el pulsador y el equipo abre el enlace con su aplicación: se encuentran y se conectan.', `${num(D.timings.busqueda_s + D.timings.conexion_s, 1)} s`, `${num(pairing, 2)} mWh`],
        ['2', 'Lectura y envío a la App', 'La sonda lee las diez variables y el equipo las envía por Bluetooth al teléfono, que las interpreta al instante.', `${num(D.connectionWindowSeconds, 1)} s`, `${num(reading, 2)} mWh`],
        ['3', 'Espera', 'Queda 2 minutos atento por si el agricultor quiere repetir la lectura, sin volver a emparejar.', '2 min', `${num(waiting, 2)} mWh`]
      ].map(([n, t, p, d, e], k) => `<div class="phase anim" style="--d:${3 + k}"><span class="pn">${n}</span><div class="pt"><b>${t}</b><span>${p}</span></div><span class="pd">${d}</span><strong>${e}</strong></div>`).join('')}
        <div class="phase rest anim" style="--d:6"><span class="pn">4</span><div class="pt"><b>Reposo profundo</b><span>Si no hay otra lectura, se duerme solo y casi no consume hasta que vuelvan a presionar el pulsador.</span></div><span class="pd">Hasta la próxima medición</span><strong>≈ ${num(sleepMw, 2)} mWh por hora</strong></div>
        <div class="phase total anim" style="--d:7"><span class="pn">=</span><div class="pt"><b>Total de una medición</b><span>Suma de las fases 1 a 3.</span></div><span class="pd"></span><strong>≈ ${num(perMeasurement, 1)} mWh</strong></div>
      </div>`},

    {id: 'duracion', chapter: 'Consumo energético', title: 'Duración de la batería', notes: `Modelo de autonomía del informe 3 (celda de 2.000 mAh con 1.600 mAh útiles, autodescarga del 2 % mensual y reposo profundo), escalado a 5.000 mAh con la misma proporción útil (4.000 mAh, ${num(useful5)} mWh). Uso habitual: dos jornadas semanales de 10 mediciones, ${num(habitual[0], 0)} a ${num(habitual[1], 0)} semanas y ${num(habitualMeas[0], 0)} a ${num(habitualMeas[1], 0)} mediciones. Uso intensivo: 10 mediciones diarias, ${num(intensive[0], 0)} a ${num(intensive[1], 0)} semanas. Bluelab declara cerca de 4 meses por pila con unas 10 mediciones diarias. Es una estimación con consumos medidos; se confirma con una descarga completa.`, html: head('Consumo energético', 'Duración de la batería') + `
      <div class="battery2">
        <div class="bat-hero anim" style="--d:2"><p class="kicker">Batería recargable de 5.000 mAh</p><b>≈ 1.000</b><span>mediciones por carga<br>(entre ${num(Math.round(habitualMeas[0] / 10) * 10)} y ${num(Math.round(intensiveMeas[1] / 10) * 10)}, según el uso)</span><div class="cell-level"><i></i><i></i><i></i><i></i></div></div>
        <div class="bat-cases">
          <article class="anim" style="--d:3"><p class="kicker">Uso habitual</p><h3>${num(months(habitual[0]))} a ${num(months(habitual[1]))} meses por carga</h3><p>Dos jornadas semanales de 10 mediciones.</p></article>
          <article class="anim" style="--d:4"><p class="kicker">Uso intensivo</p><h3>${num(months(intensive[0]))} a ${num(months(intensive[1]))} meses por carga</h3><p>10 mediciones diarias, todos los días.</p></article>
          <article class="vs-card anim" style="--d:5"><p class="kicker">Frente a la competencia</p><h3>Recargable, sin pilas desechables</h3><p>Bluelab Pulse declara cerca de 4 meses por pila con un uso similar al intensivo, y tanto Bluelab como Hanna funcionan con pilas desechables. TerraSense se recarga por USB: sin compra de pilas y sin residuos.</p></article>
        </div>
      </div>
      <p class="source">Estimación con los consumos medidos y el modelo de autonomía del proyecto; se confirma con una descarga completa.</p>`},

    {id: 'cap-economia', chapter: 'Economía', title: 'Economía', cls: 'divider', notes: 'Mercado, financiamiento, precio y resultados del proyecto.', html: divider('Economía')},

    {id: 'mercado', chapter: 'Economía', title: 'Tamaño del mercado', steps: 2, sources: L(['odepaCenso']), notes: `TAM (Total Addressable Market, mercado total): explotaciones agrícolas del Censo Agropecuario y Forestal 2021 (INE, 2022). SAM (Serviceable Addressable Market, mercado accesible): ≈ ${num(sam)} explotaciones, estimación del equipo que deberá afinarse por región, superficie y rubro. SOM (Serviceable Obtainable Market, mercado objetivo): ${num(rows[0].unidades)} dispositivos presupuestados para el primer año de venta, meta del modelo económico.`, html: head('Economía', 'Tamaño del mercado') + `
      <div class="market2"><div class="rings anim pop" style="--d:2"><div class="ring tam"><span>TAM</span></div><div class="ring sam" data-reveal="1"><span>SAM</span></div><div class="ring som" data-reveal="2"><span>SOM</span></div></div>
        <div class="market-rows">
          <div class="mrow anim" style="--d:3"><p class="kicker">TAM · Mercado total</p><b>175.556 explotaciones</b><span>Explotaciones agrícolas registradas en el Censo Agropecuario y Forestal 2021 (INE, 2022).</span></div>
          <div class="mrow" data-reveal="1"><p class="kicker">SAM · Mercado accesible</p><b>≈ ${num(sam)} explotaciones</b><span>Pequeños y medianos agricultores dispuestos a invertir en tecnología.</span></div>
          <div class="mrow strong" data-reveal="2"><p class="kicker">SOM · Mercado objetivo</p><b>${num(rows[0].unidades)} dispositivos</b><span>Presupuestados para el primer año de venta (${num(rows[0].unidades / sam * 100, 2)} % del mercado accesible).</span></div>
        </div></div>`},

    {id: 'financiamiento', chapter: 'Economía', title: 'Financiamiento', sources: L(['fogape']), notes: `Inversión inicial ${money(inv.total)}: equipamiento ${money(inv.equipamiento)}, desarrollo y certificaciones ${money(inv.activo_nominal)}, primer inventario ${money(inv.inventario)} y capital de trabajo para ${inv.meses_cubiertos} meses de operación ${money(inv.capital_trabajo)}. El crédito financia el 100 %. El pie de los socios se abona al banco el día del desembolso como cuotas pagadas por anticipado (${num(F.prepaid, 1)} cuotas); no reduce el principal. Tasa efectiva anual del ${num(F.rate * 100)} %. A cinco años la cuota sería de ${money(F.terms[0].monthly)}. Los instrumentos públicos (FOGAPE, Capital Semilla, Semilla Inicia) se evalúan fuera del caso base porque su obtención no es segura, no porque el proyecto no califique.`, html: head('Economía', 'Financiamiento') + `
      <div class="fin3">
        <article class="fund-box dark anim" style="--d:2"><p class="kicker">Inversión inicial · crédito bancario</p><b>${money(inv.total)}</b><p>Equipos y herramientas, desarrollo y certificaciones, primer stock de componentes y capital para operar ${inv.meses_cubiertos} meses. El banco financia el 100 %.</p></article>
        <article class="fund-box anim" style="--d:3"><p class="kicker">Pie de los socios</p><b>${money(F.downpayment)}</b><p>Se abona al banco el primer día y cubre las primeras ${Math.floor(F.prepaid)} cuotas: casi dos años sin cuota mientras el negocio se establece.</p></article>
        <article class="fund-box term anim" style="--d:4"><p class="kicker">Plazo del crédito</p><b>10 años</b><p>Cuota mensual de <strong>${money(term10.monthly)}</strong> · tasa anual del ${num(F.rate * 100)} % · intereses totales de ${money(interest10)}.</p></article>
      </div>
      <div class="fin-why anim" style="--d:5"><h3>¿Por qué a diez años?</h3><p>Se optó por un plazo de diez años para reducir la cuota mensual y resguardar la liquidez de la empresa durante sus primeros años de operación, cuando las ventas aún están en crecimiento. El mayor costo en intereses se compensa con un flujo de caja más holgado en la etapa de introducción.</p></div>
      <p class="source">Los fondos públicos (FOGAPE, Capital Semilla, Semilla Inicia) se evalúan, pero no forman parte del caso base porque su obtención no es segura.</p>`},

    {id: 'precio', chapter: 'Economía', title: 'Composición del precio', steps: 2, notes: `Costo total promedio por equipo, neto, ponderado en los 10 años del modelo: ${F.price.parts.map(p => p.name.toLowerCase() + ' ' + money(p.value)).join('; ')}. Se exige un 30 % de utilidad sobre el costo y se redondea al alza a la terminación comercial. La utilidad se destina primero al pago del crédito y luego a la reinversión en nuevos dispositivos.`, html: head('Economía', 'Composición del precio', 'El precio se obtiene del costo total de cada equipo más un 30 % de utilidad.') + `
      <div class="price2">
        <div class="price-bars">${groups.map(([t, v, p], k) => `<div class="pbar anim" style="--d:${2 + k};--w:${v / maxGroup * 100}%"><div class="pbar-head"><span>${t}</span><b>${money(v)}</b></div><div class="pbar-track"><i></i></div><small>${p}</small></div>`).join('')}
          <div class="ptotal anim" style="--d:6"><span>Costo total por equipo</span><b>${money(F.price.cost)}</b></div>
          <div class="profit-use anim" style="--d:7"><h3>Destino de la utilidad</h3><p>Primero, el pago del crédito. Luego, la reinversión en nuevos dispositivos y áreas del negocio.</p></div></div>
        <div class="price-sum">
          <div class="psum-row"><span>Costo total</span><b>${money(F.price.cost)}</b></div>
          <div class="psum-row" data-reveal="1"><span>+ Utilidad (30 %)</span><b>${money(F.price.profit)}</b></div>
          <div class="psum-row sub" data-reveal="1"><span>Precio neto</span><b>${money(F.price.net)}</b></div>
          <div class="psum-row" data-reveal="2"><span>+ IVA (19 %)</span><b>${money(F.price.vat)}</b></div>
          <div class="psum-row total" data-reveal="2"><span>Precio de venta</span><b>${money(F.price.list)}</b></div>
        </div></div>
      <p class="source">Valores promedio por equipo en los 10 años del plan.</p>`},

    {id: 'resultados', chapter: 'Economía', title: 'Resultados y recuperación de la inversión', steps: 1, notes: `Barras: utilidad de cada año. 2027 cierra con pérdida (${money(rows[0].util_neta)}) y 2028 con una utilidad mínima (${money(rows[1].util_neta)}); la rentabilidad se consolida desde 2029. Línea verde: recuperación de la inversión de ${mill(F.inversion)}, financiada con el crédito. Parte en −${mill(F.inversion)} y suma cada año lo que deja el negocio después de pagar las cuotas del crédito; las primeras ${Math.floor(F.prepaid)} cuotas se pagan con el pie de ${mill(F.downpayment, 0)} de los socios. Pasa a positivo a los ${num(F.payback, 1)} años, a mediados de 2030. Línea gris: deuda pendiente con el banco, que se paga con cuotas mensuales hasta 2036. VAN al ${num(F.discountRate * 100)} % y TIR resumen los diez años e incluyen los primeros años en contra. Con el descuento del ${num(F.discountRate * 100)} % anual, la recuperación es a los ${num(F.payback_desc, 1)} años.`, html: head('Economía', 'Resultados y recuperación de la inversión') + `
      <div class="results"><figure class="viz anim" style="--d:2" data-chart="results"><div class="viz-legend legend3">
          <span><i style="background:#262626"></i><b>Barras:</b> utilidad del año (ganancia o pérdida)</span>
          <span><i style="background:#228a5a;height:4px"></i><b>Línea verde:</b> recuperación de la inversión de ${mill(F.inversion)}</span>
          <span><i style="background:#8a8a8a;height:4px"></i><b>Línea gris:</b> deuda pendiente con el banco</span></div></figure>
        <div class="kpis">${[
          [mill(F.van), 'VAN (valor actual neto)', `Valor que genera el proyecto en diez años, expresado en dinero de hoy, después de recuperar lo invertido y exigir un ${num(F.discountRate * 100)} % anual.`],
          [num(F.tir * 100, 1) + ' %', 'TIR (tasa interna de retorno)', `Rentabilidad anual del proyecto; supera el ${num(F.discountRate * 100)} % exigido.`]
        ].map(([v, l, p], k) => `<div class="kpi anim" style="--d:${3 + k}"><b>${v}</b><span><strong>${l}</strong><br>${p}</span></div>`).join('')}</div></div>`},

    {id: 'demostracion', chapter: 'Demostración', title: 'Demostración de medición', cls: 'divider', notes: 'Demostración presencial: proyectar la pantalla del teléfono y realizar una medición completa.', html: divider('Demostración de medición')}
  ];
})();

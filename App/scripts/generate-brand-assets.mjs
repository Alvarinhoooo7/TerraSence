// El code.html de Logo/Logo contiene el SVG de la marca. Este generador conserva el vector y
// exporta los PNG que requiere Expo. Ejecutar desde cualquier directorio.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { createCanvas, loadImage, GlobalFonts, convertSVGTextToPath } from '@napi-rs/canvas';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Fija las fuentes del recurso para conservar el mismo dibujo en GitHub, iOS y Android.
const fontDir = process.env.BRAND_FONT_DIR || 'C:/Windows/Fonts';
if (!GlobalFonts.registerFromPath(join(fontDir, 'segoeuib.ttf'), 'TerraSense Brand') ||
    !GlobalFonts.registerFromPath(join(fontDir, 'seguisb.ttf'), 'TerraSense Detail')) {
  throw new Error('Indica BRAND_FONT_DIR con segoeuib.ttf y seguisb.ttf para reproducir la marca.');
}
const logoSource = (await readFile(join(root, 'Logo/Logo/code.html'), 'utf8'))
  .replace(/viewBox="[^"]+"/, 'viewBox="145 110 590 235"')
  .replace(/<defs>[\s\S]*?<\/defs>/, '')
  .replace('class="brand-title"', 'font-family="TerraSense Brand" font-weight="800" font-size="52" fill="#0f2e22" letter-spacing="-0.5"')
  .replace('class="brand-sub"', 'font-family="TerraSense Detail" font-weight="600" font-size="14" fill="#16a34a" letter-spacing="5"');
if (/Sence|SENCE/.test(logoSource)) throw new Error('La marca fuente debe decir TerraSense.');
// Sólo trazar las letras: conservar curvas, gradientes, trazos y viewBox originales.
const outline = svg => svg.replace(/<text[\s\S]*?<\/text>/g, text => {
  const converted = convertSVGTextToPath(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450">${text}</svg>`).toString();
  return converted.slice(converted.indexOf('>', converted.indexOf('<svg')) + 1, converted.lastIndexOf('</svg>'));
}).replaceAll('#0F2E22', '#0f2e22');
const logo = outline(logoSource);
await writeFile(join(root, 'Logo/Logo/terrasense.svg'), logo);
await writeFile(join(root, 'Logo/Logo/terrasense-dark.svg'), logo.replaceAll('#0f2e22', '#ECFDF5'));
await writeFile(join(root, 'App/src/components/brandAsset.ts'), '// Generado desde Logo/Logo/code.html por scripts/generate-brand-assets.mjs.\nexport const brandSvg = '+JSON.stringify(logo)+';\n');

// Letras de «TerraSense» en la línea base del logotipo: «Terra» en #0f2e22 y «Sense» en
// #16A34A. Las mismas que lee BrandWordmark en App/src/components/BrandLogo.tsx.
const glyphs = [...logo.matchAll(/<path fill="(#0f2e22|#16A34A)"(?: transform="translate\(([\d.]+) 0\)")? d="([^"]+)"\/>/g)]
  .map(([, fill, x, d]) => ({ terra: fill === '#0f2e22', x: Number(x ?? 0), d }));

// Renderizador local Skia: no requiere navegador, red ni captura de pantalla.
// `height` distinto del ancho para la marca apaisada: en un lienzo cuadrado el logotipo
// queda rodeado de vacío y la pantalla de arranque lo centra descolocado.
const render = async (svg, file, size, height = size) => {
  const canvas = createCanvas(size, height);
  const source = svg.replace('width="100%" height="100%"', `width="${size}" height="${height}"`);
  canvas.getContext('2d').drawImage(await loadImage(Buffer.from(source)), 0, 0, size, height);
  await writeFile(join(root, file), await canvas.encode('png'));
};

// Ícono: «TS», la T de «Terra» y la S de «Sense» del logotipo, sobre un verde un tono más
// claro que el de la carga (#052e16) para que las letras destaquen. El nombre completo no
// se lee a 48 dp ni dentro del círculo que recorta Android; va en el arranque y en la app.
const ICON = { background: '#166534', terra: '#ECFDF5', sense: '#4ADE80' };
const T = glyphs[0];
const S = glyphs.find(glyph => !glyph.terra);
const sOffset = glyphs[1].x; // avance de la T: la S queda donde iría la segunda letra
// Caja de tinta de las dos letras en unidades del logotipo (T: 0,79–29,73; S: 2,49–27,32).
const ink = { left: 0.79, right: sOffset + 27.32, top: -37.02, bottom: 0.63 };
/**
 * SVG cuadrado con «TS» centrado. `scale` es el ancho de las letras sobre el del lienzo,
 * `radius` el redondeo del fondo sobre el lado y `background: null` deja el fondo transparente.
 */
const monogram = ({ scale, background = ICON.background, radius = 0, terra = ICON.terra, sense = ICON.sense }) => {
  const side = (ink.right - ink.left) / scale;
  const x = (ink.left + ink.right - side) / 2;
  const y = (ink.top + ink.bottom - side) / 2;
  const box = `x="${x}" y="${y}" width="${side}" height="${side}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${side} ${side}" width="100%" height="100%">` +
    (background ? `<rect ${box} rx="${side * radius}" fill="${background}"/>` : '') +
    `<path fill="${terra}" d="${T.d}"/><path fill="${sense}" transform="translate(${sOffset} 0)" d="${S.d}"/></svg>`;
};
// iOS y la tienda recortan el cuadrado completo; el favicon lleva sus propias esquinas.
await render(monogram({ scale: 0.56 }), 'App/assets/icon.png', 1024);
// Primer plano del ícono adaptativo de Android: el fondo es `adaptiveIcon.backgroundColor`
// de app.config.js (= ICON.background). Las letras caben en la zona segura de 66 de 108 dp.
await render(monogram({ scale: 0.46, background: null }), 'App/assets/adaptive-icon.png', 1024);
// Android dibuja el ícono de notificación sólo con su canal alfa: tiene que ser una silueta
// sobre transparente; con fondo opaco se ve como un cuadrado blanco.
await render(monogram({ scale: 0.8, background: null, terra: '#FFFFFF', sense: '#FFFFFF' }), 'App/assets/notification-icon.png', 96);
const favicon = monogram({ scale: 0.66, radius: 0.22 });
await render(favicon, 'App/assets/favicon.png', 64);
await mkdir(join(root, 'Web/public'), { recursive: true });
await writeFile(join(root, 'Web/public/favicon.svg'), favicon);

// La pantalla de arranque va sobre el verde oscuro de la carga.
// Sólo el nombre «TerraSense» en dos colores, como la pantalla de carga (BrandWordmark en
// App/src/components/BrandLogo.tsx, misma expresión y misma caja): «Terra» claro y «Sense»
// verde. Sin isotipo ni subtítulo, para que el paso del arranque nativo a la carga no se note.
const wordmark = (terraFill, senseFill) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -38 268 39.5" width="100%" height="100%">' +
  glyphs.map(({ terra, x, d }) => `<path fill="${terra ? terraFill : senseFill}" transform="translate(${x} 0)" d="${d}"/>`).join('') + '</svg>\n';
await render(wordmark('#ECFDF5', '#22C55E'), 'App/assets/splash.png', 1024, Math.round(1024 * 39.5 / 268));
// El mismo nombre como logotipo del README (claro y oscuro) y del backoffice web. La copia
// de Web/src/assets permite compilar la consola sin archivos fuera de Web/; su «Terra»
// lleva la tinta de marca y Web/src/ui/BrandLogo.tsx la cambia por el color del tema.
await writeFile(join(root, 'Logo/Logo/terrasense-wordmark.svg'), wordmark('#0f2e22', '#16A34A'));
await writeFile(join(root, 'Logo/Logo/terrasense-wordmark-dark.svg'), wordmark('#ECFDF5', '#22C55E'));
await writeFile(join(root, 'Web/src/assets/terrasense-wordmark.svg'), wordmark('#0f2e22', '#16A34A'));
console.log('Marca vectorial, favicon e íconos Expo generados desde Logo/Logo.');

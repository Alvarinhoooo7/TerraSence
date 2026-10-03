// Los code.html de Logo contienen SVG. Este generador conserva el vector y exporta
// únicamente los PNG que requiere Expo. Ejecutar desde cualquier directorio.
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
const assetSource = (await readFile(join(root, 'Logo/Asset/code.html'), 'utf8')).replace(/font-family="[^"]+"/, 'font-family="TerraSense Brand"');
if (/Sence|SENCE/.test(logoSource + assetSource)) throw new Error('La marca fuente debe decir TerraSense.');
// Sólo trazar las letras: conservar curvas, gradientes, trazos y viewBox originales.
const outline = svg => svg.replace(/<text[\s\S]*?<\/text>/g, text => {
  const converted = convertSVGTextToPath(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450">${text}</svg>`).toString();
  return converted.slice(converted.indexOf('>', converted.indexOf('<svg')) + 1, converted.lastIndexOf('</svg>'));
}).replaceAll('#0F2E22', '#0f2e22');
const logo = outline(logoSource);
const asset = outline(assetSource);
await mkdir(join(root, 'Web/public'), { recursive: true });
await writeFile(join(root, 'Logo/Logo/terrasense.svg'), logo);
await writeFile(join(root, 'Logo/Logo/terrasense-dark.svg'), logo.replaceAll('#0f2e22', '#ECFDF5'));
await writeFile(join(root, 'Web/public/favicon.svg'), asset);
await writeFile(join(root, 'App/src/components/brandAsset.ts'), '// Generado desde Logo/Logo/code.html por scripts/generate-brand-assets.mjs.\nexport const brandSvg = '+JSON.stringify(logo)+';\n');

// Renderizador local Skia: no requiere navegador, red ni captura de pantalla.
// `height` distinto del ancho para la marca apaisada: en un lienzo cuadrado el logotipo
// queda rodeado de vacío y la pantalla de arranque lo centra descolocado.
const render = async (svg, file, size, transparent = false, height = size) => {
  const canvas = createCanvas(size, height);
  const ctx = canvas.getContext('2d');
  if (!transparent) { ctx.fillStyle = '#052e16'; ctx.fillRect(0, 0, size, height); }
  const source = svg.replace('width="100%" height="100%"', `width="${size}" height="${height}"`);
  const image = await loadImage(Buffer.from(source));
  ctx.drawImage(image, 0, 0, size, height);
  await writeFile(join(root, file), await canvas.encode('png'));
};
const square = outline(assetSource.replace('x="56" y="56" width="400" height="400" rx="92"', 'x="0" y="0" width="512" height="512" rx="0"'));
// La zona segura de Android contiene el símbolo; la máscara la decide el launcher.
const foreground = outline(assetSource.replace(/<rect x="56"[^>]+\/>/, '').replace(/<text[\s\S]*?<\/text>/, '')
  .replace('viewBox="0 0 512 512"', 'viewBox="-96 -96 704 704"'));
await render(square, 'App/assets/icon.png', 1024);
await render(foreground, 'App/assets/adaptive-icon.png', 1024, true);
await render(asset, 'App/assets/favicon.png', 64, true);
// La pantalla de arranque va sobre el verde oscuro de la carga.
// Sólo el nombre «TerraSense» en dos colores, como la pantalla de carga (BrandWordmark en
// App/src/components/BrandLogo.tsx, misma expresión y misma caja): «Terra» claro y «Sense»
// verde. Sin isotipo ni subtítulo, para que el paso del arranque nativo a la carga no se note.
const wordmark = [...logo.matchAll(/<path fill="(#0f2e22|#16A34A)"(?: transform="translate\(([\d.]+) 0\)")? d="([^"]+)"\/>/g)]
  .map(([, fill, x, d]) => `<path fill="${fill === '#0f2e22' ? '#ECFDF5' : '#22C55E'}" transform="translate(${x ?? 0} 0)" d="${d}"/>`).join('');
await render(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -38 268 39.5" width="100%" height="100%">${wordmark}</svg>`,
  'App/assets/splash.png', 1024, true, Math.round(1024 * 39.5 / 268));
console.log('Marca vectorial, favicon e íconos Expo generados desde Logo/.');

// Web/scripts/verificar-clases.mjs
//
// Comprueba que toda utilidad de color del tema usada en `src/` llegue a
// generar CSS.
//
// Existe por un defecto concreto: los colores del semáforo estaban definidos
// como variables en `:root` pero fuera de `@theme`, y Tailwind v4 sólo genera
// utilidades para lo declarado ahí. El resultado fueron 138 clases
// —`text-verdict-red`, `bg-verdict-amber/10`, `border-verdict-red/30`…— que no
// producían ni un byte de CSS. Nada falla al compilar: el semáforo agronómico,
// los avisos de error y el botón de reseteo simplemente se pintaban sin color,
// y sólo se ve mirando la pantalla.
//
// Requiere un build previo (`npm run build`), porque compara contra el CSS
// realmente emitido y no contra la configuración.
//
//   node scripts/verificar-clases.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'dist', 'assets');

if (!fs.existsSync(assets)) {
  console.error('No hay build en dist/. Ejecuta primero `npm run build`.');
  process.exit(1);
}

const cssFile = fs
  .readdirSync(assets)
  .filter((f) => f.endsWith('.css'))
  .map((f) => path.join(assets, f))[0];

if (!cssFile) {
  console.error('El build no emitió ningún CSS.');
  process.exit(1);
}

// Tailwind escapa los caracteres especiales del selector (`.bg-x\/10`);
// se quitan las barras invertidas para comparar con la clase tal como se
// escribe en el JSX.
const inCss = new Set(
  [...fs.readFileSync(cssFile, 'utf8').matchAll(/\.((?:\\.|[-\w])+)/g)].map((m) =>
    m[1].replace(/\\/g, ''),
  ),
);

const sources = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) sources.push(full);
  }
})(path.join(root, 'src'));

/** Utilidades que dependen de un token de color declarado en `@theme`. */
const TOKEN_UTILITY =
  /^(?:[a-z-]+:)*(bg|text|border|ring|shadow|fill|stroke|divide|outline|from|to|via|placeholder|accent|caret|decoration)-(ink|muted|faint|primary|danger|warning|offline|rail|line|surface|sunken|hover|overlay|focus)\b/;

const missing = new Map();
let checked = 0;

for (const file of sources) {
  for (const token of fs.readFileSync(file, 'utf8').split(/[\s"'`{}()]+/)) {
    // Un fragmento de plantilla (`${…}`) no es una clase: se descarta.
    const cls = token.replace(/^\$\{.*/, '').trim();
    if (!cls || !TOKEN_UTILITY.test(cls)) continue;
    checked += 1;
    // `bg-primary/15` se genera a partir de `bg-primary`.
    const base = cls.split('/')[0];
    if (inCss.has(cls) || inCss.has(base)) continue;
    if (!missing.has(cls)) missing.set(cls, new Set());
    missing.get(cls).add(path.relative(root, file));
  }
}

console.log(`Utilidades de color del tema usadas en src/: ${checked}`);

if (missing.size === 0) {
  console.log('OK: todas generan CSS.');
  process.exit(0);
}

console.error(`\n${missing.size} clase(s) no generan CSS:`);
for (const [cls, files] of missing) {
  console.error(`  ${cls}\n    ${[...files].join('\n    ')}`);
}
console.error(
  '\nDeclara el token que les falta en el bloque `@theme inline` de src/index.css.',
);
process.exit(1);

import { spawnSync } from 'node:child_process';

// Excepciones temporales estrictas: image-size 2.0.2 es una dependencia de
// build de Metro y, al 30-08-2026, GitHub Advisory declara que no existe una
// versión corregida. No se usa para procesar imágenes aportadas por usuarios
// dentro del runtime de TerraSense.
const allowedAdvisories = new Set([
  'https://github.com/advisories/GHSA-w3rx-r6r6-pgpr',
  'https://github.com/advisories/GHSA-5p2g-fcmc-qvqq',
]);

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const audit = spawnSync(npmCommand, ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
});

if (audit.error || !audit.stdout) {
  console.error(audit.error?.message ?? audit.stderr ?? 'npm audit no produjo resultados.');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error(audit.stdout);
  console.error('La salida de npm audit no es JSON válido.');
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};

const isAllowed = (name, visiting = new Set()) => {
  if (visiting.has(name)) return true;
  const vulnerability = vulnerabilities[name];
  if (!vulnerability) return false;
  const next = new Set(visiting).add(name);

  return vulnerability.via.every((cause) => {
    if (typeof cause === 'string') return isAllowed(cause, next);
    return typeof cause?.url === 'string' && allowedAdvisories.has(cause.url);
  });
};

const blocked = Object.entries(vulnerabilities)
  .filter(([, vulnerability]) => ['high', 'critical'].includes(vulnerability.severity))
  .filter(([name]) => !isAllowed(name))
  .map(([name]) => name);

if (blocked.length > 0) {
  console.error(`Vulnerabilidades altas/críticas sin excepción: ${blocked.join(', ')}`);
  process.exit(1);
}

const allowed = Object.keys(vulnerabilities).filter((name) => isAllowed(name));
if (allowed.length > 0) {
  console.warn(`Excepciones temporales sin parche upstream: ${allowed.join(', ')}`);
}
console.log('Auditoría npm aprobada: no hay vulnerabilidades altas/críticas no autorizadas.');

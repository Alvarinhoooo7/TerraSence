// Compila el APK release distribuible y verifica que otro teléfono pueda instalarlo.
//
//   npm run android:release                        prebuild + assembleRelease + verificación
//   node scripts/build-android-release.mjs --verificar <apk>   sólo verifica un APK existente
//
// Un APK se rechaza si:
//   - lleva android:testOnly="true" (Android Studio «Run»): sólo se instala con adb install -t;
//   - es depurable;
//   - le falta armeabi-v7a o arm64-v8a, o alguna ABI no trae libappmodules.so (código nativo
//     propio de la app): en esos teléfonos la app se cierra al abrir;
//   - está firmado con la clave debug, que es pública y Google Play rechaza.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID_DIR = path.join(APP_DIR, 'android');
const RELEASE_APK = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const REQUIRED_ABIS = ['armeabi-v7a', 'arm64-v8a'];
const IS_WINDOWS = process.platform === 'win32';

function run(command, args, options = {}) {
  // Node exige shell para ejecutar .bat en Windows; las rutas van entre comillas.
  const quote = (value) => (/\s/.test(value) ? `"${value}"` : value);
  const result = IS_WINDOWS
    ? spawnSync([command, ...args].map(quote).join(' '), { shell: true, encoding: 'utf8', ...options })
    : spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  return result;
}

// Primera ruta del SDK que existe: variables de entorno, local.properties o la de Android Studio.
function sdkDir() {
  const candidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT];
  const localProperties = path.join(ANDROID_DIR, 'local.properties');
  if (fs.existsSync(localProperties)) {
    const match = fs.readFileSync(localProperties, 'utf8').match(/^sdk\.dir=(.+)$/m);
    if (match) candidates.push(match[1].trim().replace(/\\(.)/g, '$1'));
  }
  candidates.push(
    IS_WINDOWS
      ? path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk')
      : path.join(os.homedir(), 'Android', 'Sdk'),
  );
  const found = candidates.find((candidate) => candidate && fs.existsSync(path.join(candidate, 'platforms')));
  if (!found) throw new Error('No se encontró el SDK de Android: definir ANDROID_HOME (README, sección 11.2).');
  return found;
}

function buildTool(name) {
  const root = path.join(sdkDir(), 'build-tools');
  if (!fs.existsSync(root)) throw new Error(`No hay build-tools del SDK de Android en ${root}.`);
  const versions = fs
    .readdirSync(root)
    .filter((version) => /^\d+(\.\d+)*/.test(version))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  for (const version of versions) {
    for (const candidate of IS_WINDOWS ? [`${name}.bat`, `${name}.exe`] : [name]) {
      const tool = path.join(root, version, candidate);
      if (fs.existsSync(tool)) return tool;
    }
  }
  throw new Error(`No se encontró ${name} en ${root}.`);
}

// Nombres de las entradas de un ZIP leídos del directorio central (los APK no usan ZIP64).
function zipEntries(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const tailLength = Math.min(size, 0xffff + 22);
    const tail = Buffer.alloc(tailLength);
    fs.readSync(fd, tail, 0, tailLength, size - tailLength);
    const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocd === -1) throw new Error(`${file} no es un ZIP válido.`);
    const directorySize = tail.readUInt32LE(eocd + 12);
    const directoryOffset = tail.readUInt32LE(eocd + 16);
    const directory = Buffer.alloc(directorySize);
    fs.readSync(fd, directory, 0, directorySize, directoryOffset);
    const names = [];
    for (let offset = 0; offset < directorySize; ) {
      if (directory.readUInt32LE(offset) !== 0x02014b50) break;
      const nameLength = directory.readUInt16LE(offset + 28);
      const extraLength = directory.readUInt16LE(offset + 30);
      const commentLength = directory.readUInt16LE(offset + 32);
      names.push(directory.toString('utf8', offset + 46, offset + 46 + nameLength));
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return names;
  } finally {
    fs.closeSync(fd);
  }
}

function verifyApk(apk) {
  if (!fs.existsSync(apk)) throw new Error(`No existe ${apk}.`);
  const problems = [];

  const manifest = run(buildTool('aapt2'), ['dump', 'xmltree', '--file', 'AndroidManifest.xml', apk]);
  if (manifest.status !== 0) throw new Error(`aapt2 no pudo leer el manifiesto:\n${manifest.stderr}`);
  if (/:testOnly\(0x[0-9a-f]+\)=(true|-1)/i.test(manifest.stdout)) {
    problems.push('android:testOnly="true": sólo se instala con adb install -t (APK del botón «Run» de Android Studio).');
  }
  if (/:debuggable\(0x[0-9a-f]+\)=(true|-1)/i.test(manifest.stdout)) {
    problems.push('android:debuggable="true": es una compilación de depuración.');
  }

  const libraries = new Map();
  for (const entry of zipEntries(apk)) {
    const match = entry.match(/^lib\/([^/]+)\/([^/]+\.so)$/);
    if (!match) continue;
    if (!libraries.has(match[1])) libraries.set(match[1], new Set());
    libraries.get(match[1]).add(match[2]);
  }
  for (const abi of REQUIRED_ABIS) {
    if (!libraries.has(abi)) problems.push(`Falta la ABI ${abi}.`);
  }
  for (const [abi, files] of libraries) {
    if (!files.has('libappmodules.so')) {
      problems.push(`La ABI ${abi} no trae libappmodules.so: la app se cierra al abrir en esos teléfonos.`);
    }
  }

  const signature = run(buildTool('apksigner'), ['verify', '--print-certs', apk]);
  const certificate = signature.stdout.match(/certificate DN: (.+)/)?.[1]?.trim();
  const sha256 = signature.stdout.match(/certificate SHA-256 digest: ([0-9a-f]+)/)?.[1];
  if (signature.status !== 0 || !certificate) {
    problems.push(`La firma no es válida:\n${signature.stdout}${signature.stderr}`);
  } else if (/CN=Android Debug/.test(certificate)) {
    problems.push('Está firmado con la clave debug, que es pública: Google Play lo rechaza y no actualiza una instalación firmada con otra clave.');
  }

  return { problems, abis: [...libraries.keys()].sort(), certificate, sha256 };
}

function report(apk, { problems, abis, certificate, sha256 }) {
  const megabytes = (fs.statSync(apk).size / 1024 / 1024).toFixed(1);
  console.log(`\nAPK: ${apk} (${megabytes} MB)`);
  console.log(`ABI: ${abis.join(', ') || '(ninguna)'}`);
  if (certificate) console.log(`Firma: ${certificate}\n       SHA-256 ${sha256}`);
  if (problems.length > 0) {
    console.error(`\nAPK NO distribuible:\n - ${problems.join('\n - ')}`);
    process.exit(1);
  }
  console.log('\nAPK distribuible: sin testOnly, con 32 y 64 bits y firmado con la clave de publicación.');
}

function build() {
  // prebuild aplica los config plugins (firma incluida) sobre android/. Con --no-clean no lo
  // borra: en Windows un IDE abierto o el daemon de Gradle lo bloquean, y se conserva
  // local.properties. Si android/ no existe, lo crea; entonces se escribe local.properties.
  const androidHome = sdkDir();
  const gradlew = path.join(ANDROID_DIR, IS_WINDOWS ? 'gradlew.bat' : 'gradlew');
  const prebuild = run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install', '--no-clean'], {
    cwd: APP_DIR,
    stdio: 'inherit',
    env: { ...process.env, CI: '1' },
  });
  if (prebuild.status !== 0) process.exit(prebuild.status ?? 1);
  const localProperties = path.join(ANDROID_DIR, 'local.properties');
  if (!fs.existsSync(localProperties)) {
    fs.writeFileSync(localProperties, `sdk.dir=${androidHome.replace(/[\\:]/g, (char) => `\\${char}`)}\n`);
  }

  // Sin -PreactNativeArchitectures: vale el de gradle.properties, que cubre 32 y 64 bits.
  fs.rmSync(RELEASE_APK, { force: true });
  const gradle = run(gradlew, ['assembleRelease'], {
    cwd: ANDROID_DIR,
    stdio: 'inherit',
  });
  if (gradle.status !== 0) process.exit(gradle.status ?? 1);
}

const verifyIndex = process.argv.indexOf('--verificar');
let apk = RELEASE_APK;
if (verifyIndex !== -1) {
  apk = path.resolve(process.argv[verifyIndex + 1] ?? RELEASE_APK);
} else {
  build();
}
report(apk, verifyApk(apk));

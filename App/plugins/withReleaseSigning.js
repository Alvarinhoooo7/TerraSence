// App/plugins/withReleaseSigning.js
/**
 * Firma y protección de las compilaciones release de Android.
 *
 * La plantilla de Expo/React Native firma `release` con `debug.keystore`, cuya clave es
 * pública: un APK así no se instala sobre otro firmado distinto y Google Play lo rechaza.
 * Como `android/` se regenera con `expo prebuild`, el cambio vive aquí y no en el Gradle.
 *
 * 1. Crea `signingConfigs.release` con la clave de publicación propia. Sus cuatro valores se
 *    leen de propiedades de Gradle (en `~/.gradle/gradle.properties`, fuera del repositorio
 *    y de `android/`): TERRASENSE_UPLOAD_STORE_FILE, TERRASENSE_UPLOAD_STORE_PASSWORD,
 *    TERRASENSE_UPLOAD_KEY_ALIAS y TERRASENSE_UPLOAD_KEY_PASSWORD.
 * 2. Hace que `buildTypes.release` firme con ella en vez de con la debug.
 * 3. Aborta toda tarea release que produciría un APK no distribuible: sin clave propia, con
 *    `android:testOnly="true"` o con el código nativo limitado a una sola ABI. Las dos últimas
 *    las inyecta el botón «Run» de Android Studio (y `expo run:android` limita la ABI a la del
 *    teléfono conectado); el APK resultante sólo se instala con `adb install -t` y, en
 *    teléfonos de 32 bits, no encuentra `libappmodules.so`.
 *
 * El APK distribuible se compila con `npm run android:release`, que además lo verifica.
 */

const { withAppBuildGradle, createRunOncePlugin } = require('expo/config-plugins');

const MARKER = 'TERRASENSE-RELEASE-SIGNING';

const SIGNING_PROPERTIES = `// ${MARKER} (App/plugins/withReleaseSigning.js)
// La clave de publicación vive fuera del repositorio y de android/, que prebuild regenera.
def uploadStoreFile = findProperty('TERRASENSE_UPLOAD_STORE_FILE')
def releaseSigningReady = uploadStoreFile && file(uploadStoreFile).exists() &&
    ['TERRASENSE_UPLOAD_STORE_PASSWORD', 'TERRASENSE_UPLOAD_KEY_ALIAS', 'TERRASENSE_UPLOAD_KEY_PASSWORD'].every { findProperty(it) }

`;

const RELEASE_SIGNING_CONFIG = `
        release {
            if (releaseSigningReady) {
                storeFile file(uploadStoreFile)
                storePassword findProperty('TERRASENSE_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('TERRASENSE_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('TERRASENSE_UPLOAD_KEY_PASSWORD')
            }
        }`;

const RELEASE_GUARD = `
// ${MARKER}: un release se distribuye, así que se aborta antes de producir un APK que otro
// teléfono rechace o en el que la app no arranque.
gradle.taskGraph.whenReady { graph ->
    def releaseTask = graph.allTasks.any { it.project == project && it.name ==~ /(assemble|bundle|package|install)Release/ }
    if (!releaseTask) return

    def problems = []
    if (!releaseSigningReady) {
        problems << 'Falta la clave de publicación: definir TERRASENSE_UPLOAD_STORE_FILE, TERRASENSE_UPLOAD_STORE_PASSWORD, ' +
            'TERRASENSE_UPLOAD_KEY_ALIAS y TERRASENSE_UPLOAD_KEY_PASSWORD en ~/.gradle/gradle.properties (App/README.md, sección 9.1).'
    }
    if ((findProperty('android.injected.testOnly') ?: 'false').toString().toBoolean()) {
        problems << 'Android Studio inyectó android:testOnly="true" (botón Run): ese APK sólo se instala con adb install -t.'
    }
    def injectedAbi = findProperty('android.injected.build.abi')
    if (injectedAbi) {
        problems << "Android Studio limitó el código nativo a la ABI del teléfono conectado (\${injectedAbi})."
    }
    def architectures = findProperty('reactNativeArchitectures')
    def abis = architectures ? architectures.toString().split(',')*.trim() : ['armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64']
    def missingAbis = ['armeabi-v7a', 'arm64-v8a'] - abis
    if (missingAbis) {
        problems << "reactNativeArchitectures=\${architectures} no incluye \${missingAbis.join(', ')}: " +
            'los teléfonos que la necesitan no encontrarían libappmodules.so.'
    }
    if (problems) {
        throw new GradleException('Compilación release rechazada:\\n - ' + problems.join('\\n - ') +
            '\\nEl APK distribuible se compila con: npm run android:release')
    }
}
`;

function insertAfter(contents, anchor, insertion, from = 0) {
  const index = contents.indexOf(anchor, from);
  if (index === -1) return null;
  const end = index + anchor.length;
  return contents.slice(0, end) + insertion + contents.slice(end);
}

function applyReleaseSigning(contents) {
  if (contents.includes(MARKER)) return contents;
  const fail = (what) => {
    throw new Error(`withReleaseSigning: no se encontró ${what} en android/app/build.gradle; revisar la plantilla.`);
  };

  const androidBlock = contents.search(/^android\s*\{/m);
  if (androidBlock === -1) fail('el bloque android {');
  let next = contents.slice(0, androidBlock) + SIGNING_PROPERTIES + contents.slice(androidBlock);

  next = insertAfter(next, 'signingConfigs {', RELEASE_SIGNING_CONFIG) ?? fail('signingConfigs {');

  const buildTypes = next.indexOf('buildTypes {');
  const releaseType = buildTypes === -1 ? -1 : next.indexOf('release {', buildTypes);
  if (releaseType === -1) fail('buildTypes { release {');
  const debugSigning = 'signingConfig signingConfigs.debug';
  const debugSigningInRelease = next.indexOf(debugSigning, releaseType);
  if (debugSigningInRelease === -1) fail(`${debugSigning} dentro de buildTypes.release`);
  next =
    next.slice(0, debugSigningInRelease) +
    'signingConfig signingConfigs.release' +
    next.slice(debugSigningInRelease + debugSigning.length);

  return `${next.trimEnd()}\n${RELEASE_GUARD}`;
}

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = applyReleaseSigning(gradleConfig.modResults.contents);
    return gradleConfig;
  });
}

module.exports = createRunOncePlugin(withReleaseSigning, 'withReleaseSigning', '1.0.0');
module.exports.applyReleaseSigning = applyReleaseSigning;

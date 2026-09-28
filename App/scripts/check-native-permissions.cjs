// Revisa los permisos que llegan de verdad al Info.plist y al AndroidManifest después
// de aplicar todos los plugins, sin compilar ni escribir en el proyecto. Un app.config.js
// correcto no basta: las dependencias agregan claves por su cuenta.
//
// Uso, desde App/:  node scripts/check-native-permissions.cjs
//
// Omite los archivos de Firebase (`googleServicesFile`), que no están en el repositorio:
// sin ellos la introspección de Expo se detiene antes de llegar a los permisos.
const path = require('path');
const { createRequire } = require('module');

const projectRoot = path.resolve(__dirname, '..');
const appRequire = createRequire(path.join(projectRoot, 'package.json'));
const cliRequire = createRequire(createRequire(appRequire.resolve('expo/package.json')).resolve('@expo/cli/package.json'));

(async () => {
  const { getPrebuildConfigAsync } = cliRequire('@expo/prebuild-config');
  const { compileModsAsync } = cliRequire('@expo/config-plugins/build/plugins/mod-compiler.js');
  const config = await getPrebuildConfigAsync(projectRoot, { platforms: ['ios', 'android'] });
  delete config.exp.ios.googleServicesFile;
  delete config.exp.android.googleServicesFile;
  await compileModsAsync(config.exp, { projectRoot, introspect: true, platforms: ['ios', 'android'], assertMissingModProviders: false });

  const plist = config.exp._internal?.modResults?.ios?.infoPlist ?? {};
  const manifest = config.exp._internal?.modResults?.android?.manifest?.manifest ?? {};
  const permissions = (manifest['uses-permission'] ?? []).map(item => item.$);
  const find = name => permissions.find(item => item['android:name'] === `android.permission.${name}`);
  const failures = [];
  const expect = (ok, message) => { if (!ok) failures.push(message); };

  expect(!plist.UIBackgroundModes, `iOS: UIBackgroundModes presente (${JSON.stringify(plist.UIBackgroundModes)})`);
  for (const key of ['NSLocationAlwaysUsageDescription', 'NSLocationAlwaysAndWhenInUseUsageDescription', 'NSMotionUsageDescription']) {
    expect(!(key in plist), `iOS: ${key} no corresponde a una función de la app`);
  }
  for (const key of ['NSBluetoothAlwaysUsageDescription', 'NSLocationWhenInUseUsageDescription', 'NSCameraUsageDescription']) {
    expect(/^TerraSense \S.*\.$/.test(plist[key] ?? ''), `iOS: ${key} debe ser una oración completa sobre TerraSense`);
  }
  expect(!find('ACCESS_BACKGROUND_LOCATION'), 'Android: ACCESS_BACKGROUND_LOCATION declarado');
  expect(find('BLUETOOTH_SCAN')?.['android:usesPermissionFlags'] === 'neverForLocation', 'Android: BLUETOOTH_SCAN sin neverForLocation');
  for (const name of ['BLUETOOTH', 'BLUETOOTH_ADMIN']) expect(find(name)?.['android:maxSdkVersion'] === '30', `Android: ${name} sin maxSdkVersion 30`);
  for (const name of ['SYSTEM_ALERT_WINDOW', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']) {
    const entry = find(name);
    expect(!entry || entry['tools:node'] === 'remove', `Android: ${name} no se elimina del manifiesto`);
  }

  console.log('iOS, claves de uso:', Object.keys(plist).filter(key => /UsageDescription$/.test(key)).join(', '));
  console.log('Android, permisos:', permissions.filter(item => item['tools:node'] !== 'remove').map(item => item['android:name'].replace('android.permission.', '')).join(', '));
  if (plist.NSLocalNetworkUsageDescription) {
    console.log('Aviso: NSLocalNetworkUsageDescription viene de expo-dev-client; revisarlo en el binario de la tienda.');
  }
  if (failures.length) {
    console.error(`\n${failures.length} problema(s):\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log('\nPermisos nativos conformes.');
})().catch(error => { console.error(error); process.exit(1); });

const { withAndroidManifest } = require('expo/config-plugins');

// Permisos de Bluetooth anteriores a Android 12: desde Android 12 los reemplazan
// BLUETOOTH_SCAN y BLUETOOTH_CONNECT, así que se limitan a la API 30.
const LEGACY_BLUETOOTH = ['android.permission.BLUETOOTH', 'android.permission.BLUETOOTH_ADMIN'];

/**
 * El escaneo identifica sondas; su ubicación procede exclusivamente del GPS. La ubicación
 * no se limita por versión: TerraSense también la usa para las coordenadas de la medición.
 */
function applyStartupPermissions(manifest) {
  const permissions = manifest.manifest['uses-permission'] ??= [];
  let scan = permissions.find(item => item.$['android:name'] === 'android.permission.BLUETOOTH_SCAN');
  if (!scan) {
    scan = { $: { 'android:name': 'android.permission.BLUETOOTH_SCAN' } };
    permissions.push(scan);
  }
  scan.$['android:usesPermissionFlags'] = 'neverForLocation';
  for (const item of permissions) {
    if (LEGACY_BLUETOOTH.includes(item.$['android:name'])) item.$['android:maxSdkVersion'] = '30';
  }
  return manifest;
}

module.exports = config => withAndroidManifest(config, mod => {
  mod.modResults = applyStartupPermissions(mod.modResults);
  return mod;
});
module.exports.applyStartupPermissions = applyStartupPermissions;

const { withAndroidManifest } = require('expo/config-plugins');

/** El escaneo identifica sondas; su ubicación procede exclusivamente del GPS. */
function applyStartupPermissions(manifest) {
  const permissions = manifest.manifest['uses-permission'] ??= [];
  let scan = permissions.find(item => item.$['android:name'] === 'android.permission.BLUETOOTH_SCAN');
  if (!scan) {
    scan = { $: { 'android:name': 'android.permission.BLUETOOTH_SCAN' } };
    permissions.push(scan);
  }
  scan.$['android:usesPermissionFlags'] = 'neverForLocation';
  return manifest;
}

module.exports = config => withAndroidManifest(config, mod => {
  mod.modResults = applyStartupPermissions(mod.modResults);
  return mod;
});
module.exports.applyStartupPermissions = applyStartupPermissions;

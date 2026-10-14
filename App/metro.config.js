const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// TEMPORAL — previsualización en Expo Go. Sólo actúa con EXPO_GO_STUB_DIR definido.
const stubDir = process.env.EXPO_GO_STUB_DIR;
if (stubDir) {
  const path = require('path');
  config.watchFolders = [...(config.watchFolders || []), stubDir];
  config.resolver.nodeModulesPaths = [path.join(__dirname, 'node_modules')];
  const upstream = config.resolver.resolveRequest;
  const resolve = (context, moduleName, platform) =>
    upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const from = context.originModulePath || '';
    if (moduleName === 'expo-notifications') {
      return { type: 'sourceFile', filePath: path.join(stubDir, 'expo-notifications.js') };
    }
    if (moduleName === './App' && path.dirname(from) === __dirname && path.basename(from).startsWith('index.')) {
      return { type: 'sourceFile', filePath: path.join(stubDir, 'PreviewApp.js') };
    }
    if (/(^|\/)services\/measurementsService$/.test(moduleName) && !from.startsWith(stubDir)) {
      return { type: 'sourceFile', filePath: path.join(stubDir, 'measurementsService.js') };
    }
    if (moduleName.startsWith('@app/')) {
      const target = path.join(__dirname, moduleName.slice(5).replace(/-real$/, ''));
      return resolve(context, target, platform);
    }
    return resolve(context, moduleName, platform);
  };
}

module.exports = config;

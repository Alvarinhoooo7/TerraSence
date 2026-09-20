const path = require('path');

// Expo sólo carga automáticamente el .env que esté junto a este archivo
// (App/.env). Se admite además un .env en la raíz del repositorio, que es
// donde resulta natural ponerlo cuando el mismo archivo sirve para la app, la
// consola web y el CLI de Supabase. App/.env tiene prioridad si ambos existen.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
} catch {
  // dotenv no disponible o no hay .env en la raíz: se sigue con lo que Expo cargue.
}

export default () => ({
  expo: {
    name: 'TerraSense',
    slug: 'terrasense',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: 'terrasense',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#12281F',
    },
    assetBundlePatterns: ['**/*'],

    ios: {
      supportsTablet: false,
      bundleIdentifier: 'cl.terrasense.app',
      googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'TerraSense usa tu ubicación mientras usas la app para asociar coordenadas a tus mediciones y consultar el pronóstico.',
        NSBluetoothAlwaysUsageDescription:
          'TerraSense usa Bluetooth para comunicarse con la sonda de suelo.',
        NSCameraUsageDescription:
          'TerraSense usa la cámara para escanear el código QR de vinculación del equipo.',
      },
    },

    android: {
      package: 'cl.terrasense.app',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#12281F',
      },
      allowBackup: false,
      // NOTA: se omite deliberadamente ACCESS_BACKGROUND_LOCATION.
      // TerraSense mide bajo demanda con la app en primer plano; no rastrea.
      // Pedirlo dispararía revisión manual en Google Play y contradiría el
      // principio de proporcionalidad de la Ley 21.719.
      permissions: [
        'android.permission.BLUETOOTH',
        'android.permission.BLUETOOTH_ADMIN',
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.CAMERA',
        'android.permission.POST_NOTIFICATIONS',
      ],
    },

    plugins: [
      './plugins/withAndroidSecurity',
      [
        'react-native-ble-plx',
        {
          isBackgroundEnabled: false,
          modes: ['central'],
          bluetoothAlwaysPermission:
            'TerraSense usa Bluetooth para leer la sonda de suelo.',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Permite asociar coordenadas a tus mediciones y consultar el pronóstico mientras usas la app.',
          isAndroidBackgroundLocationEnabled: false,
        },
      ],
      [
        'expo-camera',
        { cameraPermission: 'Permite escanear el QR de vinculación del equipo.', recordAudioAndroid: false, microphonePermission: false },
      ],
      [
        'expo-notifications',
        { icon: './assets/icon.png', color: '#1F5B3F' },
      ],
      './plugins/withStartupPermissions',
    ],

    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
});

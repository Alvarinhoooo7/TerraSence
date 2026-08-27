// app.config.js — sustituye a app.json para poder inyectar la clave de Google
// Maps desde variable de entorno. NUNCA versionar la clave en el repositorio.
//
// Requiere App/.env con:
//   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
//   EXPO_PUBLIC_SUPABASE_URL=...
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=...

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
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'TerraSense usa tu ubicación para georreferenciar cada medición de suelo en el mapa de tu predio.',
        NSBluetoothAlwaysUsageDescription:
          'TerraSense usa Bluetooth para comunicarse con la sonda de suelo.',
        NSCameraUsageDescription:
          'TerraSense usa la cámara para escanear el código QR de vinculación del equipo.',
      },
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },

    android: {
      package: 'cl.terrasense.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#12281F',
      },
      allowBackup: false,
      config: {
        googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY },
      },
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
            'Permite georreferenciar cada medición en el mapa de tu predio.',
          isAndroidBackgroundLocationEnabled: false,
        },
      ],
      [
        'expo-camera',
        { cameraPermission: 'Permite escanear el QR de vinculación del equipo.' },
      ],
    ],

    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
});

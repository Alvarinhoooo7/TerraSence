const path = require('path');

// Textos de los diálogos de permiso del sistema. Una sola fuente por finalidad: los
// plugins los escriben en Info.plist (su valor pisa a `ios.infoPlist`) y `locales`
// los traduce. Apple pide una oración completa, activa y específica, con punto final.
const PERMISSION_TEXT = {
  es: {
    bluetooth: 'TerraSense usa Bluetooth para encontrar tu sonda de suelo, vincularla y recibir sus mediciones.',
    location: 'TerraSense usa tu ubicación al medir, si lo eliges, para guardar las coordenadas de la lectura y consultar el pronóstico con Open-Meteo.',
    camera: 'TerraSense usa la cámara para leer el QR con que otro miembro te invita a su equipo.',
  },
  en: {
    bluetooth: 'TerraSense uses Bluetooth to find your soil probe, pair it and receive its readings.',
    location: 'TerraSense uses your location when you measure, if you choose to, to save the reading coordinates and get the forecast from Open-Meteo.',
    camera: 'TerraSense uses the camera to read the QR code another member uses to invite you to their device.',
  },
};
const iosPermissionStrings = (lang) => ({
  ios: {
    NSBluetoothAlwaysUsageDescription: PERMISSION_TEXT[lang].bluetooth,
    NSLocationWhenInUseUsageDescription: PERMISSION_TEXT[lang].location,
    NSCameraUsageDescription: PERMISSION_TEXT[lang].camera,
  },
});

// Expo sólo carga automáticamente el .env que esté junto a este archivo
// (App/.env). Se admite además un .env en la raíz del repositorio, que es
// donde resulta natural ponerlo cuando el mismo archivo sirve para la app, la
// consola web y el CLI de Supabase. App/.env tiene prioridad si ambos existen.
// Proyecto EAS de la app (cuenta alvarinhoo2001). No es un secreto: identifica el proyecto
// para compilar y para pedir el token de Expo Push. La variable sólo sirve para probar otro.
const EAS_PROJECT_ID = 'ac4799ff-9c98-4037-832f-0e62e0cfbe64';

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
    owner: 'alvarinhoo2001',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: 'terrasense',
    assetBundlePatterns: ['**/*'],

    ios: {
      supportsTablet: false,
      bundleIdentifier: 'cl.terrasense.app',
      googleServicesFile: './GoogleService-Info.plist',
      // Permite que iOS use las traducciones de `locales` aunque la app no declare
      // cada idioma en el proyecto nativo. Los textos de permiso viven en los plugins.
      infoPlist: {
        CFBundleAllowMixedLocalizations: true,
      },
    },

    locales: {
      es: iosPermissionStrings('es'),
      en: iosPermissionStrings('en'),
    },

    android: {
      package: 'cl.terrasense.app',
      softwareKeyboardLayoutMode: 'resize',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#052e16',
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
      // Declarados por dependencias y sin uso en TerraSense: la app no lee ni escribe
      // archivos del almacenamiento compartido ni dibuja sobre otras apps.
      blockedPermissions: [
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
    },

    plugins: [
      // Desde SDK 52 la clave `splash` suelta ya no aplica el color de fondo: quedaba
      // blanco y el logotipo, que es casi blanco por diseño, desaparecía en el arranque.
      [
        'expo-splash-screen',
        {
          image: './assets/splash.png',
          // Sólo el nombre «TerraSense», igual que la pantalla de carga. Android 12+ muestra
          // el ícono a 240/288 de su tamaño y lo recorta en un círculo: con 186 el nombre
          // entra completo y mide 155 dp en pantalla (SPLASH_WORDMARK_WIDTH en LoadingScreen).
          imageWidth: 186,
          resizeMode: 'contain',
          backgroundColor: '#12281F',
        },
      ],
      './plugins/withAndroidSecurity',
      [
        'react-native-ble-plx',
        {
          // Sin `modes`: esa opción agrega `bluetooth-central` a UIBackgroundModes aunque
          // isBackgroundEnabled sea false, y la app sólo usa Bluetooth en primer plano.
          isBackgroundEnabled: false,
          bluetoothAlwaysPermission: PERMISSION_TEXT.es.bluetooth,
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: PERMISSION_TEXT.es.location,
          // `false` borra la clave: sin estos valores el plugin escribe textos por
          // defecto en inglés para ubicación «Siempre» y actividad física.
          locationAlwaysAndWhenInUsePermission: false,
          locationAlwaysPermission: false,
          motionUsagePermission: false,
          isIosBackgroundLocationEnabled: false,
          isAndroidBackgroundLocationEnabled: false,
        },
      ],
      [
        'expo-camera',
        { cameraPermission: PERMISSION_TEXT.es.camera, recordAudioAndroid: false, microphonePermission: false },
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
      eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || EAS_PROJECT_ID },
    },
  },
});

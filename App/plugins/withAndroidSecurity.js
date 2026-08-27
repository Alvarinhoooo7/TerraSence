// App/plugins/withAndroidSecurity.js
/**
 * Expo Config Plugin para Blindaje de Seguridad en Android:
 * 1. Desactiva allowBackup para evitar extracción de datos mediante ADB backup.
 * 2. Bloquea tráfico no cifrado en texto claro (usesCleartextTraffic=false).
 * 3. Inyecta reglas ProGuard / R8 para ofuscación de código, compresión de recursos
 *    y eliminación automática de trazas de depuración (android.util.Log) en compilaciones Release.
 */

const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PROGUARD_RULES = `
# =============================================================================
# REGLAS PROGUARD / R8 DE SEGURIDAD Y OFUSCACIÓN - AKURA PROGUARD
# =============================================================================

# 1. Ofuscación y compresión de bytecode
-repackageclasses 'a'
-allowaccessmodification
-repackageclasses ''
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# 2. Eliminación de logs y trazas de depuración en Release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
}

# 3. Mantener clases esenciales de React Native y Expo
-keep class com.facebook.react.** { *; }
-keep class expo.modules.** { *; }
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.polidea.reactnativeble.** { *; }
-keep class com.airbnb.android.react.maps.** { *; }

# 4. Mantener clases de cifrado y almacenamiento seguro KeyStore
-keep class androidx.security.crypto.** { *; }
-keep class expo.modules.securestore.** { *; }
-keep class expo.modules.crypto.** { *; }
`;

function withAndroidSecurityManifest(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    const androidManifest = manifestConfig.modResults;
    const application = androidManifest.manifest.application?.[0];

    if (application) {
      // Bloquear extracción de almacenamiento privado vía adb backup
      application.$['android:allowBackup'] = 'false';
      // Forzar todas las conexiones de red sobre HTTPS/TLS
      application.$['android:usesCleartextTraffic'] = 'false';
      // Desactivar extracción de datos a la nube sin control
      application.$['android:fullBackupContent'] = 'false';
      application.$['android:dataExtractionRules'] = '@xml/secure_data_extraction_rules';
    }

    return manifestConfig;
  });
}

function withAndroidSecurityGradle(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    let contents = gradleConfig.modResults.contents;

    // Asegurar que minifyEnabled y shrinkResources estén activos en buildTypes.release
    if (!contents.includes('proguardFiles getDefaultProguardFile')) {
      contents = contents.replace(
        /buildTypes\s*\{([\s\S]*?)release\s*\{([\s\S]*?)\}/,
        (match, p1, p2) => {
          if (!p2.includes('minifyEnabled')) {
            return `buildTypes {${p1}release {\n            minifyEnabled true\n            shrinkResources true\n            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"${p2}\n        }`;
          }
          return match;
        }
      );
      gradleConfig.modResults.contents = contents;
    }

    return gradleConfig;
  });
}

function withAndroidProGuardRules(config) {
  return withDangerousMod(config, [
    'android',
    async (dangerousConfig) => {
      const proguardPath = path.join(
        dangerousConfig.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );

      try {
        let currentRules = '';
        if (fs.existsSync(proguardPath)) {
          currentRules = fs.readFileSync(proguardPath, 'utf8');
        }

        if (!currentRules.includes('AKURA PROGUARD')) {
          fs.writeFileSync(proguardPath, `${currentRules}\n${PROGUARD_RULES}`, 'utf8');
        }

        // Crear reglas seguras de extracción de datos para Android 12+ (API 31+)
        const resXmlDir = path.join(
          dangerousConfig.modRequest.platformProjectRoot,
          'app',
          'src',
          'main',
          'res',
          'xml'
        );
        if (!fs.existsSync(resXmlDir)) {
          fs.mkdirSync(resXmlDir, { recursive: true });
        }

        const dataExtractionRulesXml = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude path="." />
    </cloud-backup>
    <device-transfer>
        <exclude path="." />
    </device-transfer>
</data-extraction-rules>
`;
        fs.writeFileSync(
          path.join(resXmlDir, 'secure_data_extraction_rules.xml'),
          dataExtractionRulesXml,
          'utf8'
        );
      } catch (err) {
        // En entorno managed pre-build se inyecta durante el prebuild nativo
      }

      return dangerousConfig;
    },
  ]);
}

function withAndroidSecurity(config) {
  config = withAndroidSecurityManifest(config);
  config = withAndroidSecurityGradle(config);
  config = withAndroidProGuardRules(config);
  return config;
}

module.exports = createRunOncePlugin(
  withAndroidSecurity,
  'withAndroidSecurity',
  '1.0.0'
);

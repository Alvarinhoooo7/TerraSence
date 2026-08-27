# 📱 TerraSense · Aplicación Móvil

Aplicación de campo en **React Native + Expo 54 + TypeScript**. Es la herramienta que el agricultor
lleva al potrero: mide el suelo con la sonda por Bluetooth, produce el veredicto **sin conexión** y
lo georreferencia en un mapa.

> Este documento cubre **sólo la carpeta `App/`**. La especificación del producto está en el
> [README raíz](../README.md); el backend, en [`supabase/README.md`](../supabase/README.md); la
> consola web, en [`Web/README.md`](../Web/README.md).

---

## 📑 Contenido

- [1. Qué hace](#1-qué-hace)
- [2. Principio rector: la nube nunca bloquea la medición](#2-principio-rector-la-nube-nunca-bloquea-la-medición)
- [3. Estructura de carpetas](#3-estructura-de-carpetas)
- [4. Pantallas y navegación](#4-pantallas-y-navegación)
- [5. Motor agronómico](#5-motor-agronómico)
- [6. Enlace BLE con la sonda](#6-enlace-ble-con-la-sonda)
- [7. Sincronización offline](#7-sincronización-offline)
- [8. Variables de entorno](#8-variables-de-entorno)
- [9. Comandos de desarrollo](#9-comandos-de-desarrollo)
- [10. Decisiones que conviene no deshacer](#10-decisiones-que-conviene-no-deshacer)
- [11. Pendientes conocidos](#11-pendientes-conocidos)
- [12. 🛠️ Manual de instalación de herramientas](#12-️-manual-de-instalación-de-herramientas)

---

## 1. Qué hace

1. Se conecta por **BLE** a la sonda TerraSense, que a su vez lee la sonda de suelo 7-en-1 por
   RS-485 Modbus RTU y publica el resultado ya decodificado.
2. Captura la **posición GPS** con su precisión.
3. Evalúa las lecturas con el **motor agronómico local**, según la etapa fenológica activa.
4. Muestra el veredicto y lo guarda como un **círculo de 20 m** en el mapa del predio.
5. Sincroniza con Supabase **cuando hay señal**; si no la hay, encola.

---

## 2. Principio rector: la nube nunca bloquea la medición

Todo el diseño se deriva de esto. El agricultor mide en un potrero sin cobertura, y ahí es donde la
herramienta tiene que funcionar.

| Situación | Comportamiento |
| :--- | :--- |
| Sin internet | Mide, diagnostica y guarda. La medición entra en cola |
| Sin teselas de mapa | El mapa pasa a fondo neutro; los círculos y la escala siguen visibles |
| Sin GPS | Avisa, pero no impide medir |
| Sin sonda emparejada | Datos simulados **con bandera visible en pantalla** |

> [!IMPORTANT]
> **La bandera de simulación no se puede ocultar.** Una demostración no debe poder confundirse con
> una medición real de campo. Si tocas `MeasureScreen`, conserva ese banner.

---

## 3. Estructura de carpetas

```text
App/
├── App.tsx                     Raíz: puerta de autenticación y enrutado
├── index.ts                    Punto de entrada de Expo
├── app.config.js               Permisos y claves por variable de entorno
├── src/
│   ├── engine/
│   │   ├── agronomyEngine.ts   Motor de reglas: 8 cultivos, 4 texturas de suelo
│   │   └── stageEvaluator.ts   Capa de etapa fenológica sobre el motor base
│   ├── screens/
│   │   ├── MapScreen.tsx       PANTALLA PRINCIPAL
│   │   ├── MeasureScreen.tsx   Captura → diagnóstico → guardado
│   │   ├── AuthScreen.tsx      Registro, sesión y recuperación de contraseña
│   │   ├── HistoryScreen.tsx   Mediciones en lista, por día y etapa
│   │   ├── DevicesScreen.tsx   Alta de equipo y código de 15 dígitos
│   │   └── FieldSettingsScreen.tsx  Predio, cultivo y textura
│   ├── components/
│   │   ├── StageSelector.tsx   Etapa fenológica
│   │   ├── FieldPicker.tsx     Selección y alta de predios
│   │   └── MeasurementBottomSheet.tsx  Burbuja de detalle
│   ├── services/
│   │   ├── bleService.ts       Enlace BLE
│   │   ├── probeService.ts     Decodificación de la trama de 16 bytes
│   │   ├── measurementsService.ts  Cola offline idempotente
│   │   ├── deviceService.ts    Equipos y vinculación por código
│   │   ├── fieldsService.ts    Predios
│   │   ├── notifications.ts    Token de notificaciones
│   │   └── supabase.ts         Cliente
│   ├── store/useAppStore.ts    Estado global (Zustand)
│   ├── types/                  Tipos alineados con el esquema real
│   └── utils/deviceId.ts       Device ID de 15 dígitos
└── plugins/withAndroidSecurity.js
```

---

## 4. Pantallas y navegación

Enrutado propio por estado en `App.tsx`, sin librería de navegación: hay cinco pantallas y una
puerta de sesión, y meter React Navigation costaría más de lo que aporta.

```text
                    ┌──────────────┐
      sin sesión ──►│  AuthScreen  │
                    └──────┬───────┘
                           ▼ con sesión
                    ┌──────────────┐
        ┌───────────┤   MapScreen  ├───────────┐
        │           └──────┬───────┘           │
        ▼                  ▼                   ▼
┌───────────────┐  ┌──────────────┐  ┌─────────────────┐
│ MeasureScreen │  │ HistoryScreen│  │ FieldSettings   │
└───────────────┘  └──────────────┘  └────────┬────────┘
                                              ▼
                                     ┌─────────────────┐
                                     │  DevicesScreen  │
                                     └─────────────────┘
```

---

## 5. Motor agronómico

Dos capas. **No es un modelo entrenado**: es un sistema experto de reglas biofísicas explícitas, y
esa es una decisión deliberada — en agronomía la explicabilidad es requisito de adopción y de
responsabilidad legal.

**`agronomyEngine.ts`** — evalúa humedad, temperatura, CE, pH y NPK contra los umbrales del cultivo
y la textura del suelo. Define 8 cultivos y 4 texturas.

**`stageEvaluator.ts`** — reponderá el veredicto según la etapa activa, porque el mismo suelo exige
respuestas distintas:

| Etapa | Qué gobierna el veredicto |
| :--- | :--- |
| `pre_siembra` | Temperatura, CE, pH, humedad |
| `vegetativo` | Nitrógeno, humedad, pH, CE |
| `floracion` | CE, humedad, potasio, pH |
| `cosecha` | Humedad (transitabilidad), potasio, nitrógeno, CE |

Añade además dos reglas propias: **compactación en cosecha** y **salinidad en floración** (donde el
límite del cultivo se recorta al 80 %, porque el estrés osmótico aborta la flor).

> [!NOTE]
> Cada diagnóstico persiste `engine_version` y `crop_catalog_version`. Es un requisito probatorio:
> permite reproducir una recomendación de hace dos temporadas si un agricultor reclama.

---

## 6. Enlace BLE con la sonda

```text
Sonda 7-en-1 ──RS-485 Modbus──► ESP32 ──BLE GATT notify (16 B)──► Teléfono
```

- Servicio: `00000001-5e4e-4c69-6d61-746572726101`
- Característica: `00000002-5e4e-4c69-6d61-746572726102`

Se usa **notify y no read** porque la sonda tarda en estabilizarse: el firmware avisa cuando el dato
ya es válido, en vez de devolver una lectura prematura.

> [!WARNING]
> **`react-native-ble-plx` no funciona en Expo Go**, que no incluye código nativo. Allí la lectura
> degrada a datos simulados. Para probar contra la sonda real hace falta una *development build*:
> `npx expo run:android`.

> [!CAUTION]
> **Nunca quites el `cancelConnection()` del bloque `finally` de `bleService.ts`.** Si la conexión
> queda abierta, la sonda no vuelve a sueño profundo y la batería se agota en días en vez de meses.

---

## 7. Sincronización offline

Cola *store & forward* **idempotente**: cada medición lleva un `client_uuid` generado en el teléfono
*antes* de intentar el envío. El índice único parcial de Supabase hace que un reintento actualice la
fila en lugar de duplicarla.

```text
Medición ──► ¿hay red? ──sí──► upsert por client_uuid ──► ✅ sincronizada
                 │
                 no
                 ▼
          AsyncStorage (cola) ──► al recuperar señal: flushQueue()
```

De la cola local sólo se elimina lo que el servidor confirmó. Lo que falla se conserva para el
siguiente intento.

---

## 8. Variables de entorno

Se admite `App/.env` **o** un `.env` en la raíz del repositorio (`app.config.js` carga el segundo
como respaldo). `App/.env` tiene prioridad.

```bash
EXPO_PUBLIC_SUPABASE_URL=https://bjmhjatykqccksddgtmo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

| Variable | Dónde obtenerla |
| :--- | :--- |
| `SUPABASE_URL` / `ANON_KEY` | Panel de Supabase → *Project Settings* → *API* |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console → *Credentials*. Restringir por paquete `cl.terrasense.app` + huella SHA-1, y sólo *Maps SDK for Android* |

> [!CAUTION]
> **No reutilizar la clave de Google Maps del proyecto Akura.** Quedó expuesta en un repositorio
> público y debe considerarse comprometida.

---

## 9. Comandos de desarrollo

```bash
npm install                            # dependencias
npx expo start                         # servidor de desarrollo
npx expo run:android                   # development build (necesaria para BLE)

npm run type-check                     # tsc --noEmit
npx expo export --platform android     # verifica que el paquete COMPILA de verdad
npx expo install --fix                 # realinea dependencias al SDK
```

> [!TIP]
> `npm run type-check` no basta. `expo export` es el que detecta errores reales de empaquetado
> —presets de Babel ausentes, incompatibilidades de Hermes— que TypeScript no ve.

---

## 10. Decisiones que conviene no deshacer

| Decisión | Motivo |
| :--- | :--- |
| **Sin `ACCESS_BACKGROUND_LOCATION`** | La app mide bajo demanda. Pedirlo dispara revisión manual en Google Play y contradice el principio de proporcionalidad de la Ley 21.719 |
| **El color nunca es el único código** | Cada veredicto lleva icono y texto. Cerca del 8 % de los hombres tiene deficiencia de visión al color, y el usuario objetivo lee bajo sol directo (WCAG 2.2 AA) |
| **Áreas táctiles de 48 dp** | Se opera con guantes de trabajo |
| **No se precargan teselas** | Los Términos de Google Maps Platform lo prohíben. Se degrada a fondo neutro |
| **`Spacing.touchTarget` y tipografía ≥ 16 sp** | Legibilidad en terreno, no estética |
| **El Device ID lo genera Postgres** | La unicidad la garantiza el índice `UNIQUE`, no un acuerdo entre plataformas |

---

## 11. Pendientes conocidos

- ⚠️ **El enlace BLE nunca ha hablado con hardware real.** Compila y está escrito con cuidado, pero
  es el único bloque sin verificar. Al probarlo, confirmar también el mapa de registros Modbus con
  el vendedor de la sonda.
- Dibujar el perímetro del predio sobre el mapa.
- Escáner QR para vincular equipos (hoy se vincula tecleando el código de 15 dígitos).
- Estado detallado por variable al abrir un punto (hoy muestra un resumen).

El estado completo y ordenado está en [`MIGRACION_AKURA.md`](../MIGRACION_AKURA.md).

---

## 12. 🛠️ Manual de Instalación de Herramientas

Desde una máquina limpia hasta poder ejecutar la app.

### 12.1. Node.js y npm

Expo 54 pide **Node 20 o 22 LTS**.

```bash
node -v     # debe ser v20.x o v22.x
npm -v
```

> [!WARNING]
> Las versiones impares de Node (21, 23, 25) **no son LTS** y provocan fallos difíciles de
> diagnosticar en Metro. Si tienes una, instala una LTS con un gestor de versiones.

<details>
<summary><b>Windows</b></summary>

```powershell
winget install OpenJS.NodeJS.LTS
# o con gestor de versiones (recomendado si necesitas varias):
winget install CoreyButler.NVMforWindows
nvm install 22
nvm use 22
```
</details>

<details>
<summary><b>macOS</b></summary>

```bash
brew install node@22
# o con nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22 && nvm use 22
```
</details>

<details>
<summary><b>Linux (Debian / Ubuntu)</b></summary>

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```
</details>

### 12.2. Git

```bash
git --version
```

```powershell
winget install Git.Git          # Windows
```
```bash
brew install git                # macOS
sudo apt-get install -y git     # Linux
```

### 12.3. Expo CLI

**No se instala globalmente.** Se invoca con `npx`, que usa la versión fijada en `package.json` y
evita desajustes entre máquinas.

```bash
npx expo --version
npm install -g eas-cli          # sólo si vas a generar builds en la nube
```

### 12.4. Android Studio y JDK — necesarios para BLE

Sólo hace falta si vas a compilar la *development build*. Con Expo Go no.

1. Descargar **Android Studio**: <https://developer.android.com/studio>
2. En *SDK Manager* instalar: **Android SDK Platform 35**, **Android SDK Build-Tools**,
   **Android SDK Platform-Tools** y **Android Emulator**.
3. Instalar **JDK 17**:

```powershell
winget install Microsoft.OpenJDK.17     # Windows
```
```bash
brew install --cask temurin@17          # macOS
sudo apt-get install -y openjdk-17-jdk  # Linux
```

4. Variables de entorno:

```powershell
# Windows (PowerShell, permanentes)
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx JAVA_HOME "C:\Program Files\Microsoft\jdk-17"
```
```bash
# macOS / Linux — añadir a ~/.zshrc o ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk    # Linux: $HOME/Android/Sdk
export JAVA_HOME=$(/usr/libexec/java_home -v 17) # Linux: /usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

5. Comprobación:

```bash
java -version      # 17.x
adb --version
```

### 12.5. Dispositivo físico — imprescindible para probar la sonda

El Bluetooth y las notificaciones push **no funcionan en emulador**.

1. En el teléfono: *Ajustes → Acerca del teléfono* → pulsar 7 veces en *Número de compilación*.
2. *Opciones de desarrollador* → activar **Depuración por USB**.
3. Conectar por USB y aceptar la huella RSA.

```bash
adb devices        # debe listar tu teléfono como "device"
```

### 12.6. Puesta en marcha del proyecto

```bash
git clone https://github.com/Alvarinhoooo7/TerraSence.git
cd TerraSence/App
npm install

cp .env.example .env      # y rellenar las tres claves (§8)

npx expo start            # desarrollo con Expo Go (sonda simulada)
npx expo run:android      # development build (sonda real por BLE)
```

### 12.7. Verificación de que todo quedó bien

```bash
npm run type-check                     # sin salida = 0 errores
npx expo export --platform android     # debe terminar en "Exported:"
```

### 12.8. Resumen de versiones

| Herramienta | Versión | ¿Obligatoria? |
| :--- | :--- | :--- |
| Node.js | 20 o 22 LTS | Sí |
| npm | 10+ | Sí |
| Git | 2.40+ | Sí |
| Expo CLI | vía `npx` | Sí |
| JDK | 17 | Sólo para BLE |
| Android Studio | Iguana+ con SDK 35 | Sólo para BLE |
| Dispositivo Android físico | Android 8+ | Sólo para BLE y push |
| EAS CLI | última | Sólo para builds en la nube |

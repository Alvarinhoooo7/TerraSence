# 📱 TerraSense · Aplicación Móvil de Terreno

Aplicación móvil de terreno desarrollada en **React Native 0.81 + React 19 + Expo 54 + TypeScript + Zustand**. 
Es la herramienta central que el agricultor y los operadores llevan al potrero: se conecta de forma automática a la lanza sensor TerraSense vía **Bluetooth Low Energy (BLE)**, evalúa el suelo localmente en cuatro etapas productivas, delimita perímetros prediales mediante GPS y formula recomendaciones agronómicas contextuales **sin requerir conexión a internet**.

> [!IMPORTANT]
> **Documentación del Repositorio:**
> * Este documento describe en profundidad la aplicación móvil (`App/`).
> * La arquitectura global y el modelo de negocio están en el [README raíz](../README.md).
> * La base de datos, políticas RLS y RPCs viven en [`supabase/README.md`](../supabase/README.md).
> * La consola web de administración y soporte técnico se detalla en [`Web/README.md`](../Web/README.md).

---

## 📑 Contenido

- [1. Flujo de Usuario y Capacidades Clave](#1-flujo-de-usuario-y-capacidades-clave)
- [2. Principio Rector: Offline-First](#2-principio-rector-offline-first)
- [3. Estructura de carpetas](#3-estructura-de-carpetas)
- [4. Pantallas y Navegación](#4-pantallas-y-navegación)
  - [4.1. Bienvenida y Autenticación](#41-bienvenida-y-autenticación)
  - [4.2. Onboarding y Gobernanza de Equipos](#42-onboarding-y-gobernanza-de-equipos)
  - [4.3. Medición y Decodificación BLE](#43-medición-y-decodificación-ble)
  - [4.4. Perímetros Prediales y Topografía](#44-perímetros-prediales-y-topografía)
  - [4.5. Historial y Detalle de Medición](#45-historial-y-detalle-de-medición)
- [5. Motor Agronómico y Reglas de Decisión](#5-motor-agronómico-y-reglas-de-decisión)
  - [5.1. Etapas Fenológicas](#51-etapas-fenológicas)
  - [5.2. Regla de Veto Cruzado por Salinidad](#52-regla-de-veto-cruzado-por-salinidad)
  - [5.3. Modelo Verbal de Comunicación (Sin Semáforo Simplista)](#53-modelo-verbal-de-comunicación-sin-semáforo-simplista)
- [6. Enlace BLE con la Sonda (Protocolo GATT)](#6-enlace-ble-con-la-sonda-protocolo-gatt)
- [7. Sincronización Idempotente en Cola](#7-sincronización-idempotente-en-cola)
- [8. Variables de Entorno](#8-variables-de-entorno)
- [9. Comandos de Desarrollo y Pruebas](#9-comandos-de-desarrollo-y-pruebas)
- [10. Decisiones Arquitectónicas que Conviene Preservar](#10-decisiones-arquitectónicas-que-conviene-preservar)
- [11. 🛠️ Manual de Instalación de Herramientas](#11-️-manual-de-instalación-de-herramientas)

---

## 1. Flujo de Usuario y Capacidades Clave

1. **Carrusel de Bienvenida (`WelcomeCarouselScreen`):** Tres tarjetas introductorias (*Quiénes somos*, *Qué hacemos* y *Por qué lo hacemos*) antes de ingresar a la cuenta.
2. **Acceso y Recuperación:** Login, registro y recuperación de contraseña con deep link `terrasense://reset-password` y pantalla interactiva `ResetPasswordScreen`.
3. **Onboarding Dual de Equipos:**
   - **Primer Propietario (Owner):** Vinculación física por BLE con provisión del código de 15 dígitos en la memoria NVS del ESP32 y registro atómico en Supabase (`register_paired_device`).
   - **Operadores de Campo:** Escaneo de código QR generado por el administrador o ingreso manual del código para obtener membresía `operator`.
4. **Dashboard Principal:** Punto de inicio rápido para disparar una medición, seleccionar predio/cultivo o revisar el perímetro.
5. **Medición Guiada y Limpieza de Electrodos:** Modal recordatorio (`CalibrationReminderModal`) que sugiere limpiar y secar las puntas de acero inoxidable antes de insertar la lanza.
6. **Captura BLE Instantánea:** Detección automática por BLE mediante el anuncio `TerraSense-<device_code>`, recepción de la trama GATT de 16 bytes y captura de coordenadas GPS.
7. **Motor Experto Local:** Clasificación en 4 etapas fenológicas (*Pre-siembra*, *Vegetativo*, *Floración*, *Cosecha*), evaluando 7 parámetros (pH, CE, humedad VWC, temperatura, N, P, K) con regla de veto cruzado por salinidad.
8. **Recomendación Agronómica Contextual:** Consejos accionables en lenguaje natural acompañados de las condiciones meteorológicas locales (vía Open-Meteo).
9. **Delimitación de Perímetros (`PerimeterScreen`):** Registro de polígonos prediales en terreno por GPS o marcadores, cálculo automático de superficie en hectáreas y guardado local/PostGIS.
10. **Visor Cartográfico Dinámico (`MapScreen`):** Ajuste de encuadre inteligente (`fitToCoordinates`) respetando safe-areas y superponiendo los puntos de muestreo sobre el polígono del predio.

---

## 2. Principio Rector: Offline-First

El productor agrícola trabaja habitualmente en sectores rurales sin cobertura celular ni señal 4G/5G. La aplicación fue diseñada para que **ninguna operación crítica de terreno dependa de la nube**:

| Escenario en Terreno | Comportamiento del Sistema |
| :--- | :--- |
| **Sin Conexión a Internet** | La app inicia desde la caché local de Zustand/AsyncStorage (`useAuthStore`). Mide por BLE, ejecuta el motor agronómico, guarda la lectura localmente y la encola con un `client_uuid` único. |
| **Sin Descarga de Teselas de Mapa** | El mapa degrada elegantemente a un lienzo de coordenadas neutro; los polígonos del predio, los puntos de muestreo y la escala permanecen 100% visibles e interactivos. |
| **Sin Señal de Satélites GPS** | Emite un aviso no bloqueante al usuario, permitiendo registrar la medición asociada al predio sin coordenadas geográficas exactas. |
| **Sin Sonda Física Presente (Demo/Prueba)** | Habilita datos de prueba con una **bandera visual permanente e inamovible** en la pantalla para evitar que datos simulados se confundan con lecturas reales. |
| **Recuperación de Cobertura** | El componente `OfflineBanner` detecta el retorno de conectividad y el servicio `measurementsService` vacía la cola en segundo plano mediante upsert idempotente. |

---

## 3. Estructura de carpetas

```text
App/
├── App.tsx                             # Enrutador de estado raíz (Auth, Onboarding, Navegación)
├── index.ts                            # Punto de entrada de Expo
├── app.config.js                       # Configuración Expo, permisos nativos y deep linking
├── package.json                        # Dependencias (React Native 0.81, Expo 54, Zustand)
├── tsconfig.json                       # Configuración TypeScript estricta
├── src/
│   ├── constants/
│   │   └── theme.ts                    # Paleta de colores, tipografía Spacing y touch targets
│   ├── types/
│   │   ├── agronomy.ts                 # Tipos del motor biofísico, cultivos y etapas fenológicas
│   │   ├── app.ts                      # Interfaces de estado global, mediciones y sincronización
│   │   └── preferences.ts              # Preferencias de usuario (tema, idioma, unidades)
│   ├── engine/
│   │   ├── agronomyEngine.ts           # Motor de reglas biofísicas (8 cultivos, 4 texturas)
│   │   ├── stageEvaluator.ts           # Reponderación de umbrales según la etapa fenológica
│   │   └── contextualAdvice.ts         # Generador de recomendaciones en lenguaje de decisión
│   ├── store/
│   │   ├── useAppStore.ts              # Estado global de la aplicación (Zustand)
│   │   └── useAuthStore.ts             # Estado de autenticación con caché persistente offline
│   ├── hooks/
│   │   ├── useAppTheme.ts              # Gancho para tema dinámico (Sistema / Claro / Oscuro)
│   │   └── useTranslation.ts           # Soporte multilingüe (Español / Inglés)
│   ├── screens/
│   │   ├── WelcomeCarouselScreen.tsx   # Carrusel informativo público antes del acceso
│   │   ├── AuthScreen.tsx              # Inicio de sesión, registro y solicitud de recuperación
│   │   ├── ResetPasswordScreen.tsx     # Establecimiento de nueva clave tras abrir el deep link
│   │   ├── OnboardingScreen.tsx        # Provisión BLE del dueño o escaneo QR de operador
│   │   ├── DashboardScreen.tsx         # Pantalla principal: estado, resumen y botón medir
│   │   ├── MeasureScreen.tsx           # Conexión BLE → captura 16B → grid 3×3 → recomendación
│   │   ├── PerimeterScreen.tsx         # Marcado y recorrido GPS de perímetros prediales
│   │   ├── MapScreen.tsx               # Cartografía predial, encuadre dinámico y polígonos
│   │   ├── HistoryScreen.tsx           # Historial cronológico filtrable con estado de sincronización
│   │   ├── DevicesScreen.tsx           # Lista de equipos, vinculación por código y roles
│   │   └── FieldSettingsScreen.tsx     # Configuración de predios, texturas y cultivos
│   ├── components/
│   │   ├── CalibrationReminderModal.tsx # Modal para recordar limpieza de electrodos de la sonda
│   │   ├── OfflineBanner.tsx           # Aviso superior discreto ante pérdida de conectividad
│   │   ├── ScreenGuide.tsx             # Botón '?' con guía de uso contextual por pantalla
│   │   ├── StageSelector.tsx           # Selector visual de etapa fenológica
│   │   ├── FieldPicker.tsx             # Selector y modal de creación de predios
│   │   ├── MeasurementBottomSheet.tsx  # Ficha deslizable de lectura sobre el mapa
│   │   └── MeasurementDetailModal.tsx  # Modal detallado con métricas y badge de sincronización
│   ├── services/
│   │   ├── bleService.ts               # Conexión BLE, escaneo y recepción GATT notify
│   │   ├── probeService.ts             # Decodificación de la trama de 16 bytes (Modbus/Big-Endian)
│   │   ├── measurementsService.ts      # Cola offline en AsyncStorage y sincronización Supabase
│   │   ├── perimeterService.ts         # Almacenamiento local y sincronización PostGIS de polígonos
│   │   ├── deviceService.ts            # Registro y consulta de membresías de equipos
│   │   ├── onboardingService.ts        # Persistencia de estado de onboarding en Supabase
│   │   ├── preferencesService.ts       # Preferencias de usuario locales y en la nube
│   │   ├── fieldsService.ts            # CRUD de predios agrícolas
│   │   ├── weatherService.ts           # Consulta meteorológica resiliente a Open-Meteo
│   │   ├── authDeepLink.ts             # Gestor de deep links para recuperación de contraseña
│   │   ├── authDeepLinkParser.ts       # Parser de parámetros de fragmento/query de auth
│   │   ├── notifications.ts            # Manejo de tokens de Expo Notifications
│   │   └── supabase.ts                 # Cliente Supabase inicializado con storage adaptado
│   └── utils/
│       ├── deviceCode.ts               # Formateo y validación del código numérico de 15 dígitos
│       ├── deviceId.ts                 # Generación y validación de identificadores de sonda
│       ├── onboardingState.ts          # Máquina de estados para control de onboarding
│       └── units.ts                    # Conversión de unidades métricas e imperiales
├── tests/                              # 18 pruebas unitarias automatizadas con Node tsx
│   ├── authDeepLink.test.ts
│   ├── deviceId.test.ts
│   ├── onboardingState.test.ts
│   ├── preferences.test.ts
│   └── probeTelemetry.test.ts
└── scripts/
    └── verify-supabase-onboarding.mjs  # Prueba de integración E2E remota contra Supabase
```

---

## 4. Pantallas y Navegación

La aplicación utiliza un enrutador basado en máquina de estados en `App.tsx`, eliminando sobrecostos de navegadores pesados y garantizando transiciones instantáneas en dispositivos de gama de entrada.

```text
              [Primera Apertura]
                      │
                      ▼
          ┌───────────────────────┐
          │ WelcomeCarouselScreen │
          │ Quiénes / Qué / Cómo  │
          └───────────┬───────────┘
                      │
                      ▼
          ┌───────────────────────┐   Deep Link (terrasense://reset-password)
          │      AuthScreen       │ ──────────────────────────────────────────► ┌─────────────────────┐
          │   Login / Registro    │                                             │ ResetPasswordScreen │
          └───────────┬───────────┘                                             └─────────────────────┘
                      │ (Sesión iniciada)
                      ▼
           ¿Tiene equipo vinculado?
               ├── NO ──► ┌──────────────────┐
               │          │ OnboardingScreen │ ── Modo Propietario (BLE Pairing)
               │          │  (Paso único)    │ ── Modo Operador (Escaneo QR / Código)
               │          └────────┬─────────┘
               │                   │
               └── SÍ ─────────────┘
                      ▼
          ┌───────────────────────┐
          │    DashboardScreen    │ ◄── Home Central
          └───────────┬───────────┘
     ┌────────────────┼────────────────┬────────────────┐
     ▼                ▼                ▼                ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────────┐
│MeasureScreen│ │  MapScreen  │ │HistoryScreen│ │PerimeterScreen│
│Conexión BLE │ │Encuadre auto│ │Cola offline │ │GPS / Polígono │
│Fase fenológ.│ │Burbujas IDW │ │Badges sync  │ │Cálculo Has    │
└─────────────┘ └─────────────┘ └─────────────┘ └───────────────┘
```

### 4.1. Bienvenida y Autenticación
* **`WelcomeCarouselScreen`**: Tres diapositivas diseñadas con branding TerraSense que presentan la propuesta de valor. Se salta automáticamente si ya existe una sesión activa.
* **`AuthScreen`**: Permite login con correo/contraseña, creación de cuenta y solicitud de restablecimiento. Soporta modo offline accediendo a las credenciales locales de `useAuthStore`.
* **`ResetPasswordScreen`**: Recibe el token del deep link `terrasense://reset-password`, valida que la sesión de recuperación sea auténtica y permite escribir la nueva clave de forma segura.

### 4.2. Onboarding y Gobernanza de Equipos
* **`OnboardingScreen`**: Detecta automáticamente si el usuario es un agricultor que compró su sonda o un trabajador invitado al predio:
  1. **Primer Dueño (Owner):** Enciende el Bluetooth, busca la sonda física, graba el código de 15 dígitos en la memoria no volátil (NVS) del ESP32 y llama a `register_paired_device` para quedar como dueño oficial.
  2. **Operador de Campo:** Abre la cámara para escanear el QR compartido por el dueño o permite ingresar el código de 15 dígitos. Se le otorga el rol `operator` mediante `claim_operator_membership`.
* **Persistencia del Estado:** Una vez completado, se registra la marca temporal en `profiles.onboarding_completed_at`.

### 4.3. Medición y Decodificación BLE
* **`MeasureScreen`**:
  - Abre el modal `CalibrationReminderModal` con un clic para recordar la limpieza de la sonda.
  - Escanea y filtra por el UUID de servicio y el nombre anunciado `TerraSense-<device_code>`.
  - Conecta y activa la notificación GATT sobre la característica de telemetría.
  - Al recibir los 16 bytes, desconecta de inmediato el BLE para que el ESP32 vuelva a entrar en *Deep Sleep*.
  - Despliega un panel 3×3 con las lecturas (Humedad, Temperatura, CE, pH, Nitrógeno, Fósforo, Potasio).
  - Al pulsar cada tarjeta, abre una explicación agronómica de por qué el valor está en ese rango y qué hacer.

### 4.4. Perímetros Prediales y Topografía
* **`PerimeterScreen`**:
  - Permite al agricultor caminar por el lindero del potrero grabando puntos GPS en tiempo real, o tocar en el mapa satelital para trazar el perímetro.
  - Calcula automáticamente el área encerrada en hectáreas utilizando el algoritmo de Gauss (Shoelace formula sobre coordenadas geodésicas).
  - Guarda la geometría GeoJSON tanto en el almacenamiento local como en la columna `geometry` de PostGIS en Supabase.
* **`MapScreen`**:
  - Muestra el polígono delimitado del predio y las mediciones georreferenciadas.
  - Usa `fitToCoordinates` con padding adaptado a la barra superior y botones flotantes para garantizar que ningún elemento tape el predio.

### 4.5. Historial y Detalle de Medición
* **`HistoryScreen`**: Lista cronológica de todas las mediciones realizadas. Muestra fecha, hora, cultivo, etapa fenológica y un badge indicador de sincronización (sincronizada vs. guardada localmente).
* **`MeasurementDetailModal`**: Ficha técnica completa con todas las variables, datos de clima asociados y botón de reintento manual si la medición sigue en cola.

---

## 5. Motor Agronómico y Reglas de Decisión

El motor agronómico es un **sistema experto determinista basado en reglas biofísicas explícitas** (`agronomyEngine.ts`), complementado por un evaluador de etapas (`stageEvaluator.ts`) y un redactor de consejos (`contextualAdvice.ts`).

### 5.1. Etapas Fenológicas
El mismo suelo presenta implicancias agronómicas completamente diferentes según la fase del cultivo:

| Etapa Fenológica | Variables Críticas | Comportamiento del Motor |
| :--- | :--- | :--- |
| **Pre-siembra** | Temperatura, CE, pH, Humedad | Evalúa aptitud de cama de siembra; alerta si el suelo está demasiado frío para germinar o si la salinidad dañará la plántula. Permite proyectar el mapa de variabilidad. |
| **Vegetativo** | Nitrógeno (N), Humedad, CE | Monitorea la disponibilidad de N para el desarrollo foliar y la actividad fotosintética; alerta sobre excesos que promuevan enfermedades. |
| **Floración** | CE, Fósforo (P), Potasio (K) | El límite de salinidad máxima tolerable se reduce automáticamente al **80% del umbral estándar**, dado que el estrés osmótico provoca aborto floral masivo. |
| **Cosecha** | Humedad VWC, Potasio (K) | Evalúa la transitabilidad de maquinaria pesada para evitar compactación severa del suelo y verifica madurez de fruto según niveles de potasio. |

### 5.2. Regla de Veto Cruzado por Salinidad
Las sondas agrícolas 7-en-1 estiman el NPK mediante relaciones de conductividad iónica aparente en la solución del suelo. Si la **Conductividad Eléctrica (CE)** supera el umbral crítico de salinidad del cultivo:
1. Las concentraciones de sales libres (cloruros, sulfatos, sodio) distorsionan por completo la estimación de iones nitrato, fosfato y potasio.
2. El motor activa una **regla de veto cruzado**: oculta o marca como "estimación distorsionada por salinidad" los valores numéricos de N-P-K, alertando al productor que debe corregir el lavado de sales antes de fertilizar.

### 5.3. Modelo Verbal de Comunicación (Sin Semáforo Simplista)
Para evitar diagnósticos superficiales, el motor traduce los estados técnicos internos a tres niveles de decisión verbal:
* **🟢 Condición Favorable:** Los parámetros se encuentran dentro del rango óptimo para la fenología activa. No se requiere intervención correctiva.
* **🟡 Requiere Atención:** Uno o más parámetros se aproximan a los límites de estrés. Se sugiere planificar ajustes de fertirriego o manejo agronómico.
* **🔴 Condición Limitante:** Existe una barrera biofísica concreta (estrés hídrico severo, fitotoxicidad por pH, salinidad crítica) que causará pérdidas si no se corrige de inmediato.

---

## 6. Enlace BLE con la Sonda (Protocolo GATT)

```text
┌─────────────────┐       RS-485 Modbus RTU       ┌───────────────┐
│ Sonda 7-en-1    ├──────────────────────────────►│ Micro ESP32   │
│ Acero Inox      │                               │ Con Batería   │
└─────────────────┘                               └───────┬───────┘
                                                          │ BLE GATT Notify
                                                          │ (Trama de 16 Bytes)
                                                          ▼
                                                  ┌───────────────┐
                                                  │ App Móvil     │
                                                  │ React Native  │
                                                  └───────────────┘
```

* **Servicio Principal:** `00000001-5e4e-4c69-6d61-746572726101`
* **Telemetría (Notify):** `00000002-5e4e-4c69-6d61-746572726102`
* **Identidad (Read):** `00000003-5e4e-4c69-6d61-746572726103`
* **Provisionamiento (Write):** `00000004-5e4e-4c69-6d61-746572726104`

### Estructura de la Trama de Telemetría (16 Bytes Big-Endian):
```text
[0..1]  Humedad Volumétrica (VWC × 10)       -> uint16
[2..3]  Temperatura del Suelo (°C × 10)      -> int16 (con signo)
[4..5]  Conductividad Eléctrica (µS/cm)      -> uint16
[6..7]  Potencial Hidrógeno (pH × 10)        -> uint16
[8..9]  Nitrógeno Disponible (mg/kg)         -> uint16
[10..11] Fósforo Disponible (mg/kg)          -> uint16
[12..13] Potasio Disponible (mg/kg)          -> uint16
[14..15] Estado de Batería (Voltaje mV)      -> uint16
```

> [!CAUTION]
> **Ahorro Energético Crítico:** El método `bleService.ts` siempre desconecta el enlace BLE dentro de un bloque `finally`. Si la conexión BLE permaneciera abierta, el microcontrolador ESP32 no podría entrar en modo *Deep Sleep*, agotando la batería Li-Ion 18650 en menos de 48 horas en lugar de durar 6 a 8 meses.

---

## 7. Sincronización Idempotente en Cola

El servicio `measurementsService.ts` implementa un patrón **Store & Forward** con garantía de idempotencia:

1. **Generación Local de Identificador:** Al completarse la medición, el teléfono genera un `client_uuid` criptográfico mediante `expo-crypto` antes de cualquier intento de red.
2. **Escritura Inmediata en Caché:** La medición se almacena primero en `AsyncStorage` en la cola local de la cuenta activa.
3. **Intento de Envío:** Si hay cobertura, se realiza una llamada `upsert` a Supabase vinculando el `client_uuid`.
4. **Manejo de Reintentos:** Si la conexión falla o el teléfono se apaga, la medición permanece intacta en la cola local. Cuando el componente `OfflineBanner` detecta el retorno de internet, `flushQueue()` reenvía los datos pendientes.
5. **Aislamiento Multicuenta:** Las colas se almacenan con claves separadas por ID de usuario (`@terrasense_queue_<uid>`), evitando mezclar datos si dos operarios comparten el mismo terminal.

---

## 8. Variables de Entorno

Crear el archivo `App/.env` basándose en el ejemplo:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://bjmhjatykqccksddgtmo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_publica
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=tu_clave_restringida_de_google_maps
```

---

## 9. Comandos de Desarrollo y Pruebas

```bash
# Entrar a la carpeta
cd App

# Instalar dependencias
npm install

# Iniciar servidor Metro de Expo
npm run start

# Ejecución en Android (Development Build con módulos nativos BLE)
npm run android

# Verificación de tipos TypeScript estricta
npm run type-check

# Ejecutar las 18 pruebas unitarias automatizadas (tsx / node test runner)
npm test

# Verificación E2E remota contra Supabase (creación/borrado temporal)
npm run test:supabase-onboarding

# Compilación de prueba para verificar bundling Android real
npx expo export --platform android
```

---

## 10. Decisiones Arquitectónicas que Conviene Preservar

* **Áreas Táctiles Mínimas de 48 dp:** Los botones y selectores están dimensionados para operarse con manos mojadas o guantes de faena agrícola.
* **Sin Ubicación en Segundo Plano (`ACCESS_BACKGROUND_LOCATION`):** La app solo solicita ubicación precisa mientras el agricultor está activamente midiendo o delimitando el perímetro. Esto evita consumo de batería innecesario y cumple con los estándares de privacidad de la Ley 21.719.
* **Degradación de Mapas sin Bloqueo:** La falta de conexión satelital o de datos nunca impide registrar y evaluar las propiedades del suelo.
* **Gobernanza Estricta de Membresías:** Los operarios no pueden modificar nombres ni parámetros de sondas; esas facultades corresponden exclusivamente a roles `owner` y `admin`.

---

## 11. 🛠️ Manual de Instalación de Herramientas

Para levantar el entorno móvil desde una máquina limpia:

### 11.1. Node.js y JDK
* **Node.js:** Versión 20 o 22 LTS (evitar versiones impares como 21 o 23).
* **JDK:** OpenJDK 17 (obligatorio para la compilación de librerías nativas en Android).

```powershell
# Windows (PowerShell)
winget install OpenJS.NodeJS.LTS
winget install Microsoft.OpenJDK.17
```

### 11.2. Android Studio y SDK
1. Instalar **Android Studio**.
2. En *SDK Manager*, verificar que estén instalados:
   - **Android SDK Platform 35**
   - **Android SDK Build-Tools**
   - **Android SDK Platform-Tools**
3. Configurar variables de entorno permanentes:
```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx JAVA_HOME "C:\Program Files\Microsoft\jdk-17"
```

### 11.3. Dispositivo Físico para Pruebas BLE
> [!IMPORTANT]
> El emulador de Android **no soporta emulación de hardware Bluetooth Low Energy (BLE)** ni cámara física para escanear QR. Las pruebas de enlace con la sonda deben realizarse en un dispositivo Android físico conectado por USB con el modo de **Depuración por USB** activado.

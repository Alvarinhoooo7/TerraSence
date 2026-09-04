# 📱 TerraSense · Aplicación Móvil de Terreno

Aplicación móvil de terreno desarrollada en **React Native 0.81 + React 19 + Expo 54 + TypeScript + Zustand**. 
Es la herramienta central que el agricultor y los operadores llevan al potrero: se conecta automáticamente a la lanza sensor TerraSense vía **Bluetooth Low Energy (BLE)**, evalúa el suelo localmente según la etapa fenológica elegida, entrega recomendaciones contextuales con clima (Open-Meteo) y proyecta exclusivamente las mediciones de **siembra** en un mapa con círculos de influencia agronómica de 20 metros **sin requerir conexión a internet**.

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
  - [4.3. Flujo de Medición: Selección de Fase y Carrusel Post-Medición](#43-flujo-de-medición-selección-de-fase-y-carrusel-post-medición)
  - [4.4. Historial y Mapa de Mediciones de Siembra (Radio 20 m)](#44-historial-y-mapa-de-mediciones-de-siembra-radio-20-m)
- [5. Motor Agronómico y Reglas de Decisión](#5-motor-agronómico-y-reglas-de-decisión)
  - [5.1. Etapas Fenológicas Obligatorias](#51-etapas-fenológicas-obligatorias)
  - [5.2. Regla de Veto Cruzado por Salinidad sobre NPK](#52-regla-de-veto-cruzado-por-salinidad-sobre-npk)
  - [5.3. Código de Colores Semáforo y Desglose Interactivo](#53-código-de-colores-semáforo-y-desglose-interactivo)
- [6. Enlace BLE con la Sonda (Protocolo GATT)](#6-enlace-ble-con-la-sonda-protocolo-gatt)
- [7. Sincronización Idempotente en Cola](#7-sincronización-idempotente-en-cola)
- [8. Variables de Entorno](#8-variables-de-entorno)
- [9. Comandos de Desarrollo y Pruebas](#9-comandos-de-desarrollo-y-pruebas)
- [10. Decisiones Arquitectónicas que Conviene Preservar](#10-decisiones-arquitectónicas-que-conviene-preservar)
- [11. 🛠️ Manual de Instalación de Herramientas](#11-️-manual-de-instalación-de-herramientas)

---

## 1. Flujo de Usuario y Capacidades Clave

1. **Carrusel de Bienvenida (`WelcomeCarouselScreen`):** Tres tarjetas informativas (*Quiénes somos*, *Qué hacemos* y *Por qué lo hacemos*) antes de ingresar a la cuenta.
2. **Acceso y Recuperación de Clave:** Inicio de sesión, registro y flujo de recuperación de contraseña vía deep link nativo `terrasense://reset-password` y formulario interactivo `ResetPasswordScreen`.
3. **Onboarding Dual de Equipos:**
   - **Primer Propietario (Owner):** Vinculación física por BLE con grabación del código de 15 dígitos en la memoria NVS del ESP32 y registro atómico en Supabase (`register_paired_device`).
   - **Operadores de Campo:** Escaneo de código QR generado por el dueño o ingreso manual del código para obtener membresía `operator` (`claim_operator_membership`).
4. **Dashboard Principal:** Punto de inicio rápido con botón destacado **Iniciar Medición** y acceso al historial.
5. **Selección Obligatoria de Fase Fenológica:** Al pulsar medir, el usuario debe seleccionar una de las 4 etapas productivas:
   - **Pre-siembra (Siembra)**
   - **Vegetativo**
   - **Floración**
   - **Cosecha**
6. **Captura BLE y Meteorológica:** Recordatorio preventivo de limpieza de electrodos (`CalibrationReminderModal`), conexión automática por BLE a la sonda, lectura de la trama GATT de 16 bytes y consulta meteorológica local a Open-Meteo.
7. **Carrusel de Resultados Post-Medición:**
   - **Página 1 (Grid 3×3 Semáforo):** Cuadrícula con las variables medidas en verde (óptimo), naranjo (precaución) y rojo (riesgo). Al tocar cualquier parámetro, se despliega una explicación detallada con advertencias, causas y acciones concretas para mejorarlo según la fase activa.
   - **Página 2 (Recomendación Integral Globalizada):** Diagnóstico de conjunto que combina suelo, etapa del cultivo y pronóstico del clima (olas de calor, heladas, lluvias, qué sembrar o cuidados de la planta en crecimiento). Aquí finaliza el carrusel para Vegetativo, Floración y Cosecha.
   - **Página 3 (Exclusiva para Fase Siembra):** Pestaña adicional donde la medición se plasma en el mapa predial georreferenciado con una burbuja de detalle y un **círculo de influencia de radio de 20 metros**.
8. **Historial de Mediciones (`HistoryScreen`):** Lista cronológica de todas las mediciones. Permite abrir el mapa satelital **únicamente para las mediciones de siembra** para ver los puntos y zonas de 20 m cubiertas. Las demás fases permanecen como registros de auditoría y seguimiento.

---

## 2. Principio Rector: Offline-First

El productor agrícola opera habitualmente en zonas rurales sin conectividad celular 4G/5G. La aplicación garantiza **total autonomía operativa en terreno**:

| Escenario en Terreno | Comportamiento del Sistema |
| :--- | :--- |
| **Sin Conexión a Internet** | La app inicia desde la caché persistente de Zustand/AsyncStorage (`useAuthStore`). Conecta por BLE, evalúa el suelo localmente, genera la recomendación, guarda la lectura y la encola con un `client_uuid` único. |
| **Sin Descarga de Teselas de Mapa** | El mapa satelital degrada a un lienzo de coordenadas neutro; los puntos de siembra, la burbuja y los círculos de 20 metros siguen plenamente visibles e interactivos. |
| **Sin Señal de Satélites GPS** | Emite un aviso no bloqueante; la medición se registra con fecha, hora y cultivo, guardándose localmente sin coordenadas geográficas. |
| **Sin Sonda Física Presente (Demo/Prueba)** | Permite simular lecturas con una **bandera visual visible y permanente** en pantalla para no confundir datos ficticios con mediciones reales. |
| **Recuperación de Cobertura** | El componente `OfflineBanner` detecta el regreso de internet y `measurementsService` vacía la cola en segundo plano mediante upsert idempotente. |

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
│   │   └── theme.ts                    # Paleta de colores semáforo, tipografía y estilos
│   ├── types/
│   │   ├── agronomy.ts                 # Tipos de fenología, 8 cultivos y umbrales biofísicos
│   │   ├── app.ts                      # Interfaces de estado global, mediciones y sincronización
│   │   └── preferences.ts              # Preferencias de usuario (tema, idioma, unidades)
│   ├── engine/
│   │   ├── agronomyEngine.ts           # Motor de reglas biofísicas deterministas
│   │   ├── stageEvaluator.ts           # Reponderación de umbrales según fase fenológica
│   │   └── contextualAdvice.ts         # Generador de recomendaciones globales y por parámetro
│   ├── store/
│   │   ├── useAppStore.ts              # Estado global de la aplicación (Zustand)
│   │   └── useAuthStore.ts             # Sesión de usuario con caché offline en AsyncStorage
│   ├── hooks/
│   │   ├── useAppTheme.ts              # Hook de tema (Sistema / Claro / Oscuro)
│   │   └── useTranslation.ts           # Hook de idioma (Español / Inglés)
│   ├── screens/
│   │   ├── WelcomeCarouselScreen.tsx   # Carrusel informativo inicial
│   │   ├── AuthScreen.tsx              # Inicio de sesión, registro y solicitud de clave
│   │   ├── ResetPasswordScreen.tsx     # Formulario de nueva contraseña tras deep link
│   │   ├── OnboardingScreen.tsx        # Provisión BLE de dueño o escaneo QR de operador
│   │   ├── DashboardScreen.tsx         # Pantalla principal con botón central "Medir"
│   │   ├── MeasureScreen.tsx           # Selección de fase → BLE → Carrusel de 2 ó 3 páginas
│   │   ├── MapScreen.tsx               # Mapa predial para mediciones de siembra (círculos 20 m)
│   │   ├── HistoryScreen.tsx           # Historial cronológico con acceso a mapa para siembra
│   │   ├── DevicesScreen.tsx           # Gestión de equipos vinculados y roles
│   │   └── FieldSettingsScreen.tsx     # Configuración de predios, texturas y cultivos
│   ├── components/
│   │   ├── CalibrationReminderModal.tsx # Modal que recuerda limpiar electrodos de la sonda
│   │   ├── OfflineBanner.tsx           # Barra discreta ante corte de internet
│   │   ├── ScreenGuide.tsx             # Botón '?' con guía de uso por pantalla
│   │   ├── StageSelector.tsx           # Selector visual de las 4 etapas fenológicas
│   │   ├── FieldPicker.tsx             # Selector de predio activo
│   │   ├── MeasurementBottomSheet.tsx  # Ficha deslizable de lectura sobre el mapa
│   │   └── MeasurementDetailModal.tsx  # Modal detallado con badge de sincronización
│   ├── services/
│   │   ├── bleService.ts               # Escaneo BLE, conexión GATT notify y desconexión segura
│   │   ├── probeService.ts             # Decodificación de trama de 16 bytes Big-Endian
│   │   ├── measurementsService.ts      # Cola offline en AsyncStorage y sincronización Supabase
│   │   ├── deviceService.ts            # Registro y gestión de membresías de equipos
│   │   ├── onboardingService.ts        # Persistencia de estado de onboarding en Supabase
│   │   ├── preferencesService.ts       # Preferencias de usuario locales y en la nube
│   │   ├── fieldsService.ts            # Gestión de predios agrícolas
│   │   ├── weatherService.ts           # Consulta resiliente a la API de Open-Meteo
│   │   ├── authDeepLink.ts             # Captura del esquema tierrasense://reset-password
│   │   ├── authDeepLinkParser.ts       # Procesamiento de tokens del enlace de correo
│   │   ├── notifications.ts            # Registro de tokens de notificaciones push
│   │   └── supabase.ts                 # Cliente Supabase tipado
│   └── utils/
│       ├── deviceCode.ts               # Validación y formato de códigos de 15 dígitos
│       ├── deviceId.ts                 # Identificadores canónicos de hardware
│       ├── onboardingState.ts          # Máquina de estados para control de onboarding
│       └── units.ts                    # Conversión de unidades métricas e imperiales
├── tests/                              # 18 pruebas unitarias automatizadas con Node tsx
│   ├── authDeepLink.test.ts
│   ├── deviceId.test.ts
│   ├── onboardingState.test.ts
│   ├── preferences.test.ts
│   └── probeTelemetry.test.ts
└── scripts/
    └── verify-supabase-onboarding.mjs  # Verificación E2E remota contra Supabase
```

---

## 4. Pantallas y Navegación

El flujo de pantallas se articula a través de un enrutador liviano en `App.tsx` que garantiza respuesta inmediata en terreno:

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
                      │
                      ▼
          ┌───────────────────────┐
          │  StageSelector Modal  │ ◄── ELECCIÓN OBLIGATORIA DE FASE
          │  Pre-siembra/Veg/Flor/│
          └───────────┬───────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │     MeasureScreen     │
          │  (Carrusel Resultados)│
          ├───────────────────────┤
          │ Pág 1: Grid 3x3       │ (Semáforo interactivo con advertencias)
          │ Pág 2: Recomendación  │ (Diagnóstico conjunto suelo + clima)
          │ Pág 3: Mapa Siembra   │ ◄── (SÓLO SI LA FASE FUE SIEMBRA)
          └───────────────────────┘
```

### 4.1. Bienvenida y Autenticación
* **`WelcomeCarouselScreen`**: 3 tarjetas con branding del proyecto que explican la misión de TerraSense. Se omite automáticamente si ya existe una sesión guardada.
* **`AuthScreen`**: Permite login con email/contraseña, creación de cuenta y solicitud de recuperación. Con soporte offline gracias a la sesión persistida en `useAuthStore`.
* **`ResetPasswordScreen`**: Formulario que recibe el token del deep link `terrasense://reset-password` para actualizar la contraseña de forma segura.

### 4.2. Onboarding y Gobernanza de Equipos
* **`OnboardingScreen`**: Detecta automáticamente el tipo de usuario:
  1. **Primer Dueño (`owner`):** Busca la sonda por BLE, graba el código de 15 dígitos en la NVS del ESP32 y registra la propiedad en Supabase con `register_paired_device`.
  2. **Operador de Campo (`operator`):** Escanea el código QR generado por el dueño o introduce el código manualmente, vinculándose mediante `claim_operator_membership`.

### 4.3. Flujo de Medición: Selección de Fase y Carrusel Post-Medición

El proceso de medición sigue una secuencia rigurosa y pedagógica:

1. **Selección de Fase Fenológica:** Al presionar "Medir", la interfaz exige seleccionar una de las cuatro etapas del ciclo:
   - **Pre-siembra (Siembra)**
   - **Vegetativo**
   - **Floración**
   - **Cosecha**
2. **Preparación y Captura Física:**
   - Se muestra el modal recordatorio `CalibrationReminderModal` sugiriendo limpiar y secar los electrodos de acero inoxidable.
   - La app escanea el anuncio `TerraSense-<device_code>`, conecta vía BLE, captura la trama de 16 bytes y consulta el clima en Open-Meteo.
   - Desconecta inmediatamente el enlace BLE para proteger la batería del ESP32.
3. **Página 1 del Carrusel · Grid 3×3 Semáforo Interactivo:**
   - Muestra cada una de las variables medidas con su valor numérico y el color de semáforo correspondiente:
     - **🟢 Verde:** Perfecto / Condición favorable.
     - **🟡 Naranjo:** Precaución / Requiere atención o ajuste preventivo.
     - **🔴 Rojo:** Riesgo / Condición limitante que puede generar daño o pérdida.
   - **Interactividad al Tocar:** Al pulsar cualquier parámetro (por ejemplo, si el Nitrógeno está en naranjo o la Humedad en rojo), se abre una tarjeta modal con advertencias específicas:
     - Por qué el parámetro está en ese nivel.
     - Qué riesgos implica para la fase seleccionada.
     - Qué acciones de manejo o fertirriego realizar para mejorarlo.
4. **Página 2 del Carrusel · Recomendación Integral Globalizada:**
   - Entrega un diagnóstico agronómico de conjunto combinando todos los parámetros del suelo, la fase elegida y el pronóstico del tiempo (alertas de lluvias, olas de calor o heladas).
   - En **Siembra**: Detalla qué cultivos conviene sembrar y cuáles no, y precauciones ante eventos climáticos inmediatos.
   - En **Vegetativo / Floración / Cosecha**: Alertas climáticas de apoyo y cuidados específicos para la planta en desarrollo.
   - **Aquí concluye el carrusel para Vegetativo, Floración y Cosecha.**
5. **Página 3 del Carrusel · Proyección en Mapa Predial (Exclusiva para Siembra):**
   - Si la medición fue realizada en fase de **Pre-siembra / Siembra**, se habilita esta tercera pestaña en el carrusel.
   - Añade el punto georreferenciado en el mapa predial.
   - El punto cuenta con su burbuja de detalles y está circunscrito en un **círculo de radio de 20 metros** para delimitar el área agronómica evaluada (mostrando si esa zona del terreno está en condición buena o en riesgo).

### 4.4. Historial y Mapa de Mediciones de Siembra (Radio 20 m)
* **`HistoryScreen`**: Lista cronológica de todas las mediciones realizadas, con fecha, cultivo, etapa fenológica y badge de sincronización local/nube.
* **Visualización Cartográfica Selectiva (`MapScreen`):**
  - **Solo las mediciones de Siembra / Pre-siembra pueden visualizarse en el mapa predial.**
  - Cada medición de siembra se proyecta con:
    - Una **burbuja interactiva** que despliega el resumen de los valores medidos.
    - Un **círculo de radio de 20 metros** alrededor de las coordenadas GPS, permitiendo al agricultor saber con exactitud qué área del potrero tiene suelo óptimo o presenta riesgos antes de tirar la semilla.
  - Las mediciones de fases vegetativa, floración y cosecha se consultan directamente en el historial tabular mediante `MeasurementDetailModal`.

---

## 5. Motor Agronómico y Reglas de Decisión

El motor agronómico (`agronomyEngine.ts` + `stageEvaluator.ts` + `contextualAdvice.ts`) es un sistema experto determinista basado en relaciones biofísicas de suelo-planta:

### 5.1. Etapas Fenológicas Obligatorias

| Etapa Fenológica | Variables Críticas | Comportamiento del Motor |
| :--- | :--- | :--- |
| **Pre-siembra (Siembra)** | Temperatura, CE, pH, Humedad | Evalúa aptitud de cama de siembra; alerta si el suelo está frío para germinar o si la salinidad dañará la plántula. **Habilita la proyección cartográfica con círculos de 20 m.** |
| **Vegetativo** | Nitrógeno (N), Humedad, CE | Monitorea la disponibilidad de N para el desarrollo foliar y la actividad fotosintética; alerta sobre excesos que promuevan hongos. |
| **Floración** | CE, Fósforo (P), Potasio (K) | El umbral de salinidad máxima se reduce automáticamente al **80% del valor estándar**, ya que el estrés osmótico provoca aborto floral masivo. |
| **Cosecha** | Humedad VWC, Potasio (K) | Evalúa transitabilidad de maquinaria para evitar compactación severa del suelo y analiza concentración de potasio para calidad de fruto. |

### 5.2. Regla de Veto Cruzado por Salinidad sobre NPK
Las sondas agrícolas de acero inoxidable estiman los iones N-P-K mediante conductividad iónica aparente en la solución del suelo. Si la **Conductividad Eléctrica (CE)** sobrepasa el umbral de salinidad del cultivo:
1. Las sales libres disueltas distorsionan de forma severa la respuesta del sensor para nitratos, fosfatos y potasio.
2. El motor activa la **regla de veto cruzado**: enmascara los valores numéricos de N-P-K y alerta explícitamente al productor de que la estimación nutricional está distorsionada por exceso de sales, indicando que debe realizar un lavado antes de aplicar fertilizantes.

### 5.3. Código de Colores Semáforo y Desglose Interactivo
El Grid 3×3 de la primera página del carrusel utiliza el código de colores universal:
* **🟢 Verde (Perfecto):** El parámetro está dentro del rango óptimo para el cultivo y la fase fenológica seleccionada.
* **🟡 Naranjo (Precaución):** El valor se aproxima a los límites de estrés; requiere ajustes preventivos en el riego o nutrición.
* **🔴 Rojo (Riesgo):** Condición limitante severa (estrés hídrico, acidez perjudicial o salinidad) que exige intervención correctiva inmediata.

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

### Estructura de la Trama de 16 Bytes Big-Endian:
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
> **Desconexión BLE Obligatoria:** `bleService.ts` siempre ejecuta `cancelConnection()` dentro de un bloque `finally`. Si la conexión quedara activa, el ESP32 no podría retornar a *Deep Sleep*, agotando la batería Li-Ion 18650 en un par de días en vez de ofrecer 6 a 8 meses de autonomía.

---

## 7. Sincronización Idempotente en Cola

El servicio `measurementsService.ts` opera bajo un esquema **Store & Forward**:

1. **Generación de `client_uuid`:** Al concluir la medición, se genera un identificador único antes de cualquier intento de red.
2. **Escritura Local Inmediata:** La medición se almacena de inmediato en `AsyncStorage` en la cola del usuario autenticado.
3. **Envío Idempotente:** Al contar con cobertura, se realiza un `upsert` a Supabase contra el índice único de `client_uuid`.
4. **Reintentos Transparentes:** Si no hay señal, la lectura permanece segura en el almacenamiento del teléfono. Al reconectarse, `flushQueue()` vacía las mediciones pendientes sin duplicar registros.

---

## 8. Variables de Entorno

Crear el archivo `App/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://bjmhjatykqccksddgtmo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_publica
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=tu_clave_restringida_de_google_maps
```

---

## 9. Comandos de Desarrollo y Pruebas

```bash
# Entrar al directorio
cd App

# Instalar dependencias
npm install

# Iniciar servidor Metro de Expo
npm run start

# Compilación y ejecución en Android (Development Build para BLE)
npm run android

# Chequeo estricto de tipos de TypeScript
npm run type-check

# Ejecutar las 18 pruebas unitarias automatizadas (tsx / node test runner)
npm test

# Verificación E2E remota contra Supabase
npm run test:supabase-onboarding

# Compilación de prueba para verificar empaquetado Android
npx expo export --platform android
```

---

## 10. Decisiones Arquitectónicas que Conviene Preservar

* **Ubicación Bajo Demanda (Sin `ACCESS_BACKGROUND_LOCATION`):** La app solo solicita coordenadas GPS en el instante exacto en que el agricultor ejecuta una medición. No consume batería en segundo plano y cumple con la Ley de Protección de Datos 21.719.
* **Mapa Restringido a Pre-siembra:** El mapa es una herramienta de planificación de siembra, no un visor sobrecargado; las mediciones fenológicas posteriores pertenecen al historial agronómico del cultivo.
* **Degradación Visual en Mapa:** Si no hay internet para descargar teselas satelitales de Google Maps, el mapa degrada a coordenadas neutras manteniendo visibles los puntos de siembra y los círculos de 20 m.
* **Gobernanza Estricta de Membresías:** Los operarios no pueden modificar la configuración ni transferir la sonda; esas facultades corresponden exclusivamente a roles `owner` y `admin`.

---

## 11. 🛠️ Manual de Instalación de Herramientas

### 11.1. Node.js y JDK
* **Node.js:** Versión 20 o 22 LTS.
* **JDK:** OpenJDK 17 (obligatorio para compilar módulos nativos en Android).

```powershell
# Windows (PowerShell)
winget install OpenJS.NodeJS.LTS
winget install Microsoft.OpenJDK.17
```

### 11.2. Android Studio y SDK
1. Instalar **Android Studio**.
2. En *SDK Manager*, instalar: **Android SDK Platform 35**, **Build-Tools** y **Platform-Tools**.
3. Configurar variables de entorno:
```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx JAVA_HOME "C:\Program Files\Microsoft\jdk-17"
```

### 11.3. Dispositivo Físico para Pruebas BLE
> [!IMPORTANT]
> Los emuladores de Android **no emulan hardware Bluetooth Low Energy (BLE)** ni cámara física para escanear QR. Las pruebas de enlace con la sonda deben realizarse en un dispositivo Android físico conectado por USB con el modo de **Depuración por USB** activado.

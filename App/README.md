# 📱 TerraSense · Aplicación Móvil de Terreno

> Documentación de la aplicación móvil. El informe académico de la raíz contiene la ingeniería conceptual, la evaluación económica y el marco normativo del proyecto.

<a id="interfaz-e-integración-actualizadas-al-11-09-2026"></a>

## Interfaz e integración actualizadas al 19-09-2026

**Mejoras Visuales (UI/UX Premium):**
Se rediseñó el flujo completo de inicio (Onboarding, Login, Permisos, Recuperación) integrando animaciones fluidas con `react-native-reanimated` y feedback táctil con `expo-haptics`.
- **Carrusel y Bienvenida:** Paginación suave, transiciones de entrada escalonadas y arte animado.
- **Autenticación:** Formularios reactivos con `LinearTransition`, campos con validación visual y transiciones de estados limpias.
- **Onboarding de Equipos y Permisos:** Separación visual clara mediante tarjetas interactivas que responden a la presión con feedback háptico y escalas sutiles.

El Grid **2×5 tiene dos columnas y cinco filas**, con una tarjeta por variable y diez registros locales en total.

| Fila | Columna 1 | Columna 2 |
|---|---|---|
| 1 | Humedad del suelo | Conductividad eléctrica del suelo |
| 2 | Temperatura del suelo | Nitrógeno (N) |
| 3 | Fósforo (P) | Potasio (K) |
| 4 | pH del suelo | Temperatura ambiente (BME280) |
| 5 | Humedad relativa ambiente (BME280) | Presión atmosférica ambiente (BME280) |

N, P y K se muestran por separado como registros informativos, sin atribuirles selectividad química o capacidad para prescribir dosis de fertilizante. Estado, batería y completitud van fuera de estas diez tarjetas. El pronóstico a cinco días se presenta aparte. Si falta una lectura ambiental, se indica su ausencia; no se sustituye por datos de internet. **El Grid está implementado en la App y en el detalle web; la validación física sigue pendiente.**

La captura y el historial muestran diez tarjetas en dos columnas. Las tres variables ambientales proceden del equipo; batería, fecha y completitud se muestran aparte. El pronóstico se consulta sin bloquear la presentación ni el guardado local.

- Implementado: Grid, unidades, NULL, origen, fecha de captura, batería e historial de las diez variables.
- Probar captura, diagnóstico y guardado en modo avión; no bloquear el resultado por la consulta meteorológica.
- Probar sesión previa, falta de GPS, reinicio, sincronización y accesibilidad.
- Mantener N/P/K informativos y el estado metrológico visible.

Queda pendiente validar el recorrido completo con hardware.

### Captura, historial y pronóstico: contrato implementado

Las tarjetas conservan el orden de la tabla anterior: humedad (%), CE (µS/cm), temperatura de suelo, N, P, K, pH, temperatura ambiente, humedad relativa (%) y presión (hPa). Las temperaturas se muestran en °C o °F según la preferencia; los registros nominales N/P/K en mg/kg se rotulan **Sin validar**, sin prescribir dosis. Estado, batería, fecha y completitud se presentan fuera del Grid.

Las tres magnitudes ambientales, `battery_percent`, `measured_at` y `diagnosis` sobreviven al guardado, consulta, caché, cola offline e historial. Los registros antiguos sin ambiente o batería siguen siendo legibles y muestran ausencia. `diagnosis.localSource = 'probe-bme280-v1'` identifica las capturas del nuevo flujo; no permite atribuir el mismo origen a históricos sin esa marca. `measured_at` conserva la recepción de la lectura en el celular, aunque la sincronización ocurra más tarde.

El servicio consulta `forecast_days=6&timezone=auto` a Open-Meteo y presenta las **cinco fechas locales posteriores a hoy**, con temperaturas mínima/máxima y precipitación. Los valores faltantes se conservan como ausencia; las alertas por fecha de lluvia, helada o calor usan reglas orientativas aún no validadas en campo. La lectura y su diagnóstico se presentan antes de terminar esa consulta y pueden guardarse mientras carga. Al guardar, el pronóstico y la recomendación disponibles quedan congelados en `diagnosis`: una respuesta tardía no modifica ese registro ni otra medición.

El GPS procede del celular y se espera como máximo cinco segundos. Si no entrega ubicación, se conserva la lectura sin coordenadas y sin pronóstico. Este límite **no es el tiempo total de medición**. Las cuatro etapas permanecen en el historial, con o sin coordenadas. La app no incluye mapas.

La trama de producto es de **20 bytes**, con diez variables, batería y formato. La trama de 16 bytes sólo se tolera para prototipos sin BME280. Una respuesta BLE válida confirma presencia en ese instante; el enlace se cierra después para permitir reposo y no se afirma conexión permanente ni internet del ESP32. Ver [contrato BLE](../docs/CONTRATO_BLE.md) y [persistencia en Supabase](../supabase/README.md#persistencia-ambiental-y-bateria).

La entrega del 11-09-2026 pasó `npm run type-check` y las **55 pruebas** de `npm test`, incluidas `probeTelemetry`, `environmentHistory` y `weatherService`. Cubren v0/v1, centinelas, negativos, rangos, batería, BLE → fila → historial, históricos sin ambiente, cinco fechas con cambio de mes, pronóstico parcial y fallo de red. Son resultados de esa entrega, no una certificación física; [pruebas pendientes](../docs/PLAN_VALIDACION.md#5-dependencias-y-comprobaciones-de-software).


---

Aplicación móvil de terreno desarrollada en **React Native 0.86 + React 19.2 + Expo SDK 57 + TypeScript 6 + Zustand**. 

### Aceptación previa al registro móvil

Al enviar un formulario de registro válido se abre el
[panel de términos y privacidad](src/components/RegistrationConsentModal.tsx).
La solicitud de creación de cuenta se realiza únicamente después de llegar al final
del contenido, marcar las dos casillas y pulsar «Continuar». El botón permanece
visible en la parte inferior. Antes de llegar al final, «Continuar» no está bloqueado:
desplaza el texto hasta el final a una velocidad legible, y sólo entonces se habilitan
las casillas. Arrastrar el texto interrumpe ese desplazamiento asistido. Cancelar vuelve
al formulario sin enviar la solicitud; al reabrir, las casillas vuelven a estar vacías.
Si todo el contenido cabe en pantalla, no se exige un desplazamiento imposible. El inicio
de sesión, la recuperación y la consola web no incorporan este paso.

El texto identifica al responsable del tratamiento, el correo para ejercer derechos y el
plazo de conservación tras cerrar la cuenta. Describe las finalidades, la ubicación
opcional, Open-Meteo y el alojamiento en Brasil. Distingue la [Ley 19.628](https://www.bcn.cl/leychile/Navegar?idNorma=141599)
de la [Ley 21.719](https://www.bcn.cl/leychile/Navegar?idNorma=1209272), cuya entrada
en vigor es el 1 de diciembre de 2026; no acredita por sí solo cumplimiento legal.

La [versión de aceptación](src/utils/registrationConsent.ts), las dos confirmaciones,
el idioma y la fecha del dispositivo se envían en `options.data.registration_consent`
durante `signUp`. Supabase los conserva como metadatos del usuario si crea la cuenta;
**no constituyen una auditoría inmutable ni una validación de consentimiento en el
servidor**, porque esos metadatos y la hora proceden del cliente. El panel protege
el recorrido de esta app; no impide un registro directo por la API.

Este paso precede a la confirmación por código implementada en
[EmailCodeScreen](src/screens/EmailCodeScreen.tsx). La recuperación usa la misma pantalla
con propósito distinto y luego abre el formulario de nueva contraseña. Una cuenta sin
confirmar puede retomar la verificación desde el inicio de sesión; no necesita registrarse
otra vez. Se conserva el estado de recuperación asociado a la cuenta al reiniciar la app.
La activación remota de plantillas y vencimiento está descrita en
[Supabase](../supabase/README.md#7-plantillas-de-correo).
Las pruebas de lectura y aceptación están en [registrationConsent.test.ts](tests/registrationConsent.test.ts)
y las del protocolo de códigos en [emailOtp.test.ts](tests/emailOtp.test.ts).
Es la herramienta central que el agricultor y los operadores llevan al campo: se conecta a la sonda portátil TerraSense vía **Bluetooth Low Energy (BLE)**, evalúa el suelo localmente según la etapa fenológica elegida, agrega contexto meteorológico y conserva las mediciones de todas las etapas en el historial.

> ### ⚠️ Estado de verificación
> Corregido tras la [auditoría del 4 de septiembre de 2026](../finanzas/historico/documentacion/docs/AUDITORIA_READMES_2026-09-04.md). Precisiones que este README mantenía incorrectas y ahora quedan explícitas:
>
> - **El motor agronómico opera sin conexión; el dato meteorológico no.** La consulta pide seis fechas contando hoy y muestra **los cinco días posteriores**, con fechas locales y valores faltantes explícitos; devuelve `null` si falla la red; su integración está descrita en `docs/INFORME%201%20.docx.md#integracion-bme280`.
> - **BME280 incluido y obligatorio:** temperatura del aire, humedad relativa y presión local para tres celdas del grid 2×5. La API gratuita complementa la lectura con el pronóstico de cinco días. Ver [contrato y estado de integración](../docs/INFORME%201%20.docx.md#integracion-bme280). El decodificador incluye soporte v1; el Grid está implementado y queda pendiente la validación física.
> - **N, P y K se muestran como registros numéricos informativos sin validar**, sin prescribir fertilización ni afirmar selectividad química.
> - **El motor no calcula dosis de cal en kg/ha ni costos por hectárea.** Esas salidas se retiraron.
> - **El tiempo de respuesta extremo a extremo no está medido.** No citar «5 segundos».
> - **Probar BLE exige un build nativo**; `npm run android` no lo compila.

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
  - [4.4. Historial de mediciones](#44-historial-de-mediciones)
- [5. Motor Agronómico y Reglas de Decisión](#5-motor-agronómico-y-reglas-de-decisión)
  - [5.1. Etapas Fenológicas Obligatorias](#51-etapas-fenológicas-obligatorias)
  - [5.2. Tratamiento de N, P y K: por qué no se muestran como medida](#52-tratamiento-de-n-p-y-k-por-qué-no-se-muestran-como-medida)
  - [5.3. Código de Colores Semáforo y Desglose Interactivo](#53-código-de-colores-semáforo-y-desglose-interactivo)
- [6. Enlace BLE con la Sonda (Protocolo GATT)](#6-enlace-ble-con-la-sonda-protocolo-gatt)
- [7. Sincronización Idempotente en Cola](#7-sincronización-idempotente-en-cola)
- [8. Variables de Entorno](#8-variables-de-entorno)
- [9. Comandos de Desarrollo y Pruebas](#9-comandos-de-desarrollo-y-pruebas)
- [10. Decisiones Arquitectónicas que Conviene Preservar](#10-decisiones-arquitectónicas-que-conviene-preservar)
- [11. 🛠️ Manual de Instalación de Herramientas](#manual-instalacion-herramientas)
- [12. Pendientes abiertos](#12-pendientes-abiertos)

---

## 1. Flujo de Usuario y Capacidades Clave

1. **Carrusel de Bienvenida (`WelcomeCarouselScreen`):** Tres tarjetas informativas (*Quiénes somos*, *Qué hacemos* y *Por qué lo hacemos*) antes de ingresar a la cuenta.
2. **Acceso y Recuperación de Clave:** Inicio de sesión, registro y recuperación por código de correo, con `EmailCodeScreen` y `ResetPasswordScreen`. El deep link nativo se conserva para correos antiguos.
3. **Permisos (`PermissionsScreen`):** Después de iniciar sesión o confirmar la cuenta y antes de vincular equipos, explica Bluetooth, ubicación, cámara y notificaciones. Cada solicitud es voluntaria y explícita; continuar registra la revisión, no concede permisos.
4. **Onboarding Dual de Equipos:**
   - **Primer Propietario (Owner):** Vinculación física por BLE con grabación del código de 15 dígitos en la memoria NVS del ESP32 y registro atómico en Supabase (`register_paired_device`).
   - **Usuarios:** escanean el QR temporal mostrado por cualquier miembro aprobado o ingresan su código de invitación en el onboarding. Quedan en una pantalla de espera hasta que el administrador apruebe su ingreso. El QR y su código vencen juntos; el ID permanente no concede acceso.
5. **Dashboard Principal:** Punto de inicio rápido con botón destacado **Iniciar Medición** y acceso al historial.
6. **Selección Obligatoria de Fase Fenológica:** Al pulsar medir, el usuario debe seleccionar una de las 4 etapas productivas:
   - **Pre-siembra (Siembra)**
   - **Vegetativo**
   - **Floración**
   - **Cosecha**
7. **Captura BLE y meteorológica:** Recordatorio preventivo de limpieza de electrodos (`CalibrationReminderModal`), conexión por BLE a la sonda, lectura de la trama GATT (16 o 20 bytes según su versión) y consulta meteorológica. La consulta requiere red y no tiene caché: si falla, la medición se registra igual y el diagnóstico se emite **sin contexto climático**.
8. **Carrusel de Resultados Post-Medición:**
   - **Página 1 (Grid 2×5 Semáforo):** Cuadrícula con las variables medidas en verde (óptimo), naranjo (precaución) y rojo (riesgo). Al tocar cualquier parámetro, se despliega una explicación detallada con advertencias, causas y acciones concretas para mejorarlo según la fase activa.
   - **Página 2 (Recomendación Integral Globalizada):** Diagnóstico de conjunto que combina suelo, etapa del cultivo y pronóstico del clima (olas de calor, heladas, lluvias, qué sembrar o cuidados de la planta en crecimiento). Aquí finaliza el carrusel para Vegetativo, Floración y Cosecha.
9. **Historial de Mediciones (`HistoryScreen`):** Lista cronológica de todas las etapas, con filtros, estado de sincronización y detalle del diagnóstico. No incluye visualización cartográfica.

---

## 2. Principio Rector: Offline-First

El agricultor agrícola opera habitualmente en zonas rurales sin conectividad celular 4G/5G. La aplicación garantiza **total autonomía operativa en terreno**:

| Escenario en Terreno | Comportamiento del Sistema |
| :--- | :--- |
| **Sin Conexión a Internet** | La app inicia desde la caché persistente de Zustand/AsyncStorage (`useAuthStore`). Conecta por BLE, evalúa el suelo localmente, genera la recomendación, guarda la lectura y la encola con un `client_uuid` único. |
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
├── package.json                        # Dependencias (React Native 0.86, Expo SDK 57, Zustand)
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
│   │   ├── OnboardingScreen.tsx        # Alta BLE de administrador o solicitud mediante QR
│   │   ├── DashboardScreen.tsx         # Pantalla principal con botón central "Medir"
│   │   ├── MeasureScreen.tsx           # Selección de fase → BLE → Carrusel de 2 ó 3 páginas
│   │   ├── HistoryScreen.tsx           # Historial cronológico y detalle de las cuatro etapas
│   │   ├── DevicesScreen.tsx           # Gestión de equipos vinculados y roles
│   │   └── FieldSettingsScreen.tsx     # Cuenta, equipos y preferencias
│   ├── components/
│   │   ├── CalibrationReminderModal.tsx # Modal que recuerda limpiar electrodos de la sonda
│   │   ├── OfflineBanner.tsx           # Barra discreta ante corte de internet
│   │   ├── ScreenGuide.tsx             # Botón '?' con guía de uso por pantalla
│   │   └── MeasurementDetailModal.tsx  # Modal detallado con badge de sincronización
│   ├── services/
│   │   ├── bleService.ts               # Escaneo BLE, conexión GATT notify y desconexión segura
│   │   ├── probeService.ts             # Decodificación de trama BLE v0/v1 Big-Endian
│   │   ├── measurementsService.ts      # Cola offline en AsyncStorage y sincronización Supabase
│   │   ├── deviceService.ts            # Registro y gestión de membresías de equipos
│   │   ├── onboardingService.ts        # Persistencia de estado de onboarding en Supabase
│   │   ├── preferencesService.ts       # Preferencias de usuario locales y en la nube
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
├── tests/                              # 25 pruebas unitarias automatizadas con Node tsx
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

### Avance de interfaz y datos · 5 de septiembre de 2026

- Inicio renovado con última lectura real, acceso a equipos, estado de respaldo y acceso al historial; sin métricas de ejemplo. Se adapta a tema claro/oscuro y español/inglés.
- Navegación inferior persistente entre Inicio, Historial y Ajustes. Se oculta durante la medición y el onboarding.
- Historial con actualización al deslizar, estados de carga/error, filtros táctiles de 48 dp y etiqueta de respaldo por lectura.
- Caché del historial consultado (hasta 200 lecturas por consulta), aislada por cuenta y equipo. Sin red se combina con la cola pendiente; los registros confirmados se identifican también por `client_uuid` para evitar duplicados visuales. No equivale a descargar todo el historial. La app no crea ni selecciona campos: consulta las lecturas sin filtrar por `field_name` y envía ese atributo vacío en nuevas mediciones por compatibilidad con el esquema. Los nombres de registros anteriores se conservan; los cachés antiguos por campo se recuperan cuando aún no existe el caché unificado del equipo.
- Bienvenida desplazable en pantallas pequeñas y selector de etapa en tarjetas de ancho completo con estado accesible.

**Compatibilidad con Supabase:** estos cambios reutilizan columnas existentes; no agregan migraciones. La consulta incluye `client_uuid`. La revisión remota mediante `supabase migration list --linked` confirmó dos versiones solo remotas (`20260902180000`, `20260902210000`) y la versión `20260904120000` solo local. Antes de desplegar esta última hay que recuperar el SQL original de las versiones remotas, revisar el historial y probar la migración en staging. No se reparó ni alteró el historial remoto.

**Validación pendiente en dispositivo:** aspecto visual, lectores de pantalla, tamaños de letra ampliados, navegación Android y conexión BLE física. La interfaz BME280 y el pronóstico de cinco días están implementados; la recepción física y el comportamiento Android/iOS requieren pruebas en terreno.

**Comprobaciones al 6 de septiembre de 2026, sobre Expo SDK 57:** TypeScript 6 sin errores, 44 pruebas aprobadas y exportación Android completa (1600 módulos, 3,3 MB).

**Comprobaciones de la entrega anterior, sobre SDK 54:** TypeScript sin errores y 28 pruebas aprobadas. El runner habitual encontró `spawn EPERM` en el entorno restringido; se ejecutaron las mismas pruebas en un único proceso con transpilación TypeScript. La generación de bytecode Hermes también encontró `spawn EPERM`; esto no valida un APK ni sustituye las pruebas físicas.

La exportación JavaScript Android de diagnóstico sí finalizó correctamente (1600 módulos): `node node_modules/expo/bin/cli export --platform android --output-dir dist-review --max-workers 1 --no-bytecode`. El resultado local está en `App/dist-review`; no es un instalador.

### Confirmación de cuenta: qué falta desplegar

El registro y la recuperación solicitan correos cuyo código se ingresa en la app.
Primero hay que distribuir los clientes compatibles y después aplicar las
[plantillas y límites de Supabase](../supabase/README.md#7-plantillas-de-correo).
La página web `/cuenta-confirmada` y el deep link de recuperación se conservan solo
para enlaces antiguos; los correos nuevos ya no los incluyen. La entrega real de
correo y el recorrido en un teléfono deben verificarse contra el proyecto remoto.

> [!NOTE]
> `supabase/README.md §7` afirma que tener las plantillas de correo activas en `config.toml` hace
> fallar cualquier `supabase config push` en plan gratuito. **El 6-sep-2026 eso ya no ocurre:** el
> push se aplicó con las plantillas activas. Ese aviso está desactualizado. En el mismo push se
> corrigieron de paso el remitente y el correo de administración, que seguían apuntando a Akura.

### Atajo de desarrollo: entrar sin vincular sonda

`deriveOnboardingState` decide el acceso con una regla simple: **la membresía visible manda**. Sin
equipos no se pasa del onboarding. Es lo correcto en producción, pero en desarrollo obliga a
emparejar una sonda física sólo para ver una pantalla.

En el paso de elección del onboarding, **diez pulsaciones en el logo TerraSense** permiten
entrar a Dashboard. Sólo está habilitado en desarrollo y la activación se guarda por cuenta.
**No inventa un equipo:** la app entra con `device` en `null`, muestra el aviso de desarrollo
sin sonda y su acción principal lleva a vincular un equipo. No crea mediciones.

Para volver al flujo normal, **cerrar sesión**: `clearDevSkip()` corre ahí.

> [!WARNING]
> Es temporal. La lectura y activación de `src/utils/devSkipOnboarding.ts` comprueban `__DEV__`,
> y el logo sólo recibe el gesto en desarrollo. Una marca guardada no habilita producción.
> **Retirarlo** cuando el
> emparejamiento pueda probarse contra hardware real.

### Metro dice que un archivo «no existe» y el archivo está ahí

Síntoma: `expo start` o `expo export` fallan con `Unable to resolve module ./src/hooks/useAppTheme`
y, debajo, `None of these files exist: src\hooks\useAppTheme(.ts|.tsx|…)`. El archivo existe, se abre
en el editor y `tsc` lo compila sin quejarse. Puede señalar a un archivo propio o a uno de
`node_modules`, y cada vez que se arregla uno aparece el siguiente.

**Causa: el repositorio vive dentro de OneDrive.** Los archivos sincronizados llevan un *reparse
point* de Windows, y `fs.readdir(…, {withFileTypes: true})` los reporta como enlaces simbólicos
aunque `lstat` diga que son archivos normales:

```text
useAppTheme.ts             isFile: false | isSymbolicLink: true
useMeasurementHistory.ts   isFile: true  | isSymbolicLink: false
```

El rastreador de Metro se guía por `readdir`, los toma por enlaces, intenta resolver un destino que
no existe y los deja fuera de su mapa de archivos. Node, TypeScript y el explorador de Windows usan
`stat` y no ven ningún problema, y de ahí que el error parezca imposible. El archivo que se salva en
el ejemplo —`useMeasurementHistory.ts`— es simplemente el que se editó hace poco: al reescribirlo
dejó de tener el *reparse point*.

**Solución inmediata:** reescribir los archivos afectados byte a byte, lo que los devuelve a ser
archivos planos. Desde `App/`:

```bash
node -e "const fs=require('fs'),path=require('path');(function r(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(e.name!=='node_modules'&&e.name!=='.git')r(p);continue}if(!e.isSymbolicLink()||!fs.lstatSync(p).isFile())continue;const b=fs.readFileSync(p);fs.writeFileSync(p+'.tmp',b);fs.rmSync(p);fs.renameSync(p+'.tmp',p)}})('.')"
npx expo export --platform android --output-dir dist-review --no-bytecode --clear
```

Si el archivo que falla está en `node_modules`, basta `rm -rf node_modules && npm install`: los que
npm acaba de escribir nacen planos.

> [!IMPORTANT]
> **Esto vuelve a ocurrir.** OneDrive rehace los marcadores cuando le conviene, así que el fallo
> reaparece sin que nadie toque el código y siempre en un archivo distinto. La única solución estable
> es **sacar el repositorio de la carpeta de OneDrive** —por ejemplo a `C:\dev\`— o excluir esa
> carpeta de la sincronización. Mientras siga dentro, conviene al menos reconocer el síntoma: si
> Metro no encuentra un archivo que existe, no es un problema del SDK ni del código.

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
          ┌───────────────────────┐
          │   PermissionsScreen   │ ◄── Paso 3: revisión explícita
          │ Bluetooth/GPS/QR/Avisos│     de permisos del sistema
          └───────────┬───────────┘
                      │ (Revisión completada)
                      ▼
           ¿Tiene equipo vinculado?
               ├── NO ──► ┌──────────────────┐
               │          │ OnboardingScreen │ ── Modo Propietario (BLE Pairing)
               │          │  (Paso único)    │ ── Usuario (QR temporal y aprobación)
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
          │ Pág 1: Grid 2×5       │ (Semáforo interactivo con advertencias)
          │ Pág 2: Recomendación  │ (Diagnóstico conjunto suelo + clima)
          └───────────────────────┘
```

### 4.1. Bienvenida y Autenticación

[App.tsx](App.tsx) dirige el acceso mediante [resolveEntryRoute](src/utils/authFlow.ts).
El orden normal es **bienvenida → acceso/confirmación → permisos (paso 3) → vinculación
→ aplicación**. La recuperación de contraseña tiene prioridad sobre estos pasos:
una sesión de recuperación no abre permisos ni la aplicación operativa.

- **Bienvenida:** [WelcomeCarouselScreen](src/screens/WelcomeCarouselScreen.tsx) muestra
  tres páginas. «Saltar» y «Comenzar» guardan su finalización en este dispositivo;
  tener sesión no basta por sí solo para omitirla.
- **Acceso y registro:** [AuthScreen](src/screens/AuthScreen.tsx) valida los campos,
  bloquea envíos duplicados y solicita el consentimiento antes de crear la cuenta.
  Una cuenta sin confirmar abre [EmailCodeScreen](src/screens/EmailCodeScreen.tsx),
  que verifica el código y permite reenviarlo con espera. El código se escribe en seis
  casillas que sólo admiten dígitos: cada uno queda enmascarado tras verse un instante,
  y al completar el sexto la verificación se dispara sola, sin repetir un código que el
  servidor acaba de rechazar. El botón «Verificar código» se conserva para reintentar.
  Registro y verificación requieren conexión; la sesión previamente restaurada permite
  continuidad sin red.
- **Recuperación:** el código de propósito `recovery` o un enlace antiguo válido
  conduce a [ResetPasswordScreen](src/screens/ResetPasswordScreen.tsx). Se valida la
  sesión del enlace antes de habilitar el cambio, se conserva la cuenta en recuperación
  al reiniciar y se cierra sesión al terminar o cancelar. Los fallos transitorios de
  red no equivalen a una cuenta eliminada.

#### Paso 3: preparar permisos del teléfono

[PermissionsScreen](src/screens/PermissionsScreen.tsx) aparece tras el login o la
confirmación de cuenta, antes de revisar el resultado del onboarding de equipos.
También se muestra a cuentas existentes que aún no hayan revisado esta etapa en ese
teléfono. Reutiliza la paleta y los componentes del flujo inicial.

| Permiso | Para qué se utiliza | Si no se concede |
| --- | --- | --- |
| Bluetooth / dispositivos cercanos | Encontrar y comunicarse con la sonda | Permite continuar, pero la búsqueda y las mediciones requieren habilitarlo. Autorizarlo no enciende la radio. |
| Ubicación en primer plano | Coordenadas de las mediciones y pronóstico del campo | En Android 12+ e iOS, permite medir sin coordenadas ni pronóstico. Android anterior a 12 también la requiere para buscar la sonda por Bluetooth. |
| Cámara | Escanear invitaciones QR a equipos compartidos | No se puede escanear; la configuración de una sonda nueva por Bluetooth sigue disponible. |
| Notificaciones | Avisos de equipos, accesos y alertas habilitadas | La app sigue funcionando; no recibe esos avisos push. |

Los botones «Permitir» abren las solicitudes del sistema de una en una. Cuando el
sistema impide volver a preguntar, la pantalla ofrece «Abrir ajustes» y vuelve a
consultar al regresar. **«Continuar» no concede permisos ni exige autorizarlos todos**.
No se solicita ubicación en segundo plano, micrófono, contactos ni acceso a archivos.
La cámara se configura sin permiso de audio, porque el QR no lo utiliza.

[permissionsService.ts](src/services/permissionsService.ts) consulta el estado real
sin solicitar permisos al montar la pantalla. En iOS, inicializar Bluetooth puede
mostrar el diálogo nativo; por eso su primera comprobación se hace al tocar el botón.
Un estado apagado, rechazado o no disponible se presenta por separado. Las funciones
que usan cámara, ubicación y sonda conservan sus comprobaciones al utilizarlas.

La marca `@terrasense/permissions-review-v1/<userId>` sólo recuerda que se revisó la
explicación **por cuenta y dispositivo**. No almacena ni sustituye autorizaciones del
sistema. Cambiar de cuenta no hereda la revisión de otra persona. Si falla la lectura,
se muestra la etapa; si falla el guardado, se permite continuar sólo en la sesión actual.
Una revocación posterior se atiende cuando se vuelve a utilizar la función afectada.

`resolveEntryRoute` mantiene esta precedencia: carga inicial → recuperación → bienvenida
→ acceso → carga de la marca de permisos → permisos pendientes → resultado de onboarding.
Una cuenta con equipo autorizado tampoco salta esta explicación la primera vez. Las
solicitudes pendientes de otros equipos no bloquean uno ya autorizado.

El registro automático de push usa `requestPermission: false`: no vuelve a pedir
notificaciones después de omitirlas. Sólo registra una autorización ya concedida y
respeta las preferencias de avisos, incluso mientras se espera aprobación de un equipo.
Los canales Android se preparan antes de una solicitud explícita, conforme a la
[documentación de Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/).
El plugin [withStartupPermissions](plugins/withStartupPermissions.js) declara el escaneo
como `neverForLocation`, conservando ubicación para georreferenciar; ver el
[contrato de permisos BLE](https://github.com/dotintent/react-native-ble-plx/blob/master/docs/GETTING_STARTED.md).
**Los cambios de permisos nativos requieren reconstruir e instalar el cliente de desarrollo**;
recargar JavaScript no actualiza el manifiesto ni los mensajes del sistema.

#### Continuidad visual y verificación

Mantener los tokens de [theme.ts](src/constants/theme.ts) y reutilizar
[AuthUI.tsx](src/components/auth/AuthUI.tsx): fondo suave, verde bosque, etiquetas
permanentes, márgenes de 24, formularios de ancho máximo 520 y botones de altura mínima
56. La pantalla conserva las animaciones y respuesta háptica incorporadas; sus
transiciones respetan la preferencia del sistema para reducir movimiento. Estados
concedidos/rechazados siempre incluyen texto y no dependen sólo del color.

[authFlow.test.ts](tests/authFlow.test.ts) cubre la precedencia y el aislamiento entre
cuentas; [permissions.test.ts](tests/permissions.test.ts) comprueba estados, persistencia,
fallos de almacenamiento y configuración del escaneo. Ejecutar `npm test` y
`npm run type-check` desde `App/`, además de `python docs/verificar_documentacion.py`
desde la raíz. La lista de tareas y el punto para retomar están en
[TASK_PERMISSIONS.md](TASK_PERMISSIONS.md).

Los diálogos reales, rechazos definitivos, regreso desde Ajustes, Bluetooth apagado y
ubicación aproximada requieren validación en un teléfono Android/iOS. Las pruebas
locales no certifican esas interacciones ni el envío de correo/push del servicio desplegado.

### 4.2. Onboarding y Gobernanza de Equipos
* **`OnboardingScreen`**: Detecta automáticamente el tipo de usuario:
  1. **Primer administrador (`admin`):** empareja la sonda por BLE y registra el ID con `register_paired_device`. Sólo obtiene administración si ese equipo no tiene miembros.
  2. **Usuario (`user`):** escanea un QR temporal y queda pendiente. El administrador recibe un aviso push para revisar la solicitud en **Ajustes → Administración**. La espera muestra sus iniciales de nombre/correo censuradas desde el servidor.

Ambos roles pueden operar el equipo y mostrar el QR. Sólo el administrador ve Administración, donde aprueba, elimina o delega; al delegar pasa a usuario. [Contrato y despliegue de administración](../supabase/ADMINISTRACION.md).

### 4.3. Flujo de Medición: Selección de Fase y Carrusel Post-Medición

El proceso de medición sigue una secuencia rigurosa y pedagógica:

1. **Selección de Fase Fenológica:** Al presionar "Medir", la interfaz exige seleccionar una de las cuatro etapas del ciclo:
   - **Pre-siembra (Siembra)**
   - **Vegetativo**
   - **Floración**
   - **Cosecha**
2. **Preparación y Captura Física:**
   - Se muestra el modal recordatorio `CalibrationReminderModal` sugiriendo limpiar y secar los electrodos de acero inoxidable.
   - La app escanea el anuncio `TerraSense-<device_code>`, conecta vía BLE, captura la trama BLE y consulta el clima en Open-Meteo.
   - Desconecta inmediatamente el enlace BLE para proteger la batería del ESP32.
3. **Página 1 del Carrusel · Grid 2×5 Semáforo Interactivo:**
   - Muestra cada una de las variables medidas con su valor numérico y el color de semáforo correspondiente:
     - **🟢 Verde:** Perfecto / Condición favorable.
     - **🟡 Naranjo:** Precaución / Requiere atención o ajuste preventivo.
     - **🔴 Rojo:** Riesgo / Condición limitante que puede generar daño o pérdida.
   - **Interactividad al Tocar:** Al pulsar cualquier parámetro (por ejemplo, si la humedad del suelo está en rojo), se abre una tarjeta modal con advertencias específicas:
     - Por qué el parámetro está en ese nivel.
     - Qué riesgos implica para la fase seleccionada.
     - Qué acciones de manejo o fertirriego realizar para mejorarlo.
4. **Página 2 del Carrusel · Recomendación Integral Globalizada:**
   - Entrega un diagnóstico agronómico de conjunto combinando todos los parámetros del suelo, la fase elegida y el pronóstico del tiempo (alertas de lluvias, olas de calor o heladas).
   - En **Siembra**: Detalla qué cultivos conviene sembrar y cuáles no, y precauciones ante eventos climáticos inmediatos.
   - En **Vegetativo / Floración / Cosecha**: Alertas climáticas de apoyo y cuidados específicos para la planta en desarrollo.
   - **Aquí concluye el carrusel en las cuatro fases.** No hay una tercera página: la app no dibuja mapas.
### 4.4. Historial de mediciones

`HistoryScreen` conserva las cuatro etapas, fechas, valores, diagnóstico y estado local/nube.
Cada fila abre `MeasurementDetailModal`. La navegación principal contiene Inicio, Historial
y Ajustes: no hay mapas, perímetros, círculos ni accesos cartográficos en los resultados.
La ubicación sigue siendo opcional para coordenadas de las lecturas y consulta meteorológica.
La sincronización automática depende de `OfflineBanner`, no de abrir una pantalla de mapa.

### 4.5. Ajustes, perfil y dispositivos

Ajustes organiza las opciones en submenús: Mi perfil, Mis dispositivos, Notificaciones,
Actualizaciones, Idioma, Apariencia, Permisos del teléfono, Datos y sincronización,
Contacto y Acerca de y privacidad. Administración del equipo sólo aparece para quien
administra al menos un equipo; el servidor verifica el rol para cada operación.
La configuración del campo ya no forma parte de Ajustes. Cerrar sesión es una acción
separada al final, en rojo, con aviso si quedan mediciones pendientes.

- **Perfil:** nombre y apellido desde `profiles`, correo y verificación desde Auth;
  cambio de contraseña con comprobación de la contraseña actual y las mismas reglas del registro.
- **Dispositivos:** selección, rol, última conexión, firmware informado, batería cuando
  está disponible, registro BLE y QR temporal. El ID permanente no sustituye una invitación.
- **Preferencias:** español/inglés, unidades y tema claro/oscuro/sistema. Se guardan por
  cuenta en el teléfono; los cambios remotos pendientes se reintentan al recuperar conexión.
- **Notificaciones:** interruptores independientes de suelo, equipo, clima y sincronización.
  Cambiar idioma o una preferencia no abre diálogos del sistema. Los avisos de firmware
  se consultan en Actualizaciones; la migración desactiva su emisión push desde soporte.
- **Permisos:** estado y explicación de Bluetooth, ubicación, cámara y notificaciones;
  solicitud explícita o acceso a Ajustes del teléfono y actualización del estado al volver.
  La app no puede revocar permisos del sistema mediante un interruptor propio.
- **Sincronización:** pendientes y último envío confirmado desde este teléfono, con reintento.
  No se inventa una fecha de respaldo para datos que el servidor no confirmó.
- **Contacto:** `mailto:akurasoporte@gmail.com`, asunto «Soporte TerraSense» y cuerpo editable;
  alternativa para copiar el correo. El usuario envía el mensaje desde su cliente de correo.
- **Privacidad:** versión de la app y los mismos textos del registro, sin exigir aceptarlos
  otra vez. El texto ya identifica al responsable, el correo para ejercer derechos y el plazo
  de conservación; el borrado automático al mes todavía no está implementado en el servidor.

Se conserva la paleta verde/tierra del tema existente. Las pantallas usan tarjetas de
18 px de radio, títulos de 30 px, espacio horizontal de 24 px y acciones de al menos 48 px.
El color rojo identifica cierre de sesión y borrado; las acciones incluyen texto explícito.

#### Preparar equipo para otro propietario

Es la última opción de Administración. Primero muestra el alcance irreversible; después
exige el código completo y reautenticación con contraseña. La RPC
`prepare_device_for_owner` comprueba administración bajo bloqueo de fila y una autenticación
con contraseña de los últimos cinco minutos. Borra mediciones, miembros, solicitudes,
invitaciones, avisos y configuración remota del equipo; conserva identidad y firmware.
La auditoría administrativa permanece separada del historial de mediciones.

Cada restablecimiento incrementa `data_generation`. El servidor rechaza lecturas de una
generación anterior aunque un antiguo miembro vuelva a obtener acceso. El borrado del panel de soporte comparte la invalidación de generaciones. Los teléfonos
eliminan colas antiguas y cachés afectadas al reconectar; no es posible borrar a distancia
una copia en un teléfono que permanece sin conexión. Las cachés de otros equipos se
conservan; la caché agregada se invalida para no mostrar lecturas del equipo borrado.

**No es un borrado de la memoria física del ESP32.** Esa operación necesita un contrato
del firmware que no está disponible. Además, tras el borrado la reclamación automática
por código permanente queda bloqueada: soporte debe verificar la entrega y habilitar al
nuevo propietario. El código conocido por un antiguo miembro no prueba posesión física.
La UI explica estos límites antes de la segunda confirmación.

#### Actualizaciones del firmware ESP32

El centro consulta `check_firmware_update`, muestra la versión informada y las notas de
la versión compatible publicada. No instala actualizaciones de la app.
La instalación de firmware y su barra de progreso real quedan pendientes del protocolo
ESP32: transporte, integridad, compatibilidad, batería y recuperación de interrupciones.
La interfaz informa que no se ha descargado ni instalado un archivo; no simula progreso.

#### Despliegue y validación pendientes

Aplicar primero la migración
[`20260920120000_preparar_equipo_propietario.sql`](../supabase/migrations/20260920120000_preparar_equipo_propietario.sql),
que añade generaciones, avisos de invalidación, la RPC de preparación y protección de
reclamación, además de retirar los pushes de firmware. Esta versión de la app consulta
las columnas nuevas; requiere esa migración antes de distribuirse.
La migración está preparada localmente, no aplicada al servidor. Falta validar en una
base de pruebas sus permisos, concurrencia, rechazo de colas antiguas, transferencia,
reclamación y restauración ante fallos. También falta probar los controles en Android/iOS.
El seguimiento vigente está en [TASK_PERMISSIONS.md](TASK_PERMISSIONS.md).

---

## 5. Motor Agronómico y Reglas de Decisión

El motor agronómico (`agronomyEngine.ts` + `stageEvaluator.ts` + `contextualAdvice.ts`) es un sistema experto determinista basado en relaciones biofísicas de suelo-planta:

### 5.1. Etapas Fenológicas Obligatorias

| Etapa Fenológica | Variables Críticas | Comportamiento del Motor |
| :--- | :--- | :--- |
| **Pre-siembra (Siembra)** | Temperatura, CE, pH, Humedad | Evalúa aptitud de cama de siembra; alerta si el suelo está frío para germinar o si la salinidad dañará la plántula. |
| **Vegetativo** | Nitrógeno (N), Humedad, CE | Monitorea la disponibilidad de N para el desarrollo foliar y la actividad fotosintética; alerta sobre excesos que promuevan hongos. |
| **Floración** | CE, Fósforo (P), Potasio (K) | El umbral de salinidad máxima se reduce automáticamente al **80% del valor estándar**, ya que el estrés osmótico provoca aborto floral masivo. |
| **Cosecha** | Humedad VWC, Potasio (K) | Evalúa transitabilidad de maquinaria para evitar compactación severa del suelo y analiza concentración de potasio para calidad de fruto. |

### 5.2. Tratamiento de N, P y K: por qué no se muestran como medida
La sonda mide **conductividad eléctrica y temperatura**. Los tres registros asociados a nitrógeno, fósforo y potasio se derivan de esa conductividad mediante un modelo empírico del fabricante.

**Una lectura de conductividad no identifica concentraciones independientes de N, P y K.** Esto es cierto en todo el rango de uso, no solo en suelo salino — [la propia documentación de Bluelab distingue el seguimiento por conductividad del análisis de nutrientes individuales](https://support.bluelab.com/hc/en-us/articles/360001103995-understanding-nutrient-measurements-with-the-pulse-meter). Por eso:

1. **La app no presenta N, P ni K como cifras interpretables en ningún caso.** No es un enmascaramiento condicional: es la regla general.
2. Cuando la conductividad es alta **y** al menos uno de los tres registros es elevado, la lectura se marca como de **baja confianza** y queda **excluida del veredicto**. Esta salvaguarda es **parcial, no una validación analítica**.
3. **El motor no emite dosis de fertilizante ni de enmienda a partir de esos registros.** La antigua recomendación de «lavado» con fracción fija y la dosis de cal en kg/ha derivada del pH se eliminaron: no incorporaban capacidad tampón, acidez de reserva, profundidad efectiva ni poder neutralizante del material.

**Para decisiones de fertilización y encalado corresponde un análisis de laboratorio.** Una lectura instantánea no equivale a un análisis representativo del campo.

### 5.3. Código de Colores Semáforo y Desglose Interactivo
El Grid 2×5 de la primera página del carrusel utiliza el código de colores universal:
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

### Estructura de la trama BLE, big-endian

Esta tabla refleja lo que `probeService.ts` decodifica realmente. El aviso anterior se refería a diferencias entre documentos, no a un error inevitable del envío BLE. Si el sensor usa otro mapa o escala, el firmware debe convertirlo a este contrato. La trama Modbus de la sonda y la notificación BLE del teléfono son diferentes: [explicación byte a byte y ejemplo completo](../docs/CONTRATO_BLE.md).

```text
[0..1]   Humedad volumétrica (VWC × 10)        -> uint16
[2..3]   Temperatura de suelo (°C × 10)        -> int16   (admite bajo 0 °C)
[4..5]   Conductividad eléctrica (µS/cm)       -> uint16
[6..7]   pH (× 10)                             -> uint16  (NO ×100)
[8..9]   Nitrógeno (mg/kg)                     -> uint16
[10..11] Fósforo (mg/kg)                       -> uint16
[12..13] Potasio (mg/kg)                       -> uint16
[14]     Batería (porcentaje 0–100)            -> uint8   (NO voltaje uint16)
[15]     Identificador de formato: 1 = 20 bytes (producto); 0 = 16 bytes (prototipo sin BME280)
[16..19] Solo en v1 - ambiente BME280 en 32 bits empaquetados:
         temperatura del aire  12 bits  (C x 10) + 400   -> -40,0 a +125,0 C
         presion               12 bits  hPa - 300        -> 300 a 1100 hPa
         humedad relativa       8 bits  % x 2            -> 0 a 100,0 %
         Todos los bits a uno = el sensor no entrego dato -> NULL en la base
```

**No hay firmware fuente en el repositorio** y el mapa de registros de la sonda **no está confirmado contra la ficha del proveedor**. Antes de fabricar hace falta una captura BLE/Modbus real del SKU adquirido.

> [!CAUTION]
> **Desconexión BLE obligatoria:** `bleService.ts` siempre ejecuta `cancelConnection()` dentro de un bloque `finally`. Si la conexión quedara activa, el ESP32 no podría entrar en *deep sleep* y el consumo se dispararía. La cifra de «12 a 18 meses de autonomía» **se retira**: el balance energético publicado omitía el consumo de la propia conexión BLE y no considera reconexiones, eficiencia del conversor, autodescarga ni pérdida de capacidad. **La autonomía debe medirse desde la batería, no estimarse.**

---

## 7. Sincronización Idempotente en Cola

El servicio `measurementsService.ts` opera bajo un esquema **Store & Forward**:

1. **Generación de `client_uuid`:** Al concluir la medición, se genera un identificador único antes de cualquier intento de red.
2. **Escritura Local Inmediata:** La medición se almacena de inmediato en `AsyncStorage` en la cola del usuario autenticado.
3. **Envío Idempotente:** Al contar con cobertura, se realiza un `upsert` a Supabase contra el índice único de `client_uuid`.
4. **Reintentos:** Si no hay señal, la lectura permanece en el almacenamiento del teléfono. `flushQueue()` se ejecuta con **exclusión mutua por cuenta** (`utils/keyedLock.ts`) y elimina de la cola **solo tras el acuse del servidor**.

   El disparador es global: `OfflineBanner` comprueba conectividad cada 20 s y cada vez que la app vuelve a primer plano, y vacía la cola al detectar red. **Solo actúa con la app en primer plano** (`AppState === 'active'`): no hay sincronización en segundo plano.
5. **Sin GPS:** las mediciones sin coordenadas se guardan en el historial local sin coordenadas. La migración que lo permite en el servidor está preparada pero **debe aplicarse y probarse en staging**.

**Pendiente de verificación:** prueba extremo a extremo de cortes de red, cierre del proceso y cambio de cuenta.

---

## 8. Variables de Entorno

Crear el archivo `App/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://bjmhjatykqccksddgtmo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_publica
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

# Levanta el servidor Metro y pide abrir Android. NO compila el modulo nativo BLE:
# para probar la sonda real hay que generar un development build o un build de release.
npm run android

# Chequeo estricto de tipos de TypeScript
npm run type-check

# 25 pruebas unitarias (verificado: 25/25 aprobadas)
npm test

# Verificación E2E remota contra Supabase
npm run test:supabase-onboarding

# Compilación de prueba para verificar empaquetado Android
npx expo export --platform android
```

### Verificación en dispositivo — pendiente

Las 25 pruebas automatizadas cubren lógica pura: decodificación de la trama BLE, exclusión mutua de la cola offline, estado de onboarding y preferencias. **Lo siguiente solo puede comprobarse en un teléfono físico con la sonda, y aún no se ha hecho:**

| Escenario | Qué debe ocurrir |
| :--- | :--- |
| Corte de red durante el guardado | La medición queda en la cola local y el banner indica trabajo sin conexión |
| Recuperación de cobertura | La cola se vacía sin duplicar filas y el contador de pendientes baja |
| Cierre del proceso por Android con cola pendiente | Al reabrir, las mediciones siguen en la cola y se envían |
| Cambio de cuenta con cola pendiente | La cola de la cuenta anterior **no** se envía con el usuario nuevo |
| Medición sin señal GPS | Se guarda en el historial sin coordenadas |
| Enlace BLE con la sonda real | La trama decodifica los valores esperados del SKU adquirido, y la v1 el ambiente del BME280 |

Los cuatro primeros dependen además de que la migración de [`supabase/`](../supabase/README.md) esté aplicada en staging.

---

## 10. Decisiones Arquitectónicas que Conviene Preservar

* **Ubicación bajo demanda (sin `ACCESS_BACKGROUND_LOCATION`):** La app solo solicita coordenadas GPS en el instante en que se ejecuta una medición, y no consume batería en segundo plano. **Esto es minimización de datos, no cumplimiento acreditado de la Ley 21.719**, que entra en vigencia el **1 de diciembre de 2026** y exige además bases de tratamiento, derechos de los titulares, política de retención, seguridad y reglas de transferencia internacional. [BCN: Ley 21.719](https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idParte=10527471&idVersion=2026-12-01).
* **Administración por equipo:** `admin` y `user` comparten las funciones normales de la app. Sólo `admin` administra membresías; al delegar pierde ese permiso. El acceso web depende exclusivamente de `admin_support_users`.

---

<a id="manual-instalacion-herramientas"></a>
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
`setx` sólo afecta a las consolas que se abran **después**; hay que cerrar y reabrir la terminal,
y Android Studio, para que las vean.

4. Crear `App/android/local.properties` con la ruta del SDK:
```properties
sdk.dir=C\:\\Users\\<usuario>\\AppData\\Local\\Android\\Sdk
```
Las barras invertidas y los dos puntos van escapados: es un archivo de propiedades de Java, no una
ruta normal. Este archivo está en `.gitignore` a propósito, porque la ruta cambia en cada equipo,
así que **no viene en el repositorio y hay que crearlo tras cada clonado**. Sin él, y sin
`ANDROID_HOME` en el entorno, Gradle falla al configurar el proyecto con
`SDK location not found`, antes de compilar nada.

> [!NOTE]
> Ese fallo **no aparece** en `App/android/build/reports/problems/problems-report.html`: ese
> informe sólo recoge advertencias de deprecación de Gradle. El error real se lee en la salida de
> compilación, bajo `* What went wrong`.

### 11.3. Dispositivo Físico para Pruebas BLE
> [!IMPORTANT]
> Los emuladores de Android **no emulan hardware Bluetooth Low Energy (BLE)** ni cámara física para escanear QR. Las pruebas de enlace con la sonda deben realizarse en un dispositivo Android físico conectado por USB con el modo de **Depuración por USB** activado.

---

## 12. Pendientes abiertos

Estado al **6 de septiembre de 2026**. Ninguno bloquea el desarrollo; los tres bloquean tener la app
lista para usuarios reales.

### 12.1. SMTP propio — los correos caen en spam

La configuración local declara SMTP propio. Su estado remoto y la entrega a bandeja
de entrada deben comprobarse; no se puede atribuir un problema de spam sin inspeccionar
el remitente y las cabeceras reales. Ver [configuración de correo](../supabase/README.md#7-plantillas-de-correo).

### 12.2. Rediseño de las pantallas del agricultor

**A medias.** Lo hecho es el pulido y los cimientos:

* `RadarScan` para la búsqueda por Bluetooth, en la medición y en el emparejamiento.
* `PasswordChecklist`, con las casillas que se marcan al escribir.
* `FadeIn` como primitiva de entrada compartida, aplicada de momento sólo a la cabecera de
  `AuthScreen`.

Los tres respetan la preferencia de *reducir movimiento* del sistema.

**Lo que falta** es el repaso visual propiamente dicho, sobre `OnboardingScreen`, `DevicesScreen`,
`MeasureScreen` y `DashboardScreen`: jerarquía tipográfica, ritmo de espaciados, y estados vacíos —
hoy son un párrafo de texto centrado donde debería haber una indicación de qué hacer a continuación.
Queda pendiente también extender `FadeIn` al resto de pantallas para que la transición entre ellas
sea coherente.

No se tocó la consola web: el rediseño acordado cubre sólo la app del agricultor.

### 12.3. Despliegue de la página de confirmación

La página se mantiene para compatibilidad con enlaces antiguos. El flujo vigente usa
códigos; falta publicar los clientes y verificar la configuración y el envío remoto,
según «Confirmación de cuenta: qué falta desplegar».

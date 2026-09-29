# 📱 TerraSense · Aplicación Móvil de Terreno

> Documentación de la aplicación móvil. El informe académico de la raíz contiene la ingeniería conceptual, la evaluación económica y el marco normativo del proyecto.

## Interfaz y captura

**Interfaz:** el primer inicio sigue **carga → idioma → carrusel → acceso**. Combina tipografía protagonista, verde bosque e ilustraciones de suelo y tecnología, con versiones clara y oscura.

- **Carga e idioma:** logo grande y rueda de carga; selección Español/English guardada antes de avanzar.
- **Carrusel:** tres composiciones SVG adaptadas al espacio que deja el texto, navegación horizontal, indicadores y acciones visibles.
- **Autenticación:** registro en dos pasos, campos con validación y acciones fuera del contenido desplazable. El contenedor contempla áreas seguras y teclado; conserva desplazamiento cuando el texto ampliado o el teclado reducen el espacio. Las transiciones respetan reducción de movimiento.
- **Onboarding de Equipos y Permisos:** Separación visual clara mediante tarjetas interactivas que responden a la presión con feedback háptico y escalas sutiles.

El Grid **2×5** muestra una tarjeta por variable, diez en total, en dos columnas. En pantallas de
menos de 360 px o con letra ampliada (escala sobre 1,3) pasa a una sola columna. El orden es el de
`PARAMETER_KEYS` en [`measurementPresentation.ts`](src/engine/measurementPresentation.ts):

| Fila | Columna 1 | Columna 2 |
|---|---|---|
| 1 | Humedad del suelo | Temperatura del suelo |
| 2 | pH del suelo | Conductividad eléctrica |
| 3 | Nitrógeno (N) | Fósforo (P) |
| 4 | Potasio (K) | Temperatura ambiente (BME280) |
| 5 | Humedad ambiente (BME280) | Presión atmosférica (BME280) |

N, P y K se muestran por separado como registros informativos rotulados **Sin validar**, sin atribuirles selectividad química ni prescribir dosis. Si falta una lectura ambiental, se indica su ausencia; no se sustituye por datos de internet. Batería, fecha de captura y completitud del ambiente van fuera de las tarjetas, y el pronóstico a cinco días aparte, sin bloquear la presentación ni el guardado local.

El mismo explorador ([`MeasurementExplorer`](src/components/MeasurementExplorer.tsx)) se usa en la medición, en el Inicio y en el detalle del historial. La consola web muestra las mismas diez variables, pero como filas desplegables, no como Grid ([Web](../Web/README.md#2-pantallas)).

- Implementado: Grid, unidades, ausencias, origen, fecha de captura, batería e historial de las diez variables.
- Probar captura, diagnóstico y guardado en modo avión; no bloquear el resultado por la consulta meteorológica.
- Probar sesión previa, falta de GPS, reinicio, sincronización y accesibilidad.
- Validar el recorrido completo con hardware.

### Captura, historial y pronóstico: contrato implementado

Las temperaturas se muestran en °C o °F según la preferencia.

Las tres magnitudes ambientales, `battery_percent`, `measured_at` y `diagnosis` sobreviven al guardado, consulta, caché, cola offline e historial. Los registros antiguos sin ambiente o batería siguen siendo legibles y muestran ausencia. `diagnosis.localSource = 'probe-bme280-v1'` identifica las capturas del nuevo flujo; no permite atribuir el mismo origen a históricos sin esa marca. `measured_at` conserva la recepción de la lectura en el celular, aunque la sincronización ocurra más tarde.

El servicio consulta `forecast_days=6&timezone=auto` a Open-Meteo y presenta las **cinco fechas locales posteriores a hoy**, con temperaturas mínima/máxima y precipitación. Los valores faltantes se conservan como ausencia; las alertas por fecha de lluvia, helada o calor usan reglas orientativas aún no validadas en campo. La lectura y su diagnóstico se presentan antes de terminar esa consulta y pueden guardarse mientras carga. Al guardar, el pronóstico y la recomendación disponibles quedan congelados en `diagnosis`: una respuesta tardía no modifica ese registro ni otra medición.

El GPS procede del celular y se espera como máximo cinco segundos. Si no entrega ubicación, se conserva la lectura sin coordenadas y sin pronóstico. Este límite **no es el tiempo total de medición**. Las cuatro etapas permanecen en el historial, con o sin coordenadas. La app no incluye mapas.

La trama de producto es de **20 bytes**, con diez variables, batería y formato. La trama de 16 bytes sólo se tolera para prototipos sin BME280. Una respuesta BLE válida confirma presencia en ese instante; el enlace se cierra después para permitir reposo y no se afirma conexión permanente ni internet del ESP32. Ver [contrato BLE](../docs/CONTRATO_BLE.md) y [persistencia en Supabase](../supabase/README.md#persistencia-ambiental-y-bateria).

`probeTelemetry`, `environmentHistory` y `weatherService` (dentro de `npm test`, §9) cubren v0/v1, el centinela sin suelo y los de ambiente, negativos, rangos, batería, BLE → fila → historial, históricos sin ambiente, cinco fechas con cambio de mes, pronóstico parcial y fallo de red. Son pruebas de lógica, no una certificación física; [pruebas pendientes](../docs/PLAN_VALIDACION.md#5-dependencias-y-comprobaciones-de-software).


---

Aplicación móvil de terreno desarrollada en **React Native 0.86 + React 19.2 + Expo SDK 57 + TypeScript 6 + Zustand**. 

### Aceptación previa al registro móvil

El registro pide nombre y correo en el primer paso, y contraseña y confirmación en el
segundo. Al pulsar «Revisar y crear cuenta» con datos válidos se abre el
[panel de términos y privacidad](src/components/RegistrationConsentModal.tsx).
La solicitud de creación de cuenta se realiza únicamente después de llegar al final
del contenido, marcar las dos casillas y pulsar «Aceptar y crear cuenta». Esta acción
envía el registro directamente. El botón permanece visible en la parte inferior.
Antes de llegar al final, la acción se llama «Leer hasta el final»:
desplaza el texto hasta el final a una velocidad legible, y sólo entonces se habilitan
las casillas. Arrastrar el texto interrumpe ese desplazamiento asistido. Cancelar vuelve
al formulario sin enviar la solicitud; al reabrir, las casillas vuelven a estar vacías.
Una aceptación ya enviada se conserva para reintentar si falla la red; cambiar el
nombre, el correo o el flujo obliga a revisarla de nuevo.
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
> - **Probar BLE exige un build nativo** (`npm run android`, que ejecuta `expo run:android`, o un build de EAS); Expo Go no trae el módulo BLE.

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
  - [4.3. Flujo de Medición: Selección de Fase y Resultados](#43-flujo-de-medición-selección-de-fase-y-resultados)
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

1. **Carga, idioma y bienvenida:** `LoadingScreen`, `LanguageScreen` y tres páginas de `WelcomeCarouselScreen`: conocer el suelo, conectar y medir, e interpretar con contexto. Se recuerda el idioma y la bienvenida por instalación.
2. **Acceso y Recuperación de Clave:** Inicio de sesión, registro en dos pasos y recuperación por código de correo, con `EmailCodeScreen` y `ResetPasswordScreen`. El deep link nativo se conserva para correos antiguos.
3. **Permisos (`PermissionsScreen`):** Después de iniciar sesión o confirmar la cuenta y antes de vincular equipos, explica qué usa cada función (Bluetooth, ubicación, cámara y notificaciones) sin pedir nada. Cada permiso se pide al usar su función (§4.1).
4. **Onboarding Dual de Equipos:**
   - **Primer Propietario (Owner):** Vinculación física por BLE: la app lee el ID de 15 dígitos que la sonda deriva de su MAC (con la ventana PAIR abierta) y registro atómico en Supabase (`register_paired_device`).
   - **Usuarios:** escanean el QR temporal mostrado por cualquier miembro aprobado o ingresan su código de invitación en el onboarding. Quedan en una pantalla de espera hasta que el administrador apruebe su ingreso. El QR y su código vencen juntos; el ID permanente no concede acceso.
5. **Dashboard Principal:** Punto de inicio rápido con botón destacado **Iniciar Medición** y acceso al historial.
6. **Selección Obligatoria de Fase Fenológica:** Al pulsar medir, el usuario debe seleccionar una de las 4 etapas productivas:
   - **Pre-siembra (Siembra)**
   - **Vegetativo**
   - **Floración**
   - **Cosecha**
7. **Captura BLE y meteorológica:** conexión por BLE a la sonda, lectura de la trama GATT de 20 bytes y consulta meteorológica. La consulta requiere red y no tiene caché: si falla, la medición se registra igual y el diagnóstico se emite **sin contexto climático**.
8. **Resultados (una pantalla):** el veredicto de la fase; un resumen con pestañas *Resumen*, *Qué hacer* y *Qué revisar* y el **plan global**, que combina suelo, etapa y pronóstico; el Grid 2×5 con semáforo, donde cada tarjeta abre su detalle (*Estado*, *Recomendación*, *Control*); el pronóstico de cinco días; y **Guardar resultado**. Al guardar aparece el recordatorio de limpiar los electrodos (`CalibrationReminderModal`).
9. **Historial de Mediciones (`HistoryScreen`):** Lista cronológica de todas las etapas, con filtros, estado de sincronización y detalle del diagnóstico. No incluye visualización cartográfica.

---

## 2. Principio Rector: Offline-First

El agricultor agrícola opera habitualmente en zonas rurales sin conectividad celular 4G/5G. La aplicación garantiza **total autonomía operativa en terreno**:

| Escenario en Terreno | Comportamiento del Sistema |
| :--- | :--- |
| **Sin Conexión a Internet** | La app inicia desde la caché persistente de Zustand/AsyncStorage (`useAuthStore`). Conecta por BLE, evalúa el suelo localmente, genera la recomendación, guarda la lectura y la encola con un `client_uuid` único. |
| **Sin Señal de Satélites GPS** | Emite un aviso no bloqueante; la medición se registra con fecha, hora y cultivo, guardándose localmente sin coordenadas geográficas. |
| **Sin Sonda Física Presente (sólo en desarrollo)** | En un build de desarrollo sin equipo vinculado, o sin el módulo BLE nativo (Expo Go), simula lecturas con una **bandera visual visible y permanente**. En producción, medir sin sonda vinculada es un error (`readSoilProbe` en `probeService.ts`). |
| **Recuperación de Cobertura** | El componente `OfflineBanner` detecta el regreso de internet y `measurementsService` vacía la cola en segundo plano mediante upsert idempotente. |

---

## 3. Estructura de carpetas

```text
App/
├── App.tsx                             # Enrutador de estado raíz (idioma, bienvenida, acceso, permisos, onboarding, navegación)
├── index.ts                            # Punto de entrada de Expo
├── app.config.js                       # Configuración Expo, permisos nativos y deep linking
├── package.json                        # Dependencias (React Native 0.86, Expo SDK 57, Zustand) y lista de pruebas
├── tsconfig.json                       # Configuración TypeScript estricta
├── plugins/                            # Plugins de configuración nativa (permisos de arranque, seguridad Android)
├── scripts/
│   ├── verify-supabase-onboarding.mjs  # Verificación E2E remota contra Supabase
│   ├── generate-brand-assets.mjs       # Genera src/components/brandAsset.ts desde el logo
│   └── check-npm-audit.mjs             # Revisión de vulnerabilidades de dependencias
├── src/
│   ├── constants/                      # theme.ts (paleta semáforo, tipografía) y motion.ts (animaciones)
│   ├── types/                          # agronomy.ts, app.ts y preferences.ts
│   ├── engine/
│   │   ├── agronomyEngine.ts           # Motor de reglas biofísicas deterministas
│   │   ├── stageEvaluator.ts           # Reponderación de umbrales según fase fenológica
│   │   ├── contextualAdvice.ts         # Recomendaciones globales y por parámetro
│   │   └── measurementPresentation.ts  # Parámetros del Grid 2×5 y su presentación
│   ├── store/                          # useAppStore.ts y useAuthStore.ts (sesión con caché offline)
│   ├── hooks/                          # useAppTheme, useTranslation y useMeasurementHistory
│   ├── screens/
│   │   ├── LanguageScreen.tsx          # Selector de idioma inicial y desde bienvenida/acceso
│   │   ├── WelcomeCarouselScreen.tsx   # Carrusel informativo inicial
│   │   ├── AuthScreen.tsx              # Inicio de sesión, registro y solicitud de clave
│   │   ├── EmailCodeScreen.tsx         # Código de 6 dígitos: confirmación y recuperación
│   │   ├── ResetPasswordScreen.tsx     # Nueva contraseña
│   │   ├── PermissionsScreen.tsx       # Explicación inicial de permisos (no solicita nada)
│   │   ├── OnboardingScreen.tsx        # Vinculación BLE del primer administrador o ingreso por QR
│   │   ├── WaitingApprovalScreen.tsx   # Espera de aprobación del administrador
│   │   ├── DashboardScreen.tsx         # Inicio con el botón "Medir"
│   │   ├── MeasureScreen.tsx           # Selección de fase → BLE → carrusel de resultados
│   │   ├── HistoryScreen.tsx           # Historial de las cuatro etapas
│   │   ├── FieldSettingsScreen.tsx     # Menú de Ajustes
│   │   ├── SettingsDetails.tsx         # Submenús de Ajustes
│   │   ├── ProfileScreen.tsx           # Perfil y cambio de contraseña
│   │   ├── DevicesScreen.tsx           # Equipos, registro BLE y QR temporal
│   │   └── AdministrationScreen.tsx    # Miembros: aprobación, delegación y eliminación
│   ├── components/                     # Modales, banner offline, guía por pantalla, QR, radar BLE, UI de acceso y Ajustes
│   ├── services/
│   │   ├── bleService.ts               # Escaneo, vinculación, confirmación y telemetría BLE
│   │   ├── probeService.ts             # UUID GATT y decodificación de la trama y del estado
│   │   ├── contactService.ts           # Informe de cada contacto con la sonda (report_device_contact)
│   │   ├── measurementsService.ts      # Cola offline en AsyncStorage y sincronización Supabase
│   │   ├── deviceService.ts            # Registro, membresías y preparación de equipos
│   │   ├── onboardingService.ts        # Estado de onboarding en Supabase
│   │   ├── permissionsService.ts       # Estado y solicitud de permisos del sistema
│   │   ├── preferencesService.ts       # Preferencias locales y en la nube
│   │   ├── weatherService.ts           # Pronóstico de Open-Meteo y su degradación sin red
│   │   ├── emailOtp.ts                 # Códigos de correo de 6 dígitos
│   │   ├── authDeepLink.ts / authDeepLinkParser.ts  # Enlaces de recuperación antiguos
│   │   ├── notifications.ts            # Tokens y avisos push
│   │   ├── recommendationsService.ts   # Punto de conexión opcional, sin proveedor configurado
│   │   └── supabase.ts                 # Cliente Supabase tipado
│   └── utils/                          # Funciones puras: ID de 15 dígitos, cola de contactos, historial, reset, validaciones, unidades
└── tests/                              # Pruebas con node:test + tsx (npm test); resultado vigente en TASK_PERMISSIONS.md
```

---

## 4. Pantallas y Navegación

### Inicio, navegación e historial

- Inicio con la última lectura real, acceso a equipos, estado de respaldo y acceso al historial; sin métricas de ejemplo. Se adapta a tema claro/oscuro y español/inglés.
- Navegación inferior persistente entre Inicio, Historial y Ajustes. Se oculta durante la medición y el onboarding.
- Historial con actualización al deslizar, estados de carga/error, filtros táctiles de 48 dp y etiqueta de respaldo por lectura.
- Caché del historial consultado (hasta 200 lecturas por consulta), aislada por cuenta y equipo. Sin red se combina con la cola pendiente; los registros confirmados se identifican también por `client_uuid` para evitar duplicados visuales. No equivale a descargar todo el historial. La app no crea ni selecciona campos: consulta las lecturas sin filtrar por `field_name` y envía ese atributo vacío en nuevas mediciones por compatibilidad con el esquema. Los nombres de registros anteriores se conservan; los cachés antiguos por campo se recuperan cuando aún no existe el caché unificado del equipo.
- Bienvenida con ilustración ajustada al espacio disponible y acciones fijas; permite desplazar texto ampliado cuando no cabe. Selector de etapa en tarjetas de ancho completo con estado accesible.

**Validación pendiente en dispositivo:** aspecto visual, lectores de pantalla, tamaños de letra ampliados, navegación Android y conexión BLE física. La interfaz BME280 y el pronóstico de cinco días están implementados; la recepción física y el comportamiento Android/iOS requieren pruebas en terreno.

`npx expo export --platform android --output-dir dist-review --no-bytecode` genera una exportación JavaScript de diagnóstico en `App/dist-review`; no es un instalador.

### Confirmación de cuenta

El registro y la recuperación envían correos con un código de 6 dígitos que se ingresa en la app
([plantillas y límites de Supabase](../supabase/README.md#7-plantillas-de-correo)). El deep link
de recuperación se conserva sólo para correos antiguos; la web ya no tiene `/cuenta-confirmada`
(§12.3). La entrega real de correo y el recorrido en un teléfono deben verificarse contra el
proyecto remoto.

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
          │  (Resultados)         │
          ├───────────────────────┤
          │ Resumen y plan global │ (Diagnóstico conjunto suelo + clima)
          │ Grid 2×5              │ (Semáforo; detalle por tarjeta)
          └───────────────────────┘
```

### 4.1. Bienvenida y Autenticación

[App.tsx](App.tsx) dirige el acceso mediante [resolveEntryRoute](src/utils/authFlow.ts).
El orden de una instalación nueva es **carga → idioma → bienvenida → acceso/confirmación
→ permisos → vinculación → aplicación**. La recuperación de contraseña tiene prioridad sobre estos pasos:
una sesión de recuperación no abre permisos ni la aplicación operativa.

- **Carga e idioma:** el splash nativo entrega el control a [LoadingScreen](src/components/LoadingScreen.tsx).
  [LanguageScreen](src/screens/LanguageScreen.tsx) guarda la elección sin requerir conexión.
  Desde bienvenida o acceso se abre como panel completo y conserva la página y los campos al volver.
  [preferencesService](src/services/preferencesService.ts) asocia una elección explícita a la siguiente
  cuenta autenticada, conserva el resto de su perfil y reintenta cambios pendientes al recuperar red.
  Una sesión restaurada usa la caché de su cuenta y consulta el servidor con espera acotada.
  Cerrar sesión conserva el idioma de la instalación. Las instalaciones con bienvenida ya completada
  continúan sin repetirla ni exigir una nueva selección de idioma.
- **Bienvenida:** [WelcomeCarouselScreen](src/screens/WelcomeCarouselScreen.tsx) muestra
  tres páginas. «Saltar» y «Comenzar» guardan su finalización en este dispositivo;
  una sesión restaurada continúa hacia la etapa correspondiente a su cuenta.
- **Acceso y registro:** [AuthScreen](src/screens/AuthScreen.tsx) valida los campos,
  separa datos personales y contraseña, bloquea envíos duplicados y solicita el consentimiento
  antes de crear la cuenta. Envía nombre completo y sus partes explícitas para que el trigger
  de perfiles conserve todos los nombres y apellidos.
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

#### Permisos del teléfono

Diseño según las guías de [Apple](https://developer.apple.com/design/human-interface-guidelines/privacy/)
y [Android](https://developer.android.com/training/permissions/requesting): cada permiso se pide
**cuando la persona usa la función que lo necesita**, nunca en bloque al iniciar sesión. La auditoría
y el plan completo están en [TASK_PERMISSIONS.md](TASK_PERMISSIONS.md#plan-de-implementación-permisos-del-teléfono).

**Pantalla inicial** ([PermissionsScreen](src/screens/PermissionsScreen.tsx)): aparece tras el acceso,
una vez por cuenta y teléfono, con el mismo armazón de las pantallas de entrada (`EntryLayout`:
ancho máximo 520, pie fijo, botón de 54). Es **sólo informativa**: explica en cuatro filas qué usa
cada función y no abre ningún diálogo del sistema. Su única acción es «Continuar», que guarda
`@terrasense/permissions-review-v1/<userId>`; si ese guardado falla, se continúa en la sesión.
No lleva la guía flotante ni el rótulo «Paso 3».

| Permiso | Se pide al… | Si no se concede |
| --- | --- | --- |
| Bluetooth / dispositivos cercanos | Buscar la sonda (vincular o registrar) y tocar «Medir» | Se explica que la sonda no se puede buscar ni leer; el resto de la app sigue disponible. En Android anterior a 12 el escaneo usa la ubicación. |
| Ubicación en primer plano | Activar «Añadir ubicación y pronóstico» al preparar una medición | La lectura se guarda sin coordenadas ni pronóstico. La elección se recuerda en el teléfono (`@terrasense/measure-location-v1`) y es distinta del permiso que Android antiguo usa para Bluetooth. La precisión aproximada se acepta y se avisa. |
| Cámara | Tocar «Escanear QR» en el onboarding o en Mis dispositivos | Queda el código de invitación, que aparece bajo el QR y se puede escribir en las dos pantallas. |
| Notificaciones | Solicitarlas en Ajustes → Permisos del teléfono | La app funciona igual. El inicio sólo registra una autorización ya concedida (`requestPermission: false`). |

**Variantes por plataforma** ([permissionPrompt.ts](src/components/permissionPrompt.ts)):

- **Primera vez, iOS y Android:** diálogo del sistema directo. La acción que tocó la persona da el
  contexto, así que no hay pantalla previa; si la hubiera, Apple la limita a una sola acción
  «Continuar», sin «Permitir» ni forma de salir.
- **Android, tras un rechazo que admite otra solicitud** (`shouldShowRequestPermissionRationale`):
  explicación **cancelable**, con «Cancelar» y «Continuar».
- **El sistema ya no preguntará:** al volver a intentar la función se explica dónde se cambia y se
  ofrece «Abrir ajustes» o «Cancelar». Nunca se abre Ajustes automáticamente tras un rechazo nuevo.
- **Restringido por el teléfono:** se informa sin prometer que Ajustes lo resuelva.

Los textos viven en [permissionCopy.ts](src/utils/permissionCopy.ts), en los dos idiomas. Ningún
botón propio se titula «Permitir», «Ahora no» ni «Más tarde», y los estados dicen el hecho
(«Sin acceso», «Ubicación aproximada», «Bluetooth apagado») sin culpa ni postergación. Una prueba lo
exige.

**Coordinador único** ([permissionsService.ts](src/services/permissionsService.ts)): consultar nunca
abre diálogos, las solicitudes van de a una, se revalida antes de pedir y un permiso concedido no
repite el diálogo. Onboarding, Mis dispositivos, la medición y `probeService` usan el mismo camino:
ya no hay una segunda solicitud de Bluetooth en `bleService`. Android no informa si un permiso
nunca se pidió o quedó bloqueado, así que se guarda por instalación que ya se pidió
(`@terrasense/permission-asked-v1/<permiso>`). En iOS esa marca permite leer el estado de
Bluetooth tras reiniciar sin crear el gestor antes de tiempo, que abriría el diálogo. Si alguien
restablece la privacidad del teléfono sin desinstalar, esa lectura puede mostrar el diálogo del
sistema: el plan prevé un módulo nativo que lea `CBManager.authorization`.

**Configuración nativa** ([app.config.js](app.config.js), [withStartupPermissions](plugins/withStartupPermissions.js)):

- iOS: una sola fuente para cada texto de uso, en los plugins y traducida por `locales`. Sin
  `bluetooth-central` en segundo plano (la opción `modes` del plugin BLE lo agregaba) y sin las
  claves de ubicación «Siempre» ni de movimiento, que `expo-location` escribía en inglés por defecto.
- Android: `BLUETOOTH` y `BLUETOOTH_ADMIN` limitados a la API 30, `BLUETOOTH_SCAN` con
  `neverForLocation` y la ubicación sin límite, porque también la usa el GPS. Se eliminan
  `SYSTEM_ALERT_WINDOW` y el almacenamiento compartido, que declaraban dependencias.
- `node scripts/check-native-permissions.cjs` revisa el `Info.plist` y el manifiesto que quedan
  tras todos los plugins. `NSLocalNetworkUsageDescription` viene de `expo-dev-client` y queda por
  revisar en el binario de la tienda.
- **Los cambios nativos requieren reconstruir e instalar el cliente de desarrollo**; recargar
  JavaScript no actualiza el manifiesto ni los mensajes del sistema.

`resolveEntryRoute` mantiene esta precedencia: carga inicial → recuperación → idioma/bienvenida/acceso
si no hay sesión → carga de la marca de permisos → permisos pendientes → resultado de onboarding.

#### Verificación

[permissions.test.ts](tests/permissions.test.ts) cubre estados de Android (nunca pedido, rechazo,
bloqueo, concesión parcial), ubicación aproximada, avisos provisionales, vocabulario, textos en
los dos idiomas y la configuración nativa. [onboardingAudit.test.ts](tests/onboardingAudit.test.ts)
cubre la solicitud iOS de Bluetooth y la lectura tras reiniciar. Ejecutar `npm test` y
`npm run type-check` desde `App/`.

**Falta la matriz en teléfonos** (TASK_PERMISSIONS.md, P7): diálogos reales, rechazo y bloqueo,
regreso desde Ajustes, Bluetooth apagado, ubicación aproximada, idioma de los diálogos y el Motorola
G55. Las pruebas locales no certifican esas interacciones.

### 4.2. Onboarding y Gobernanza de Equipos
* **`OnboardingScreen`**: Detecta automáticamente el tipo de usuario:
  1. **Primer administrador (`admin`):** empareja la sonda por BLE con la ventana PAIR abierta y registra el ID con `register_paired_device`. Sólo obtiene administración si ese equipo no tiene miembros.
  2. **Usuario (`user`):** escanea el QR temporal de un miembro aprobado, o escribe el código de invitación que se muestra debajo (es el mismo token), y queda pendiente. El administrador recibe un aviso push para revisar la solicitud en **Ajustes → Administración**. La espera muestra sus iniciales de nombre/correo censuradas desde el servidor. Ambos caminos pasan por la Edge Function `request-device-access`. Cada QR dura 5 minutos desde que se genera y la app muestra el nuevo al vencer ([detalle](../supabase/ADMINISTRACION.md#qr-de-5-minutos)).

Ambos roles pueden operar el equipo y mostrar el QR. Sólo el administrador ve Administración, donde aprueba, elimina o delega; al delegar pasa a usuario. [Contrato y despliegue de administración](../supabase/ADMINISTRACION.md).

### 4.3. Flujo de Medición: Selección de Fase y Resultados

El proceso de medición sigue una secuencia rigurosa y pedagógica:

1. **Selección de Fase Fenológica:** Al presionar "Medir", la interfaz exige seleccionar una de las cuatro etapas del ciclo:
   - **Pre-siembra (Siembra)**
   - **Vegetativo**
   - **Floración**
   - **Cosecha**
2. **Captura física:**
   - La app escanea el anuncio `TerraSense-<ID>`, conecta vía BLE, captura la trama y consulta el clima en Open-Meteo.
   - Desconecta inmediatamente el enlace BLE para proteger la batería del ESP32.
3. **Resultados, en una sola pantalla** ([`MeasurementExplorer`](src/components/MeasurementExplorer.tsx)):
   - **Veredicto y resumen:** el título de la fase y un panel con pestañas *Resumen*, *Qué hacer* y *Qué revisar*. **Ver plan global** abre el diagnóstico de conjunto: suelo, fase elegida y pronóstico (lluvias, olas de calor o heladas). En **Pre-siembra** incluye qué cultivos conviene sembrar.
   - **Grid 2×5 con semáforo** (§5.3). Al tocar una tarjeta se abre su detalle con pestañas *Estado*, *Recomendación* y *Control*, y botones para pasar al parámetro siguiente o anterior.
   - **Pronóstico** de cinco días y **Guardar resultado**. La lectura puede guardarse mientras el pronóstico carga.
4. **Después de guardar:** el recordatorio `CalibrationReminderModal` pide limpiar y secar los electrodos de acero inoxidable. No hay más pantallas: la app no dibuja mapas.

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
  se consultan en Actualizaciones.
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

#### Reset del equipo: sólo desde el backoffice

La app **no resetea equipos**. El único reset es el del [backoffice](../Web/README.md#2-pantallas)
(`admin_reset_device`, sólo la cuenta de soporte): borra usuarios, solicitudes, mediciones,
alertas, invitaciones, historial y actualizaciones, y conserva el ID, que sale de la MAC de la
sonda. La sonda no se toca porque no guarda nada del propietario.

Tras el reset la sonda queda **libre**: la vincula quien la tenga en la mano con la ventana
PAIR abierta (§6) y queda como administrador, sea un antiguo miembro o alguien nuevo.
La ventana la comprueba la app; la base no la ve (pendiente A4 de
[`Firmware/TASK.md`](../Firmware/TASK.md), riesgo aceptado).

Cada reset incrementa `data_generation`. El servidor rechaza lecturas de una generación
anterior aunque un antiguo miembro vuelva a obtener acceso. Los teléfonos eliminan colas
antiguas y cachés afectadas al reconectar (`reconcileDeviceResets`); no es posible borrar a
distancia una copia en un teléfono que permanece sin conexión. Las cachés de otros equipos se
conservan; la caché agregada se invalida para no mostrar lecturas del equipo reseteado.

#### Actualizaciones del firmware ESP32

El centro consulta `check_firmware_update`, muestra la versión informada y las notas de
la versión compatible publicada. No instala actualizaciones de la app.

**Desde el 27-09-2026 el backoffice envía actualizaciones** al administrador de cada equipo
([`20260927120300`](../supabase/migrations/20260927120300_actualizaciones_firmware.sql)):
llega un aviso push con `event_type = 'firmware_update'` y la asignación queda en
`my_firmware_updates()`. **Falta implementar en la app** (§12.4): la ventana Actualizar /
Cancelar, el estado pendiente y la instalación por BLE. Hasta entonces la interfaz no simula
progreso ni afirma haber instalado nada.

#### Validación pendiente

La invalidación por generación viene de
[`20260920120000_preparar_equipo_propietario.sql`](../supabase/migrations/20260920120000_preparar_equipo_propietario.sql);
[`20260928130000_reset_solo_desde_backoffice.sql`](../supabase/migrations/20260928130000_reset_solo_desde_backoffice.sql)
retiró el reset desde la app y el bloqueo que impedía revincular una sonda reseteada.
`npm run test:supabase-onboarding` (§9) cubre revinculación, concurrencia y aviso de
invalidación. La migración está aplicada en producción desde el 28-09-2026. **Pendiente:** correr
esa prueba contra una réplica y probar con la sonda ([Supabase §10.0.2](../supabase/README.md#1002-reset-sólo-desde-el-backoffice-28-09-2026)).
Falta también probar en Android/iOS la limpieza de colas y cachés al reconectar.

---

## 5. Motor Agronómico y Reglas de Decisión

El motor agronómico (`agronomyEngine.ts` + `stageEvaluator.ts` + `contextualAdvice.ts`) es un sistema experto determinista basado en relaciones biofísicas de suelo-planta:

### 5.1. Etapas Fenológicas Obligatorias

| Etapa Fenológica | Variables que deciden el veredicto (`STAGE_DRIVERS`) | Comportamiento del Motor |
| :--- | :--- | :--- |
| **Pre-siembra (Siembra)** | Temperatura del suelo, CE, pH, humedad | Evalúa la aptitud de la cama de siembra; alerta si el suelo está frío para germinar o si la salinidad dañará la plántula. |
| **Vegetativo** | Humedad, pH, CE | Vigila agua en la zona radicular y condiciones que limitan la absorción durante el crecimiento foliar. |
| **Floración** | CE, humedad, pH | El umbral de salinidad máxima se reduce al **80 % del valor del cultivo**, porque el estrés osmótico provoca aborto floral. |
| **Cosecha** | Humedad, CE | Evalúa la transitabilidad del suelo para entrar con maquinaria sin compactarlo. |

N, P y K no deciden el veredicto en ninguna etapa (§5.2); la fuente de verdad de esta tabla es
[`stageEvaluator.ts`](src/engine/stageEvaluator.ts).

### 5.2. Tratamiento de N, P y K: por qué no se muestran como medida
La sonda mide **conductividad eléctrica y temperatura**. Los tres registros asociados a nitrógeno, fósforo y potasio se derivan de esa conductividad mediante un modelo empírico del fabricante.

**Una lectura de conductividad no identifica concentraciones independientes de N, P y K.** Esto es cierto en todo el rango de uso, no solo en suelo salino — [la propia documentación de Bluelab distingue el seguimiento por conductividad del análisis de nutrientes individuales](https://support.bluelab.com/hc/en-us/articles/360001103995-understanding-nutrient-measurements-with-the-pulse-meter). Por eso:

1. **La app no presenta N, P ni K como cifras interpretables en ningún caso.** No es un enmascaramiento condicional: es la regla general.
2. Cuando la conductividad es alta **y** al menos uno de los tres registros es elevado, la lectura se marca como de **baja confianza** y queda **excluida del veredicto**. Esta salvaguarda es **parcial, no una validación analítica**.
3. **El motor no emite dosis de fertilizante ni de enmienda a partir de esos registros.** La antigua recomendación de «lavado» con fracción fija y la dosis de cal en kg/ha derivada del pH se eliminaron: no incorporaban capacidad tampón, acidez de reserva, profundidad efectiva ni poder neutralizante del material.

**Para decisiones de fertilización y encalado corresponde un análisis de laboratorio.** Una lectura instantánea no equivale a un análisis representativo del campo.

### 5.3. Código de Colores Semáforo y Desglose Interactivo
El Grid 2×5 de la pantalla de resultados usa el semáforo con estas etiquetas (N, P y K se rotulan siempre **Sin validar**):
* **🟢 Condición favorable:** el parámetro está dentro del rango óptimo para el cultivo y la fase seleccionada.
* **🟡 Requiere atención:** el valor se aproxima a los límites de estrés; conviene un ajuste preventivo de riego o manejo.
* **🔴 Condición limitante:** estrés hídrico, acidez perjudicial o salinidad que exige intervención.
* **⚪ Dato de contexto:** variable que no decide el veredicto de esa fase (no está en `STAGE_DRIVERS`, §5.1), las tres del ambiente o un dato ausente. Por ejemplo, la temperatura del suelo decide en pre-siembra y es contexto en las otras tres fases.

---

## 6. Enlace BLE con la Sonda (Protocolo GATT)

```text
┌─────────────────┐       RS-485 Modbus RTU       ┌───────────────┐
│ Sonda 7-en-1    ├──────────────────────────────►│ Micro ESP32   │
│ Acero Inox      │                               │ Con Batería   │
└─────────────────┘                               └───────┬───────┘
                                                          │ BLE GATT Notify
                                                          │ (Trama de 20 Bytes)
                                                          ▼
                                                  ┌───────────────┐
                                                  │ App Móvil     │
                                                  │ React Native  │
                                                  └───────────────┘
```

* **Servicio Principal:** `00000001-5e4e-4c69-6d61-746572726101`
* **Telemetría (Notify):** `00000002-5e4e-4c69-6d61-746572726102`
* **Identidad (Read):** `00000003-5e4e-4c69-6d61-746572726103`
* **Confirmación de vinculación (Write):** `00000004-5e4e-4c69-6d61-746572726104`
* **Estado (Read):** `00000005-5e4e-4c69-6d61-746572726105`: batería en % (`FF` sin dato), versión del firmware y ventana PAIR abierta ([contrato](../docs/CONTRATO_BLE.md#característica-de-estado))

### Vincular una sonda

El ID de la sonda **no lo genera la app**: el firmware lo deriva de la MAC del ESP32 (15 dígitos, puede empezar con 0) y nunca cambia. `pairWithNearbyProbe` lee el ID y la ventana PAIR; si la ventana está cerrada, la pantalla pide mantener PAIR 3 s y no registra nada. Con la ventana abierta, `registerDevice` registra el equipo con ese ID y `confirmPairing` se lo escribe a la sonda para que avise con verde y buzzer (un fallo de ese aviso no deshace el registro). No hay reset desde la sonda ni desde la app: el único es el del backoffice, y la sonda vuelve con el mismo ID, libre para que la vincule quien abra su ventana PAIR.

### Informe de cada contacto con la sonda

La sonda no tiene internet: la app es la única que puede contarle a Supabase que habló con ella. Tras cada conversación BLE (vincular y medir), [`bleService.ts`](src/services/bleService.ts) lee la característica de estado y [`contactService.ts`](src/services/contactService.ts) llama a `report_device_contact` con el ID de 15 dígitos, la batería, la versión y **la hora real del contacto**. Esto alimenta la primera y última conexión, el Online/Offline (menos de 15 min) y la batería del [backoffice](../Web/README.md#2-pantallas).

- Nunca retiene ni rompe el flujo BLE: si falla, el contacto queda en cola (`@terrasense/pending_probe_contacts`) y se reintenta en el siguiente contacto y cuando `OfflineBanner` sincroniza.
- La cola guarda por equipo solo el contacto más antiguo y el más reciente, y descarta los de más de una semana ([`contactQueue.ts`](src/utils/contactQueue.ts), probado en `tests/probeContact.test.ts`).
- El contacto de una sonda recién vinculada espera en cola a que el equipo se registre; `registerDevice` vacía la cola en cuanto lo confirma.
- Se informa también cuando la trama llega sin lectura de suelo: la sonda sí conversó.
- Un firmware sin la característica de estado solo deja batería y versión vacías.

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
         temperatura del aire  12 bits  (C x 10) + 400   -> -40,0 a +85,0 C (rango del BME280)
         presion               12 bits  hPa - 300        -> 300 a 1100 hPa
         humedad relativa       8 bits  % x 2            -> 0 a 100,0 %
         Todos los bits a uno = el sensor no entrego dato -> NULL en la base
```

El firmware vive en [`Firmware/`](../Firmware/README.md), pero aún no tiene el driver Modbus, y el mapa de registros de la sonda **no está confirmado contra la ficha del proveedor**. Antes de fabricar hace falta una captura BLE/Modbus real del SKU adquirido.

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
5. **Sin GPS:** las mediciones sin coordenadas se guardan en el historial local sin coordenadas. La migración que lo permite en el servidor (`20260904120000`) está aplicada; falta la prueba extremo a extremo.

**Pendiente de verificación:** prueba extremo a extremo de cortes de red, cierre del proceso y cambio de cuenta.

---

## 8. Variables de Entorno

Crear `App/.env`. La app acepta también el `.env` de la raíz del repositorio; si existen los dos, manda `App/.env` (`app.config.js`):

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

# Compila el proyecto nativo (expo run:android), con el modulo BLE, y lo instala en el
# telefono conectado por USB. Es el camino para probar la sonda real; Expo Go no sirve.
npm run android

# Chequeo estricto de tipos de TypeScript
npm run type-check

# Pruebas unitarias (node:test + tsx): 21 archivos, 122 pruebas
npm test

# Verificación E2E remota contra Supabase
npm run test:supabase-onboarding

# Compilación de prueba para verificar empaquetado Android
npx expo export --platform android
```

### Verificación en dispositivo — pendiente

Las pruebas automatizadas cubren lógica pura: decodificación de la trama BLE y del estado, vinculación, cola de contactos, exclusión mutua de la cola offline, historial, onboarding, permisos y preferencias. **Lo siguiente solo puede comprobarse en un teléfono físico con la sonda, y aún no se ha hecho:**

| Escenario | Qué debe ocurrir |
| :--- | :--- |
| Corte de red durante el guardado | La medición queda en la cola local y el banner indica trabajo sin conexión |
| Recuperación de cobertura | La cola se vacía sin duplicar filas y el contador de pendientes baja |
| Cierre del proceso por Android con cola pendiente | Al reabrir, las mediciones siguen en la cola y se envían |
| Cambio de cuenta con cola pendiente | La cola de la cuenta anterior **no** se envía con el usuario nuevo |
| Medición sin señal GPS | Se guarda en el historial sin coordenadas |
| Enlace BLE con la sonda real | La trama decodifica los valores esperados del SKU adquirido, y la v1 el ambiente del BME280 |

Los cuatro primeros conviene probarlos contra una base de pruebas con las migraciones de [`supabase/`](../supabase/README.md), no contra producción.

---

## 10. Decisiones Arquitectónicas que Conviene Preservar

* **Ubicación bajo demanda (sin `ACCESS_BACKGROUND_LOCATION`):** La app solo solicita coordenadas GPS en el instante en que se ejecuta una medición, y no consume batería en segundo plano. **Esto es minimización de datos, no cumplimiento acreditado de la Ley 21.719**, que entra en vigencia el **1 de diciembre de 2026** y exige además bases de tratamiento, derechos de los titulares, política de retención, seguridad y reglas de transferencia internacional. [BCN: Ley 21.719](https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idParte=10527471&idVersion=2026-12-01).
* **Administración por equipo:** `admin` y `user` comparten las funciones normales de la app. Sólo `admin` administra membresías; al delegar pierde ese permiso. Nadie resetea un equipo desde la app: eso es sólo del backoffice. El acceso web es sólo de la cuenta de soporte (`is_support_staff()`), no del administrador de un equipo.

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

Ninguno bloquea el desarrollo; todos bloquean tener la app lista para usuarios reales.

### 12.1. SMTP propio — los correos caen en spam

La configuración local declara SMTP propio. Su estado remoto y la entrega a bandeja
de entrada deben comprobarse; no se puede atribuir un problema de spam sin inspeccionar
el remitente y las cabeceras reales. Ver [configuración de correo](../supabase/README.md#7-plantillas-de-correo).

### 12.2. Rediseño de las pantallas del agricultor

**A medias.** Lo hecho es el pulido y los cimientos:

* `RadarScan` para la búsqueda por Bluetooth, de momento sólo en la medición.
* `PasswordChecklist`, con las casillas que se marcan al escribir.
* `FadeIn` como primitiva de entrada compartida, aplicada de momento sólo a `PermissionsScreen`.

Los tres respetan la preferencia de *reducir movimiento* del sistema.

**Lo que falta** es el repaso visual propiamente dicho, sobre `OnboardingScreen`, `DevicesScreen`,
`MeasureScreen` y `DashboardScreen`: jerarquía tipográfica, ritmo de espaciados, y estados vacíos —
hoy son un párrafo de texto centrado donde debería haber una indicación de qué hacer a continuación.
Queda pendiente también extender `FadeIn` al resto de pantallas para que la transición entre ellas
sea coherente.

No se tocó la consola web: el rediseño acordado cubre sólo la app del agricultor.

### 12.3. Página de confirmación retirada

La web ya no tiene `/cuenta-confirmada`: el backoffice no debe aparecer en ningún correo ni
redirección, y la confirmación usa códigos de 6 dígitos. Si queda algún correo antiguo con
enlace, lleva al login neutro de la web. *Site URL* ya apunta a `terrasense://`
([§10.0](../supabase/README.md#100-backoffice-de-cuenta-única--aplicado-el-27-09-2026)).

### 12.4. Actualizaciones de firmware en la app

Lo que el backoffice ya envía y la app todavía no atiende:

| # | Tarea | Detalle |
| :---: | :--- | :--- |
| U1 | Ventana Actualizar / Cancelar | Al abrir la app y al llegar el aviso, si `my_firmware_updates()` trae algo, mostrarle al **administrador** la versión y sus notas. Cancelar llama `firmware_update_progress(id, 'postpone')` y la deja pendiente: aviso fijo en Dispositivos y la ventana vuelve a ofrecerse. |
| U2 | Mostrar el aviso | `notifications.ts` oculta hoy los avisos con `event_type = 'firmware_update'`; hay que mostrarlos y abrir la ventana al tocarlos. |
| U3 | Descarga y verificación | Descargar `storage_path` del bucket `firmware` (la política solo lo permite al administrador con la actualización activa) y comparar el SHA-256 antes de tocar la sonda. |
| U4 | Transferencia BLE | `start` → «Mantén PAIR 3 s» → protocolo de [`Firmware/PLAN.md`](../Firmware/PLAN.md) (O2) con barra de progreso real → releer la versión en la característica de estado → `installed`, o `failed` con el motivo. Depende de que el firmware implemente O2. |

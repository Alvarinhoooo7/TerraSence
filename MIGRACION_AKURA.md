# 🔁 Plan de Migración: Akura → TerraSense

> **Objetivo:** reutilizar la base funcional ya implementada y probada del proyecto
> [`Alvarinhoooo7/Akura`](https://github.com/Alvarinhoooo7/Akura) —autenticación, recuperación de contraseña,
> dashboard con mapa, emparejamiento BLE + QR, seguridad RLS, consola web y OTA— adaptándola al dominio
> agronómico de TerraSense, en lugar de reconstruirla desde cero.
>
> **Documento único de tareas.** Todo lo necesario para ejecutar la migración está aquí.

---

## 📑 Tabla de Contenidos

* [0. Resumen Ejecutivo y Ahorro Estimado](#0-resumen-ejecutivo-y-ahorro-estimado)
* [1. ⚠️ Acción de Seguridad Previa e Ineludible](#1-️-acción-de-seguridad-previa-e-ineludible)
* [2. Inventario de lo que Aporta Akura](#2-inventario-de-lo-que-aporta-akura)
* [3. Mapa de Traducción de Dominio](#3-mapa-de-traducción-de-dominio)
* [4. FASE A — Infraestructura: Supabase y Vercel por CLI](#4-fase-a--infraestructura-supabase-y-vercel-por-cli)
* [5. FASE B — Esquema de Base de Datos](#5-fase-b--esquema-de-base-de-datos)
* [6. FASE C — Migración de la App Móvil](#6-fase-c--migración-de-la-app-móvil)
* [7. FASE D — Migración de la Consola Web](#7-fase-d--migración-de-la-consola-web)
* [8. FASE E — Firmware y Edge Functions](#8-fase-e--firmware-y-edge-functions)
* [9. Lo que NO se Debe Copiar](#9-lo-que-no-se-debe-copiar)
* [10. Variables de Entorno Requeridas](#10-variables-de-entorno-requeridas)
* [11. Checklist Maestro Ordenado](#11-checklist-maestro-ordenado)

---

## ✅ Estado Actual — actualizado 27 de agosto de 2026

| Bloque | Estado | Detalle |
| :--- | :---: | :--- |
| **0 · Seguridad** | 🟡 Parcial | `.gitignore` y `app.config.js` hechos. **Falta revocar la clave de Maps expuesta en Akura (S1–S4): es tarea manual en Google Cloud Console.** |
| **1 · Infraestructura Supabase** | 🟢 Hecho | Proyecto `terrasense` vinculado (São Paulo). PostGIS activo. 8 migraciones aplicadas. |
| **1 · Infraestructura Vercel** | 🔴 Pendiente | A7–A9, junto con la consola web. |
| **2 · Base de datos** | 🟢 Hecho | Esquema existente adoptado y ampliado. **RLS abierto corregido** (ver 5.1). RPC de vinculación por código. |
| **3 · App móvil** | 🟢 Hecho | Mapa, medición, autenticación, equipos, historial, ajustes, enlace BLE y notificaciones. Empaqueta: 1.251 módulos. **El BLE no está probado contra hardware.** |
| **4 · Consola web** | 🟢 Núcleo hecho | Login, dashboard de 4 pestañas, búsqueda y visor GIS con IDW. Compila: 78 módulos. **Falta desplegar en Vercel (A7–A9) y OTA (D6b).** |
| **5 · Edge Functions** | 🟢 Hecho | `device-checkin` y `send-push-alert` desplegadas. Las de dominio médico de Akura, descartadas. |

### Lo que realmente falta, por orden

1. **S1–S4** · Revocar la clave de Google Maps de Akura y emitir una nueva restringida. *Manual, bloqueante.*
2. **Variables de entorno** · Faltan las tres claves en el `.env` (ver sección 10). Sin ellas la app arranca pero no conecta.
3. **Probar el enlace BLE contra la sonda física.** El código está escrito y compila, pero nunca ha hablado con hardware real.
4. **C8** · Gestión de predios múltiples con perímetro. Hoy hay un solo predio por nombre.
5. **A7–A9** · Desplegar la consola en Vercel. **Requiere `vercel login` interactivo: el CLI se queda esperando entrada y no puede completarse de forma automática.**
6. **D6b** · Gestión de firmware OTA en la consola.
7. **SMTP propio** · Necesario para que los correos de recuperación usen la marca TerraSense y lleguen de verdad (ver A5).
8. **Confirmar la ficha de la sonda** con el vendedor (README §5.3.1) antes de cerrar el driver Modbus.

---

## 0. Resumen Ejecutivo y Ahorro Estimado

Akura es un localizador GPS con alerta médica para adultos mayores. Su dominio es distinto, pero su
**arquitectura es prácticamente isomorfa** a la que TerraSense necesita: un dispositivo físico emparejado por
BLE, que emite telemetría georreferenciada, consultada por múltiples roles de usuario desde una app móvil con
mapa a pantalla completa y una consola web de soporte.

| Capa | Estado en Akura | Reutilización estimada |
| :--- | :--- | :---: |
| Autenticación, registro, recuperación de contraseña | ✅ Implementado y probado | **95 %** |
| Dashboard con mapa a pantalla completa + círculos + burbuja | ✅ Implementado | **85 %** |
| Emparejamiento BLE + QR + ID numérico | ✅ Implementado | **80 %** |
| Sistema de diseño, tema claro/oscuro, i18n | ✅ Implementado | **90 %** |
| Esquema Postgres + RLS + triggers de seguridad | ✅ 24 migraciones | **70 %** |
| Consola web de soporte y OTA | ✅ Implementado | **75 %** |
| Notificaciones push | ✅ Implementado | **85 %** |
| Motor agronómico | ❌ No existe | **0 %** — es el trabajo propio de TerraSense |

**Volumen reutilizable:** del orden de **12.000 líneas** de TypeScript/TSX ya escritas y funcionando, más
**24 migraciones SQL** con políticas RLS endurecidas.

> [!TIP]
> **Decisión recomendada: repositorio nuevo, no renombrado.** Renombrar Akura conserva su historial de commits,
> su dominio médico incrustado en nombres de tablas y su clave de API expuesta en el historial de Git
> (ver sección 1). Es preferible **copiar los archivos al repositorio TerraSence actual**, lo que da un historial
> limpio, permite migrar por fases y mantiene ambos proyectos vivos e independientes.

---

## 1. ⚠️ Acción de Seguridad Previa e Ineludible

> [!CAUTION]
> **Hay una clave de API de Google Maps expuesta en texto plano en el repositorio público de Akura.**
>
> Ubicación: `App/app.json` → `expo.android.config.googleMaps.apiKey`, con valor que comienza por `AIzaSyACaJ…`.
>
> Al estar en un repositorio público y en el historial de Git, **debe considerarse comprometida**. Los rastreadores
> automáticos de claves indexan GitHub de forma continua; una clave de Maps sin restringir puede generar consumo
> facturable a nombre del propietario del proyecto.

**Tareas de remediación — antes de cualquier otra cosa:**

- [ ] **S1.** Entrar a Google Cloud Console → *APIs & Services* → *Credentials* y **revocar** la clave expuesta.
- [ ] **S2.** Crear una clave nueva **para TerraSense**, y otra distinta para Akura.
- [ ] **S3.** Restringir cada clave nueva: por aplicación Android (nombre de paquete + huella SHA-1 del certificado)
      y por API (sólo *Maps SDK for Android*).
- [ ] **S4.** Establecer **cuotas y alertas de facturación** en el proyecto de Google Cloud.
- [ ] **S5.** En TerraSense, la clave **nunca** va en `app.json` versionado: se inyecta desde variable de entorno
      (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) mediante `app.config.js`.
- [x] **S6.** Verificar que `.gitignore` cubre `.env`, `.env.local` y `*.keystore` antes del primer commit.

```javascript
// App/app.config.js — sustituye a app.json para permitir variables de entorno
export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY },
    },
  },
});
```

---

## 2. Inventario de lo que Aporta Akura

### 2.1. Aplicación Móvil (`App/`) — React Native · Expo 54 · TypeScript

| Archivo | Líneas | Qué aporta a TerraSense |
| :--- | ---: | :--- |
| `src/screens/DashboardScreen.tsx` | 1.269 | **Mapa a pantalla completa** con `PROVIDER_GOOGLE`, círculos, marcadores personalizados, barra flotante y modal OTA |
| `src/screens/AuthScreen.tsx` | 1.314 | Registro, inicio de sesión, **recuperación de contraseña**, validación y estados de error |
| `src/screens/AppSettingsScreen.tsx` | 1.960 | Ajustes generales, tema, idioma, notificaciones, gestión de cuenta |
| `src/screens/SafeZonesScreen.tsx` | 841 | **Círculos editables con radio en metros sobre el mapa** — base directa del radio de 20 m por medición |
| `src/screens/DeviceSettingsModal.tsx` | 1.273 | Configuración por dispositivo, umbrales y toggles |
| `src/screens/DevicePairingScreen.tsx` | 425 | **Emparejamiento BLE** con `react-native-ble-plx` |
| `src/screens/QRScannerScreen.tsx` | 333 | Escáner QR de vinculación |
| `src/screens/QRShareScreen.tsx` | 184 | Generación y compartición de QR |
| `src/screens/PermissionsScreen.tsx` | 273 | Solicitud guiada de permisos BLE, ubicación y cámara |
| `src/screens/EmptyStateScreen.tsx` | 173 | Estado vacío de primer uso |
| `src/components/ElderBottomSheet.tsx` | 229 | **La "burbuja" de detalle** al tocar un punto del mapa |
| `src/components/DeviceBubbleSelector.tsx` | 165 | Selector horizontal de dispositivos en burbujas |
| `src/components/HelpGuideModal.tsx` | 158 | Guía de ayuda contextual |
| `src/constants/theme.ts` | — | Sistema de diseño: paletas clara/oscura, tipografía, espaciado |
| `src/constants/i18n.ts` | — | Internacionalización ES/EN |
| `src/services/supabase.ts` | — | Cliente Supabase configurado |
| `src/services/deviceProvisioningService.ts` | — | Aprovisionamiento de dispositivos |
| `src/services/notifications.ts` | — | Push con `expo-notifications` |
| `src/store/useAppStore.ts` | — | Estado global con Zustand |
| `src/utils/security.ts` | — | Utilidades de seguridad |
| `src/utils/deviceId.ts` | — | Formato de ID (⚠️ **requiere reescritura**, ver tarea B4) |
| `plugins/withAndroidSecurity.js` | — | Endurecimiento del build de Android |

### 2.2. Consola Web (`Web/`) — React 19 · Vite · Tailwind 4

`LoginScreen.tsx` (410) · `DeviceDetailView.tsx` (982) · `GlobalSearch.tsx` (234) ·
`OtaFirmwareModal.tsx` (251) · `Navbar.tsx` (107) · `services/api.ts` · `services/auth.ts` ·
`utils/bioclimaticStatus.ts` (patrón de semáforo por umbrales, adaptable al agronómico).

Incluye `Web/Referencias UI/` con 6 capturas del diseño aprobado.

### 2.3. Backend (`supabase/`)

24 migraciones SQL, 5 Edge Functions, plantillas de correo (`recovery.html`, `confirmation.html`) y
`config.toml`. Las migraciones incluyen endurecimiento de RLS, RPCs de administración, triggers de
notificación y flujo de aprobación de usuarios secundarios.

---

## 3. Mapa de Traducción de Dominio

Esta tabla es la referencia para renombrar durante todo el proceso.

| Akura (dominio médico) | TerraSense (dominio agronómico) | Nota |
| :--- | :--- | :--- |
| `elders` | **`predios`** | La entidad monitoreada: parcela o potrero |
| `elder` / adulto mayor | **`predio`** / potrero | |
| `devices` | **`devices`** | Se mantiene: sonda TerraSense |
| `caregiver_elders` | **`usuario_predios`** | Vínculo usuario ↔ predio |
| `caregiver` / cuidador | **`agricultor`** / `asesor` / `operador` | Ver matriz de roles 6.5 del README |
| `geofence_zones` | **`mediciones`** | ⭐ Aporta lat/lng/**radio en metros**/activo: es exactamente el círculo de 20 m |
| `location_telemetry` | **`mediciones_telemetria`** | Pasa de 1 valor a **7 parámetros** de suelo + 3 ambientales |
| `emergency_alerts` | **`alertas_agronomicas`** | Helada, salinidad crítica, asfixia radicular |
| `medical_profiles` | **`perfiles_cultivo`** | Umbrales fisiológicos por especie y **por etapa fenológica** |
| Caída / SOS | **Veredicto rojo** del semáforo | |
| Zona segura | **Radio de representatividad** de la medición | |
| `bioclimaticStatus.ts` | **`semaforoAgronomico.ts`** | Mismo patrón de umbrales → color |

> [!IMPORTANT]
> **Campo nuevo sin equivalente en Akura:** `etapa_fenologica`, obligatorio en `mediciones`, con valores
> `pre_siembra`, `vegetativo`, `floracion`, `cosecha`. Es la consecuencia directa del ámbito de uso declarado en
> la Sección 1.3 del README: TerraSense acompaña las **cuatro etapas**, no sólo la siembra.

---

## 4. FASE A — Infraestructura: Supabase y Vercel por CLI

> Ambos CLI ya están instalados. Estas tareas requieren las credenciales del entorno local.

- [x] **A1.** Crear el proyecto Supabase.
  ```bash
  supabase login
  supabase projects create terrasense --org-id <TU_ORG_ID> --region sa-east-1
  # sa-east-1 (São Paulo) es la región más cercana a Chile: menor latencia
  # y argumento favorable para la transferencia internacional de datos (§12.5 del README)
  ```

- [x] **A2.** Inicializar y vincular el proyecto local.
  ```bash
  cd C:/Users/alvar/TerraSence
  supabase init
  supabase link --project-ref <PROJECT_REF>
  ```

- [x] **A3.** Habilitar PostGIS, requerido por el mapa predial.
  ```sql
  create extension if not exists postgis;
  ```

- [x] **A4.** Copiar y adaptar las migraciones de Akura (ver FASE B), y aplicarlas.
  ```bash
  supabase db push
  ```

- [x] **A5.** Plantillas `recovery.html` y `confirmation.html` reescritas con la marca TerraSense
      (paleta agronómica, HTML de tabla compatible con clientes de correo).
      ⚠️ **Bloqueadas por el plan de Supabase**, no por el código:
      `400: Email template modification is not available for free tier projects using the default
      email provider.` Quedan comentadas en `config.toml` porque activarlas hace fallar cualquier
      `supabase config push` posterior. Para usarlas: configurar SMTP propio (Resend o SendGrid
      tienen plan gratuito) y descomentar, o pegarlas a mano en el panel.
      **Recomendado el SMTP propio:** el remitente por defecto de Supabase tiene límite de envíos y
      baja entregabilidad, lo que en producción significa correos de recuperación que no llegan.

- [ ] **A6.** Configurar Authentication en el panel: proveedor de correo, URL de redirección
      de recuperación de contraseña y plantillas personalizadas.

- [ ] **A7.** Crear el proyecto en Vercel para la consola web.
  ```bash
  vercel login
  cd C:/Users/alvar/TerraSence
  vercel link
  vercel env add VITE_SUPABASE_URL production
  vercel env add VITE_SUPABASE_ANON_KEY production
  vercel env add VITE_GOOGLE_MAPS_API_KEY production
  ```

- [ ] **A8.** Crear `vercel.json` en la raíz, adaptado desde Akura.
  ```json
  {
    "buildCommand": "cd Web && npm install && npm run build",
    "outputDirectory": "Web/dist",
    "framework": "vite",
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

- [ ] **A9.** Primer despliegue de verificación: `vercel --prod`.

---

## 5. FASE B — Esquema de Base de Datos

- [x] **B1.** Copiar `supabase/migrations/20260820000000_initial_schema.sql` de Akura como base y traducir
      los nombres según la Sección 3.
- [x] **B2.** Consolidar las 24 migraciones de Akura en **una sola migración inicial limpia**. Akura acumula
      correcciones sucesivas (`fix_`, `harden_`, `comprehensive_`) que no tiene sentido replicar: interesa el
      **estado final**, no el camino.
- [x] **B3.** Añadir las tablas propias del dominio agronómico.
- [x] **B4.** ⚠️ **Reescribir la generación de Device ID.** No portar `formatDeviceId` de Akura: deriva 10 dígitos
      por *hash* de UUID y tiene colisiones garantizadas por la paradoja del cumpleaños. TerraSense usa
      **15 dígitos aleatorios con restricción `UNIQUE`** — algoritmo canónico en la Sección 6.5.1 del README.
- [x] **B5.** Replicar las políticas RLS con la nueva nomenclatura y **auditar cada una**: es el punto donde un
      renombrado descuidado abre acceso entre inquilinos.
- [x] **B6.** Crear índice geoespacial GiST sobre la columna de geometría.

```sql
-- Núcleo del esquema TerraSense adaptado desde Akura

create table if not exists public.predios (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  superficie_ha numeric(10,2),
  cultivo_actual text,
  geom          geometry(Polygon, 4326),          -- perímetro opcional del predio
  created_at    timestamptz not null default now()
);

create table if not exists public.devices (
  id            uuid primary key default gen_random_uuid(),
  device_id     varchar(15) not null unique
                  check (device_id ~ '^[1-9][0-9]{14}$'),   -- 15 dígitos, ver B4
  predio_id     uuid references public.predios(id) on delete set null,
  firmware_ver  text,
  bat_pct       smallint,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

create type etapa_fenologica as enum
  ('pre_siembra', 'vegetativo', 'floracion', 'cosecha');

create type veredicto_semaforo as enum ('verde', 'ambar', 'rojo');

-- ⭐ Hereda de geofence_zones de Akura: lat/lng + radio en metros
create table if not exists public.mediciones (
  id              uuid primary key default gen_random_uuid(),
  predio_id       uuid not null references public.predios(id) on delete cascade,
  device_id       uuid references public.devices(id) on delete set null,
  operador_id     uuid references auth.users(id),

  latitude        double precision not null,
  longitude       double precision not null,
  gps_accuracy_m  real,                             -- precisión reportada por el GPS
  radio_m         integer not null default 20,      -- radio de representatividad
  geom            geometry(Point, 4326)
                    generated always as (st_setsrid(st_makepoint(longitude, latitude), 4326)) stored,

  etapa           etapa_fenologica not null,        -- campo nuevo, sin equivalente en Akura
  veredicto       veredicto_semaforo not null,

  -- 7 parámetros de suelo
  vwc_pct         real, temp_suelo_c real, ec_us_cm integer, ph real,
  n_mg_kg         integer, p_mg_kg integer, k_mg_kg integer,
  -- 3 parámetros ambientales (BME280)
  temp_aire_c     real, hr_pct real, presion_hpa real,

  -- Trazabilidad exigida por el principio P4 del README
  engine_version  text not null,
  crop_catalog_version text not null,
  diagnostico     jsonb,

  medido_at       timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists idx_mediciones_geom_gist on public.mediciones using gist (geom);
create index if not exists idx_mediciones_predio_fecha on public.mediciones (predio_id, medido_at desc);

alter table public.predios     enable row level security;
alter table public.devices     enable row level security;
alter table public.mediciones  enable row level security;
```

### 5.1. Corrección de seguridad aplicada sobre el esquema adoptado

Al auditar el esquema ya desplegado se encontró que **las 7 tablas tenían una única política
idéntica: `FOR ALL TO public USING (true)`**. RLS estaba activo pero completamente permisivo.
Como la clave anónima viaja embebida en cada binario y es pública por diseño, cualquiera podía
leer, modificar y borrar todas las filas de todas las tablas, incluida `profiles`.

- [x] **B7.** Auditoría de políticas mediante migraciones que sólo emiten `RAISE NOTICE`
      (`20260827130000`), única vía disponible sin Docker ni `psql`.
- [x] **B8.** Cierre del RLS abierto (`20260827140000`): 7 políticas permisivas eliminadas y
      20 políticas acotadas por operación, limitadas al rol `authenticated`.
- [x] **B9.** `has_device_access()` en `SECURITY DEFINER` para evitar la recursión entre las
      políticas de `devices` y `device_members`.
- [x] **B10.** Trigger `link_device_creator`: sin él, el usuario da de alta un equipo y la propia
      política SELECT se lo oculta acto seguido.
- [x] **B11.** RPC `join_device_by_code` (`20260827160000`): permite que un operador se vincule
      con el código de 15 dígitos sin abrir `devices` a búsquedas enumerables. Incluye límite de
      10 intentos fallidos por hora y mensaje de error idéntico exista o no el equipo.
- [x] **B12.** Verificación posterior (`20260827150000`): 0 políticas expuestas al rol `public`
      y 0 políticas `ALL USING(true)` en las 7 tablas.

**Reversión** documentada en la cabecera de `20260827140000_cerrar_rls_abierto.sql`.

---

## 6. FASE C — Migración de la App Móvil

- [x] **C1.** Copiar el andamiaje base de `App/`.
  ```bash
  cd C:/Users/alvar/TerraSence
  cp -r ../Akura/App ./App
  rm -rf App/node_modules App/.expo App/app.json
  # app.json se sustituye por app.config.js (tarea S5)
  ```
- [x] **C2.** Actualizar identidad en `app.config.js`: `name: "TerraSense"`, `slug: "terrasense"`,
      `package: "cl.terrasense.app"`, iconos y splash propios.
- [x] **C3.** Ajustar permisos Android: mantener BLE, ubicación y cámara; **retirar
      `ACCESS_BACKGROUND_LOCATION`** — TerraSense mide bajo demanda y no rastrea en segundo plano.
      Es además el permiso que Google Play somete a revisión manual, y evitarlo acelera la publicación
      y reduce la exposición bajo la Ley 21.719.
- [x] **C4.** Adaptar `src/constants/theme.ts`: sustituir la paleta teal/coral de Akura por la paleta
      agronómica de TerraSense, conservando la estructura de tokens y el soporte de tema claro/oscuro.
- [x] **C5.** **Portar `DashboardScreen.tsx` como pantalla principal del mapa.** Es la tarea central:
  * Sustituir el marcador único del adulto mayor por **N marcadores de medición**.
  * Reemplazar el color fijo de zona segura por el **color del semáforo** de cada medición.
  * Radio: usar `medicion.radio_m` (20 m por defecto) en lugar de `zone.radiusMeters`.
  * Añadir el **botón flotante «Medir ahora»** centrado en la parte inferior.
  * Cambiar el tipo de mapa a `hybrid` (satelital con etiquetas).
  * Añadir el **icono central** en cada círculo (✓ / ! / ✕) por accesibilidad WCAG 2.2 AA.
- [x] **C6.** Adaptar `ElderBottomSheet.tsx` → `MedicionBottomSheet.tsx`: la burbuja de detalle debe
      mostrar etapa fenológica, antigüedad, los 7 parámetros y el veredicto resumido.
- [x] **C7.** Portar `AuthScreen.tsx` prácticamente sin cambios: sólo textos, marca y paleta.
      **Es el mayor ahorro de la migración.**
- [ ] **C8.** Adaptar `SafeZonesScreen.tsx` → gestión de **predios múltiples con perímetro dibujado**.
      Parcialmente cubierto: `FieldSettingsScreen` ya permite nombre de predio, cultivo y textura.
- [x] **C9.** **Enlace BLE implementado** en `bleService.ts`: permisos de Android 12+, espera a que
      la radio esté encendida, escaneo filtrado por UUID de servicio, lectura por *notify* con
      tiempo límite y desconexión garantizada en `finally` —sin ella la sonda no vuelve a sueño
      profundo y se agota la batería en días—. `probeService` lo usa con importación diferida y
      degrada a simulación declarada donde no hay módulo nativo (Expo Go).
      ⚠️ **Escrito y compilado, pero SIN PROBAR contra hardware real.** Es el único bloque del
      proyecto que no puede verificarse sin la sonda física.
- [x] **C10.** Adaptar `src/types/app.ts` al nuevo modelo de dominio.
- [x] **C11.** Añadir el **selector de etapa fenológica** en el flujo de medición (obligatorio, ver Sección 3).
- [x] **C12.** Crear `src/engine/` — el motor agronómico. **No existe en Akura: es desarrollo propio.**
- [x] **C13.** Implementar la **degradación grácil del mapa sin cobertura** (README 6.1.1).
      ⚠️ Corregido respecto al plan original: **no se precargan teselas**. Los Términos de
      Servicio de Google Maps Platform lo prohíben expresamente. El mapa pasa a fondo neutro
      conservando círculos, escala y posición GPS, que son capas vectoriales locales.
- [x] **C14.** Verificar compilación: `npm install && npx expo start`.

### Tareas completadas que no estaban en el plan original

- [x] **C15.** `HistoryScreen`: mediciones en lista, agrupadas por día y filtrables por etapa, con resumen del predio.
- [x] **C16.** `DevicesScreen` + `deviceService`: alta de equipo, código de 15 dígitos y selección del equipo activo.
- [x] **C17.** Corrección de dos huecos lógicos del motor rescatado: la rama `WARNING` de temperatura y humedad era código muerto, y `texture.ur` / `texture.cc` estaban definidos sin usarse.
- [x] **C18.** Soporte de `.env` en la raíz del repositorio además de `App/.env`.
- [x] **C20.** Registro del token de notificaciones (`notifications.ts`). Cierra la mitad que
      faltaba del circuito de alertas: `send-push-alert` leía `profiles.push_token` y lo encontraba
      siempre vacío porque nada en la app lo escribía. Se registra tras iniciar sesión, no al
      arrancar, y se borra al cerrar sesión para que el teléfono no siga recibiendo avisos ajenos.
- [x] **C19.** Verificación de empaquetado real con `expo export`, no sólo `tsc`.

---

## 7. FASE D — Migración de la Consola Web

- [x] **D1.** Andamiaje Vite + React 19 + Tailwind 4 creado y compilando.
- [x] **D2.** Identidad TerraSense aplicada (paleta agronómica y título propios).
- [x] **D3.** `LoginScreen` con inicio de sesión y recuperación de contraseña.
- [x] **D4.** `Dashboard` con tres pestañas: mediciones, equipos y validación de laboratorio.
- [x] **D5.** `utils/verdict.ts` sustituye a `bioclimaticStatus.ts`, con icono y etiqueta además del color.
- [x] **D6a.** Búsqueda por predio, cultivo, veredicto y código de equipo.
- [ ] **D6b.** `OtaFirmwareModal`: gestión de firmware OTA. Depende de que exista firmware que desplegar.
- [x] **D7.** **Visor GIS con mapa de calor IDW** — desarrollo propio, no existe en Akura.
      Interpolación por ponderación inversa de la distancia (p = 2) calculada en canvas dentro del
      navegador, sobre 7 variables seleccionables. No usa proveedor de teselas ni clave de API, así
      que no hay restricción de términos de servicio. Kriging queda descartado: PostGIS no lo
      implementa y Supabase no habilita `PL/R` ni `PL/Python`.
- [ ] **D8.** Revisar las capturas de `Web/Referencias UI/` de Akura para afinar el diseño.

---

## 8. FASE E — Firmware y Edge Functions

- [x] **E1.** Edge Function `device-checkin` **desplegada y probada en producción**. Recibe la trama
      de 7 parámetros de suelo, actualiza el estado del equipo y genera alerta automática ante
      veredicto rojo. Autentica por `device_code`, que no es un secreto fuerte: por eso exige que el
      equipo exista y esté activo, y devuelve el mismo mensaje genérico tanto si el código no existe
      como si está inactivo, para no filtrar códigos válidos.
- [x] **E2.** `send-push-alert` **desplegada**. Despacha por Expo Push las alertas que
      `device-checkin` genera. Van separadas a propósito: el registro de la alerta no depende de que
      el envío funcione. Sólo marca `is_read` si algo llegó a salir, para que un fallo de Expo no
      silencie la alerta para siempre. Protegida por JWT: exige clave de servicio.
- [x] **E3.** Descartadas `contextual-fall-ai`, `medical-card` y `send-caregiver-approval-push`: dominio médico sin equivalente agronómico.
- [ ] **E4.** El firmware de TerraSense es propio: Akura usa nRF9160 celular, no ESP32 con BLE.
      **Reutilizable sólo el patrón de check-in y OTA, no el código.**

---

## 9. Lo que NO se Debe Copiar

| Elemento | Motivo |
| :--- | :--- |
| `App/app.json` con la clave de Maps | **Clave expuesta** — ver Sección 1 |
| `formatDeviceId` de Akura | 10 dígitos por *hash*, con colisiones. TerraSense usa 15 aleatorios |
| `Pollers/` (Apple/Google) | Específico del rastreo por redes *Find My* / FMDN; TerraSense no lo usa |
| `medical_profiles`, `contextual-fall-ai`, `medical-card` | Dominio médico sin equivalente |
| `ACCESS_BACKGROUND_LOCATION` | No necesario y penaliza la revisión en Play Store |
| Las 24 migraciones históricas | Consolidar en una limpia (tarea B2) |
| Historial de Git de Akura | Contiene la clave comprometida |
| Documentos de fase de Akura (`FASE_B_…`, `AUDITORIA_…`) | Pertenecen a la memoria de aquel proyecto |

---

## 10. Variables de Entorno Requeridas

> No están en este entorno, pero sí en el equipo local. Crear los archivos a partir de estos ejemplos.

```bash
# App/.env
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<clave-nueva-restringida>   # NUNCA la de Akura

# Web/.env
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_GOOGLE_MAPS_API_KEY=<clave-nueva-restringida>
```

- [ ] Verificar que `.gitignore` incluye `.env`, `.env.local`, `App/.env`, `Web/.env`.
- [ ] Publicar únicamente los `.env.example` correspondientes.

---

## 11. Checklist Maestro Ordenado

**Bloque 0 — Seguridad (bloqueante)**
- [ ] S1 · Revocar la clave de Google Maps expuesta
- [ ] S2–S4 · Claves nuevas, restringidas, con cuotas y alertas
- [ ] S5–S6 · `app.config.js` + `.gitignore` verificado

**Bloque 1 — Infraestructura**
- [x] A1–A3 · Proyecto Supabase creado, vinculado, con PostGIS
- [ ] A7–A9 · Vercel vinculado y primer despliegue

**Bloque 2 — Datos**
- [x] B1–B3 · Esquema traducido y aplicado
- [x] B4 · Device ID de 15 dígitos implementado
- [x] B5–B6 · RLS auditada e índice GiST creado

**Bloque 3 — App móvil**
- [x] C1–C4 · Andamiaje, identidad, permisos y tema
- [x] C5–C6 · **Mapa principal y burbuja de detalle** ⭐
- [ ] C7–C10 · Autenticación, predios, emparejamiento y tipos
- [x] C11 · Selector de etapa fenológica
- [x] C12 · Motor agronómico (desarrollo propio)
- [ ] C13–C14 · Precarga de teselas y compilación verificada

**Bloque 4 — Web y backend**
- [ ] D1–D8 · Consola web migrada y visor GIS
- [ ] E1–E4 · Edge Functions adaptadas

**Bloque 5 — Cierre**
- [ ] A5–A6 · Correos de recuperación con marca propia y probados extremo a extremo
- [ ] Prueba de campo: medir sin cobertura y verificar sincronización posterior
- [ ] Actualizar la Sección 9.3 del README con los comandos reales de puesta en marcha

---

*Documento de migración · TerraSense ← Akura · Repositorio de origen: `Alvarinhoooo7/Akura`*

# 🖥️ TerraSense · Consola Web de Administración y Backoffice

> Documentación de la consola web. Incluye el detalle 2×5 en la flota y en la ficha de soporte, y el ambiente y la batería en la exportación CSV. La consola no dibuja mapas.
>
> **Auditoría del 21-09-2026:** lo encontrado, lo corregido y lo que queda pendiente está en [TAREAS.md](TAREAS.md). La migración `20260921120000` en la que se apoyan la flota y el estado de firmware **ya está aplicada y verificada** en el proyecto enlazado.

## Mediciones e inventario

Las rutas `/fleet` (Flota) y `/measurements` (Mediciones) cubren todo el parque, no sólo los equipos donde la sesión es miembro. No leen `devices` ni `soil_measurements` desde el navegador —ambas están acotadas por RLS a la membresía, y una cuenta de soporte no es miembro de ninguna— sino las RPC `admin_list_fleet()` y `admin_list_recent_measurements()`, cuyo perímetro es `is_support_staff()`. Para el detalle de un equipo concreto se sigue usando `/admin/devices/:id`.

El historial y la ficha de soporte permiten expandir una lectura al Grid **2×5** de [App](../App/README.md#interfaz-e-integración-actualizadas-al-11-09-2026): humedad del suelo/CE, temperatura del suelo/N, P/K, pH/temperatura ambiente, humedad relativa/presión. Se indican unidades y datos ausentes; N/P/K quedan separados e informativos, sin validación química ni cálculo de dosis. Batería, fecha, completitud y estado se presentan aparte. `diagnosis.localSource` permite identificar las capturas del nuevo flujo; un histórico sin marca se muestra con origen ambiental no verificado.

El CSV de soporte incluye las diez variables, batería en captura, fecha y diagnóstico con fuentes y pronóstico guardado. El pronóstico no sustituye a las tres variables BME280 ni ocupa tarjetas del Grid. El historial conserva las cuatro fases y los registros sin ubicación; las coordenadas se exportan como números, no se proyectan.

El panel muestra **Reporte reciente** en lugar de afirmar conexión permanente: `devices.last_seen_at` no verifica una conexión BLE activa. El esquema y `admin_get_device_detail` fueron actualizados mediante la [migración aplicada y verificada en Supabase](../supabase/README.md#persistencia-ambiental-y-bateria).

Verificación de esta entrega: `npm test` pasó 16 pruebas (exportación CSV y formateo); `npm run build` pasó TypeScript —ahora con `strict` activado— y generó el build Vite. Esto no publica ese build. Siguen pendientes las pruebas visuales en navegador y una auditoría de accesibilidad con herramienta, además del roadmap de tickets, OTA real, alertas preventivas y canary. Autonomía, exactitud, IP67 y ahorro siguen sujetos a ensayos; la página técnica, QR y expediente comercial se validan por separado.

---

Consola central de operaciones técnicas, gestión de flota por soporte y distribución de firmware desarrollada en **React 19 + Vite 6 + Tailwind CSS v4 + TypeScript + React Router v7**. 
Es la **herramienta de backoffice del creador/administrador (Álvaro)** para supervisar las sondas TerraSense en terreno, auditar la salud técnica del hardware, gestionar miembros, resolver casos de soporte y consultar el catálogo de firmware o enviar avisos individuales de actualización; la instalación OTA real y el despliegue masivo siguen pendientes.

> [!IMPORTANT]
> **Propósito Exclusivo de Backoffice:**
> * **No es un portal de agricultores ni un SaaS con suscripciones.** En TerraSense, el agricultor opera de forma 100% autónoma en terreno mediante la **App Móvil** (offline-first, sin planes mensuales ni cobros recurrentes).
> * **La Consola Web es estrictamente un Backoffice Operativo:** Concentra la gestión de equipos a través del **Panel de Soporte Técnico** y el catálogo central de **Firmware OTA**.
> * **Despliegue en Producción:** La consola se encuentra desplegada y operativa en **https://terrasense-web.vercel.app**.

---

## 📑 Contenido

- [1. Alcance Operativo del Backoffice](#1-alcance-operativo-del-backoffice)
- [2. Módulos y Enrutamiento Central](#2-módulos-y-enrutamiento-central)
  - [2.1. Panel de Soporte y Gestión de Equipos (`/admin`)](#21-panel-de-soporte-y-gestión-de-equipos-admin)
  - [2.2. Ficha Técnica, Telemetría y Acciones Individuales (`/admin/devices/:id`)](#22-ficha-técnica-telemetría-y-acciones-individuales-admindevicesid)
  - [2.3. Catálogo de Firmware OTA (`/firmware`)](#23-catálogo-de-firmware-ota-firmware)
  - [2.4. Gobernanza del Equipo de Soporte (`/admin/staff`)](#24-gobernanza-del-equipo-de-soporte-adminstaff)
  - [2.5. Flota y Mediciones (`/fleet`, `/measurements`)](#25-flota-y-mediciones-fleet-measurements)
  - [2.6. Validación de Laboratorio (`/validation`)](#26-validación-de-laboratorio-validation)
- [3. Sistema de Diseño y Modo Claro/Oscuro](#3-sistema-de-diseño-y-modo-clarooscuro)
- [4. Estructura de carpetas](#4-estructura-de-carpetas)
- [5. Capa Backend y Funciones RPC](#5-capa-backend-y-funciones-rpc)
- [6. Seguridad y Aislamiento (Postgres RLS)](#6-seguridad-y-aislamiento-postgres-rls)
  - [6.1. ⚠️ Pendiente: contraseña de soporte en texto plano](#61--pendiente-contraseña-de-soporte-en-texto-plano-en-producción)
- [7. Variables de entorno](#7-variables-de-entorno)
- [8. Comandos de desarrollo](#8-comandos-de-desarrollo)
- [9. Despliegue en Vercel](#9-despliegue-en-vercel)
- [10. Correos transaccionales y recuperación de acceso](#10-correos-transaccionales-y-recuperación-de-acceso)
- [11. Estado de Implementación y Roadmap Futuro del Backoffice](#11-estado-de-implementación-y-roadmap-futuro-del-backoffice)
- [12. Comprobaciones del repositorio](#12-comprobaciones-del-repositorio)

---

## 1. Alcance Operativo del Backoffice

Esta consola resuelve de forma unificada las necesidades de post-venta, soporte y mantenimiento técnico de TerraSense:

1. **Gestión de Flota Centralizada en Soporte:** el buscador del panel localiza un equipo concreto (por código de 15 dígitos, alias o correo del usuario); la sección **Flota** recorre el parque completo con su estado energético, de firmware y de membresías.
2. **Diagnóstico Técnico y Salud de la Sonda:** histórico de porcentaje de batería (`device_status_log` no registra voltaje), último reporte recibido y últimas mediciones, para diagnosticar el comportamiento de los sensores en terreno.
3. **Administración de Membresías:** aprobar pendientes, delegar el único administrador (`admin`) y eliminar usuarios (`user`). Al delegar, el administrador anterior pasa a usuario. Debe conservarse al menos un miembro; sólo el reset elimina todos. El acceso al backoffice se controla en `admin_support_users`, independientemente de los roles de equipo. [Contrato, reset y despliegue](../supabase/ADMINISTRACION.md).
4. **Reseteo de Fábrica (Factory Reset):** Proceso seguro para desvincular a todos los miembros y limpiar mediciones privadas ante ventas o transferencias entre agricultores, preservando la identidad de hardware de la sonda.
5. **Firmware OTA:** catálogo de consulta y contraste de la flota contra él. La consola **no envía avisos**: puede comprobar que una versión publicada es aplicable a un equipo, nada más. La carga de binarios, su verificación, instalación y despliegue masivo siguen pendientes (§11.2).

---

## 2. Módulos y Enrutamiento Central

La plataforma se organiza en torno a dos ejes operativos bien diferenciados:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TERRASENSE · BACKOFFICE WEB                           │
├──────────────────────────────┬──────────────────────┬───────────────────────┤
│ OPERACIÓN                    │ CATÁLOGOS            │ ADMINISTRACIÓN        │
│ /admin         buscador      │ /firmware    OTA     │ /admin/staff          │
│ /admin/devices/:id   ficha   │ /validation  lab     │ alta, baja y código   │
│ /fleet         inventario    │ (ambos solo lectura) │ de invitación         │
│ /measurements  lecturas      │                      │                       │
└──────────────────────────────┴──────────────────────┴───────────────────────┘
```

### 2.1. Panel de Soporte y Gestión de Equipos (`/admin`)
* **Acceso Restringido:** Protegido a nivel de base de datos mediante la función `is_support_staff()`. Si el usuario no pertenece a la tabla `admin_support_users`, Postgres bloquea la llamada con código de error `42501`.
* **Buscador Multicriterio (`admin_search`):** Permite localizar instantáneamente cualquier sonda de la flota introduciendo:
  - El código numérico único de 15 dígitos del hardware.
  - El alias o nombre asignado al equipo.
  - El correo electrónico de cualquier usuario vinculado (dueño, administrador u operador).
* **Resultados en Tiempo Real:** Muestra tarjetas interactivas con badges de rol, motivo de coincidencia (`device_code`, `member_email`, `alias`), estado de conectividad en vivo y enlace directo a la ficha del equipo.

### 2.2. Ficha Técnica, Telemetría y Acciones Individuales (`/admin/devices/:id`)
Página de control exhaustivo para un equipo seleccionado, alimentada por la RPC `admin_get_device_detail(p_device_id)`:
1. **Identidad del Hardware:** Código de vinculación formateado (`48213-90574-16628`), plataforma de hardware, versión de firmware activa frente al catálogo publicado y último reporte recibido. El estado de firmware distingue cuatro situaciones —al día, desactualizado, sin catálogo y versión ilegible—: antes las dos últimas se confundían con la primera bajo un único «al día».
2. **Telemetría de Batería Li-Ion:**
   - Historial de hasta 100 lecturas de porcentaje. `device_status_log` no registra voltaje ni estado de carga.
   - Filtro interactivo por rango de fechas (`Desde` / `Hasta`) para examinar curvas de descarga en terreno y diagnosticar problemas energéticos.
3. **Historial de Mediciones Agronómicas:**
   - Tabla de las últimas 50 lecturas tomadas por el equipo (humedad, temperatura de suelo, CE, pH, N, P, K) con su veredicto, campo y etapa fenológica, para verificar el funcionamiento de los sensores.
   - Los valores N/P/K se muestran agrupados y con una advertencia en pantalla: se derivan de la conductividad eléctrica, no de electrodos ion-selectivos, así que sirven para comprobar que el sensor responde, no para calcular dosis.
4. **Gestión de Miembros y Roles:**
   - Visualización de todos los usuarios asociados a la sonda con sus respectivos correos y roles.
   - Botón para delegar en otro usuario aprobado (`setMemberRole`). El administrador anterior pasa a `user` y el destinatario a `admin`.
   - La desvinculación pide confirmación en la propia fila. La consola no usa `alert()` ni `confirm()`: un diálogo modal del navegador bloquea el hilo, no deja rastro de lo ocurrido y no se puede leer después; los resultados se muestran como aviso en pantalla.
   - Tres acciones distintas sobre un miembro: **aprobar** una solicitud pendiente, **suspender** el acceso conservando la membresía y **desvincular** por completo (`setMemberAuthorized` con `true`/`false`, y `removeMember`). Suspender no era posible desde la interfaz hasta la auditoría del 21-09-2026, aunque la RPC lo aceptaba desde el primer día.
5. **Comprobación de Firmware (`admin_push_firmware_update`):**
   - Selector de versión, alimentado por `listPublishedFirmware()`, para verificar contra el servidor que una versión publicada es aplicable a esta sonda.
   - **Lo que hace y lo que no:** comprueba, y nada más. **No envía ningún aviso.** La RPC conserva el nombre histórico pero dejó de encolar alertas push en `20260920120000_preparar_equipo_propietario.sql` —sin atestación física del firmware, empujar «actualízate» desde el backoffice anuncia algo que la consola no puede garantizar— y su propia respuesta lo dice. La pantalla muestra ese `message` tal cual, en vez de un texto propio que pudiera volver a desalinearse.
   - El selector muestra el `hardware_target` de cada versión y no filtra por el `hardware_version` del equipo: un desplegable vacío por un desajuste de cadenas sería peor que dejar elegir con criterio.
7. **Exportación de Telemetría (CSV):** Tanto el rango de batería visible como las mediciones agronómicas se descargan en CSV con separador `;` y BOM UTF-8, para que Excel en configuración regional española los abra en columnas y sin romper los acentos.
6. **Reseteo de Fábrica Seguro (`FactoryResetModal`):**
   - Permite restablecer la sonda a valores de fábrica cuando un agricultor vende o regala su equipo.
   - **Confirmación Estricta:** Exige reescribir manualmente el código de 15 dígitos del equipo para desbloquear el botón.
   - **Ejecución Atómica (`admin_factory_reset_device`):** Desvincula a todos los miembros y elimina el historial privado —mediciones, alertas, invitaciones de acceso y el registro de batería—, manteniendo intactos el `device_code`, el firmware y el hardware para que un nuevo agricultor lo vincule como primer dueño.

### 2.3. Catálogo de Firmware OTA (`/firmware`)
* **Solo lectura, a propósito.** La política RLS de `firmware_releases` sólo expone las versiones publicadas y reserva la escritura al rol de servicio: publicar un binario que se instalará sin supervisión en equipos repartidos por el campo no debe poder hacerse con una sesión de navegador.
* Lista cada versión con su `hardware_target`, estado (publicada o borrador), tamaño, SHA-256 y fecha, marcando en rojo las que no traen firma.
* **Contraste de flota:** compara la versión instalada de cada equipo contra la última publicada para su plataforma. El contraste lo calcula ahora Postgres (`admin_list_fleet()` devuelve `firmware_status` por equipo) sobre el parque completo, no el navegador sobre la tabla `devices` acotada por membresía. La página distingue además los equipos «sin catálogo» —los que declaran una plataforma para la que no hay ninguna versión publicada— de los que sí están al día: antes ambos casos se presentaban igual.
* La publicación de una versión nueva se documenta en la propia página, con el SQL que se ejecuta con la clave de servicio.

### 2.4. Gobernanza del Equipo de Soporte (`/admin/staff`)
Pantalla para decidir quién entra al backoffice, apoyada en `admin_support_users`:
* **Listado del equipo:** nombre, correo y estado de cada persona, distinguiendo tres situaciones —activo, suspendido e *invitado sin registrar* (fila creada con el correo pero sin `user_id` porque todavía no completó el alta)—. La lectura no necesita RPC: la política `support_select_staff` ya deja ver la tabla completa a quien pertenece al panel, y sólo su propia fila a quien no.
* **Suspender y reactivar (`admin_set_staff_active`):** el servidor rechaza la autodesactivación, y la interfaz además no ofrece el botón sobre la propia fila.
* **Rotación del código de invitación (`admin_rotate_invite_code`):** exige un mínimo de 8 caracteres y confirmación por duplicado. Postgres guarda sólo el hash bcrypt, de modo que el código vigente no se puede consultar desde aquí: si se pierde, se rota.
* **Alta autoservicio (`support_self_register`):** una sesión válida que todavía no pertenece al equipo no aterriza en un inventario vacío, sino en un formulario de alta con nombre y código de invitación. Es el control que impide que llegar a la URL del panel baste para entrar, dado que `auth.users` se comparte con la app de agricultores. Cinco intentos fallidos en una hora bloquean el alta desde la base de datos.

### 2.5. Flota y Mediciones (`/fleet`, `/measurements`)
Las dos pantallas que recorren el parque completo, ambas sobre RPC con perímetro `is_support_staff()`:

* **`/fleet` (`admin_list_fleet`)** — inventario con código, batería, firmware y su estado frente al catálogo, número de miembros, solicitudes pendientes de aprobación y recuento de mediciones por equipo. Filtros rápidos por sin reporte reciente, batería bajo 20 %, con solicitudes y firmware atrasado; búsqueda por código, alias o plataforma; export CSV de lo visible.
* **`/measurements` (`admin_list_recent_measurements`)** — últimas 300 lecturas de toda la flota, con el equipo resuelto en la misma fila, filtro por veredicto y despliegue del detalle 2×5 por lectura. El servidor topa el límite en 500: es una pantalla de diagnóstico, no un export masivo.

> [!NOTE]
> Ninguna de las dos lee `devices` ni `soil_measurements` desde el navegador. Ambas tablas están acotadas por RLS a los equipos donde la sesión es **miembro**, y una cuenta de soporte no lo es de ninguno: leerlas directamente devolvía siempre cero filas. Es el defecto que la auditoría del 21-09-2026 corrigió con la migración `20260921120000`, ya aplicada.

`/devices`, el nombre anterior del inventario, redirige a `/fleet` para no romper los enlaces guardados por el equipo de soporte.

### 2.6. Validación de Laboratorio (`/validation`)
Corpus de contraste contra laboratorios acreditados: por muestra, el par lab/TerraSense de pH, conductividad y humedad volumétrica, y la concordancia de pH calculada como error relativo respecto al valor de laboratorio. Una muestra a la que le falte uno de los dos valores queda fuera del promedio en vez de entrar como 0 %.

Es la única tabla que la consola lee directamente y que un operador de soporte puede ver entera sin ser miembro de ningún equipo: su política `ts_lab_select_auth` autoriza a cualquier sesión autenticada. La pantalla existía desde antes, pero sin ninguna ruta que la alcanzara.

---

## 3. Sistema de Diseño y Modo Claro/Oscuro

La paleta sale del logotipo oficial (`Logo/Logo/terrasense.svg`), no de un verde elegido aparte: tinta `#0f2e22`, verde de marca `#16a34a`, verde de sonda `#047857`, hojas `#15803d` y `#22c55e`, bandas `#10b981` y los grises pizarra de los horizontes de suelo.

* **Dos capas en `Web/src/index.css`, y el orden importa.** `--ts-*` en `:root` guarda los valores crudos y es la única capa que cambia con el tema; `@theme inline` los traduce a tokens de Tailwind. **`inline` es obligatorio**: sin él Tailwind copia el valor en vez de emitir `var(--ts-*)`, y el conmutador de tema deja de tener efecto.
* **Todo color usado vive en `@theme`.** Tailwind v4 sólo genera utilidades para lo declarado ahí. Los colores del semáforo estaban definidos en `:root` pero fuera de `@theme`, así que 138 clases `text-verdict-red`, `bg-verdict-amber/10`, `border-verdict-red/30`… no producían ni un byte de CSS: el semáforo agronómico, los avisos de error y el botón de reseteo se pintaban sin color. Antes de dar por buena una clase nueva, compruébala en el CSS compilado (ver §12).
* **Tokens disponibles:** superficies `terra-bg` / `terra-surface` / `terra-raised`; trazo `terra-border` / `terra-border-strong`; texto `terra-text` / `terra-muted` / `terra-faint`; marca `terra-primary` (relleno), `terra-primary-ink` (el mismo verde, legible como texto), `terra-primary-soft` (fondo de realce) y `terra-on-primary`; semáforo `verdict-green|amber|red` con su variante `-soft`; y `support` para la zona de soporte.
* **Contraste WCAG 2.2 AA verificado** por cálculo en ambos temas para cada par de texto y fondo. Mínimo obtenido: 4,56:1; el resto por encima de 5:1. El color nunca es el único código de la información: cada veredicto lleva además icono y etiqueta.
* **Conmutador `ThemeToggle`:** persiste en `localStorage` bajo `terra-theme` y aplica `data-theme` en `<html>`. Un script en `index.html` fija el tema **antes del primer pintado**, para que una sesión en claro no vea un destello oscuro en cada carga.
* **Superficies opacas (`.panel`), no vidrio.** El `backdrop-filter: blur(12px)` anterior degradaba la legibilidad del texto pequeño sobre tablas densas y obligaba al compositor a repintar una capa entera en cada scroll.
* **Tipografía del sistema**, que es la que el propio logotipo usa para su wordmark. Se retiró la descarga bloqueante de Outfit desde Google Fonts.
* **Componentes en `src/ui/`** (`Panel`, `Button`, `Form`, `Data`, `Feedback`, `PageHeader`) para que ninguna pantalla vuelva a inventar su propia combinación de clases.

---

## 4. Estructura de carpetas

```text
Web/
├── index.html                      # HTML5 raíz
├── vite.config.ts                  # Vite 6 + React 19 + Tailwind CSS v4
├── vercel.json                     # Reescritura SPA para despliegue en Vercel
├── package.json                    # Dependencias y scripts
├── backend/                        # Capa de integración RPC para el backoffice
│   ├── adminApi.ts                 # Funciones tipadas para soporte, miembros, firmware y reset
│   ├── database.types.ts           # Definiciones de tipos generadas desde PostgreSQL
│   ├── supabaseAdmin.ts            # Cliente Supabase tipado para administración
│   └── types.ts                    # Tipos para respuestas y entidades de soporte
├── TAREAS.md                       # Auditoría del 21-09-2026 y lo que queda pendiente
├── tests/
│   ├── csv.test.mjs                # Exportación CSV
│   └── format.test.mjs             # Códigos, versiones, tiempos y veredictos
└── src/
    ├── main.tsx                    # Montaje de React con ThemeProvider y BrowserRouter
    ├── App.tsx                     # Enrutador de sesión (Auth, Reset, y las siete rutas del panel)
    ├── index.css                   # Sistema de diseño: paleta de marca y tokens de Tailwind 4
    ├── types.ts                    # Tipos de lo que se lee de tablas (firmware, laboratorio)
    ├── contexts/
    │   └── ThemeContext.tsx        # Lee el tema que index.html ya aplicó y permite cambiarlo
    ├── layouts/
    │   └── DashboardLayout.tsx     # Shell: panel lateral (cajón en móvil), barra superior y tema
    ├── ui/                         # Sistema de componentes, sin lógica de negocio
    │   ├── Panel.tsx               # Panel, PanelHeader, PanelNote
    │   ├── Button.tsx              # Button, IconButton
    │   ├── Form.tsx                # TextField, SelectField, PasswordField (etiqueta asociada)
    │   ├── Data.tsx                # Badge, DeviceCode, ReportStatus, BatteryBar, StatTile, TableScroll
    │   ├── Feedback.tsx            # Alert, EmptyState, ErrorState, TableSkeleton, FullPageLoader
    │   └── PageHeader.tsx          # El <h1> de cada pantalla y sus acciones
    ├── pages/
    │   ├── SupportPanelPage.tsx    # /admin - Buscador del panel de soporte
    │   ├── SupportDeviceDetailPage.tsx # /admin/devices/:id - Contenedor de la ficha
    │   ├── SupportStaffPage.tsx    # /admin/staff - Personal y código de invitación
    │   ├── FleetPage.tsx           # /fleet - Inventario de toda la flota
    │   ├── MeasurementsPage.tsx    # /measurements - Últimas lecturas de la flota
    │   ├── FirmwarePage.tsx        # /firmware - Catálogo y contraste de versiones
    │   └── ValidationPage.tsx      # /validation - Contraste contra laboratorios
    ├── auth/
    │   ├── AuthLayout.tsx          # Armazón de las pantallas sin sesión (marca + formulario)
    │   ├── LoginPage.tsx           # /ingresar - Iniciar sesión
    │   ├── SignupPage.tsx          # /crear-cuenta - Cuenta de soporte con correo propio
    │   ├── RecoverPage.tsx         # /recuperar-acceso - Código para una contraseña nueva
    │   ├── PasswordChecklist.tsx   # Requisitos de contraseña (reglas de la app móvil)
    │   ├── authErrors.ts           # Mensajes de Supabase Auth en español
    │   └── paths.ts                # Rutas públicas del acceso
    ├── components/
    │   ├── EmailCodeForm.tsx       # Código de seis dígitos (alta y recuperación)
    │   ├── ResetPasswordScreen.tsx # Elegir contraseña nueva
    │   ├── AccountConfirmed.tsx    # /cuenta-confirmada - Aterrizaje del correo del agricultor
    │   ├── SupportOnboarding.tsx   # Alta de personal con código de invitación
    │   ├── BrandLogo.tsx           # Logotipo oficial desde Logo/Logo/terrasense.svg
    │   ├── ThemeToggle.tsx         # Conmutador Sol / Luna
    │   ├── MeasurementGrid.tsx     # Detalle 2×5 de una lectura
    │   ├── FirmwareView.tsx        # Tabla del catálogo OTA (solo lectura)
    │   ├── device/                 # Piezas de la ficha de equipo
    │   │   ├── DeviceIdentity.tsx      # Identidad, estado operativo y firmware
    │   │   ├── DeviceMembers.tsx       # Aprobar, suspender, delegar y desvincular
    │   │   ├── DeviceBattery.tsx       # Historial de batería con rango de fechas y CSV
    │   │   ├── DeviceMeasurements.tsx  # Últimas 50 lecturas y CSV
    │   │   └── DeviceCommands.tsx      # Comprobación de firmware y reseteo de fábrica
    │   └── admin/
    │       └── FactoryResetModal.tsx   # Diálogo modal del reseteo de fábrica
    ├── services/
    │   └── supabase.ts             # Cliente frontend de Supabase (instancia única de GoTrue)
    └── utils/
        ├── verdict.ts              # Semáforo agronómico y concordancia de laboratorio
        ├── format.ts               # Códigos, versiones, tiempos y números
        └── csv.ts                  # Exportación CSV con separador ; y BOM UTF-8
```

---

## 5. Capa Backend y Funciones RPC

Las operaciones sensibles del backoffice se ejecutan mediante **Remote Procedure Calls (RPCs)** definidas en Postgres (`supabase/migrations/20260902120000_panel_soporte_backend.sql` y `20260921120000_flota_soporte_y_versiones_normalizadas.sql`) y consumidas a través de `Web/backend/adminApi.ts`:

| Función en `adminApi.ts` | RPC en Postgres | Parámetros | Propósito |
| :--- | :--- | :--- | :--- |
| `isSupportStaff()` | `is_support_staff` | — | Valida si la sesión pertenece al personal de soporte activo. |
| `selfRegisterSupportStaff()` | `support_self_register` | `p_full_name`, `p_invite_code` | Alta autoservicio contra el hash del código de invitación. |
| `listSupportStaff()` | — (SELECT con RLS) | — | Lee `admin_support_users`; la política `support_select_staff` hace de filtro. |
| `setStaffActive()` | `admin_set_staff_active` | `p_user_id`, `p_active` | Suspende o reactiva a otro miembro; rechaza la autodesactivación. |
| `rotateInviteCode()` | `admin_rotate_invite_code` | `p_new_code` | Sustituye el código de invitación (mínimo 8 caracteres). |
| `searchDevices()` | `admin_search` | `p_query: text` | Búsqueda multicriterio (código 15 dígitos, alias, email). |
| `listFleet()` | `admin_list_fleet` | — | Inventario completo con recuentos y estado de firmware por equipo. |
| `listRecentMeasurements()` | `admin_list_recent_measurements` | `p_limit` | Últimas mediciones de la flota, con el equipo resuelto. Tope de 500. |
| `getDeviceDetail()` | `admin_get_device_detail` | `p_device_id: uuid` | Retorna equipo, estado de firmware, miembros, 100 baterías y 50 mediciones. |
| `setMemberAuthorized()`| `admin_set_member_authorized` | `p_device_id`, `p_user_id`, `p_authorized` | Habilita o suspende el acceso de un miembro al equipo. |
| `setMemberRole()` | `admin_set_member_role` | `p_device_id`, `p_user_id`, `p_role` | Delega `admin` en otro usuario aprobado; el anterior pasa a `user`. |
| `removeMember()` | `admin_unbind_user_device`| `p_device_id`, `p_user_id` | Desvincula totalmente a un usuario del equipo. |
| `factoryResetDevice()` | `admin_factory_reset_device`| `p_device_id`, `p_confirm_device_code` | Borra membresías, mediciones, alertas, invitaciones y registro de batería, exigiendo el código. |
| `listPublishedFirmware()` | — (SELECT con RLS) | `hardwareTarget?` | Catálogo publicado, para el selector de versión de la ficha. |
| `checkFirmwareAvailability()` | `admin_push_firmware_update`| `p_device_id`, `p_firmware_release_id` | Comprueba que la versión esté publicada y sea aplicable. **No envía ningún aviso**, pese al nombre de la RPC. |

`Web/backend/supabaseAdmin.ts` **no crea un segundo cliente**: reexporta el de
`src/services/supabase.ts` con los tipos generados. Dos `createClient` en la
misma pestaña levantan dos instancias de GoTrue compitiendo por la misma clave
de `localStorage`, y un refresco de token disparado por una puede dejar a la
otra con una sesión obsoleta — que en el panel se manifiesta como un `42501`
espurio a mitad de sesión.

---

## 6. Seguridad y Aislamiento (Postgres RLS)

La seguridad reside en la base de datos PostgreSQL mediante **Row Level Security (RLS)**:
* Cada RPC de administración ejecuta internamente `is_support_staff()`. Si el usuario no tiene permisos, Postgres bloquea la llamada inmediatamente.
* **Nunca exponer la clave `service_role`** en el frontend: la aplicación web opera exclusivamente con `VITE_SUPABASE_ANON_KEY`.

### 6.1. ⚠️ Pendiente: contraseña de soporte en texto plano en producción

**Detectado el 6 de septiembre de 2026. Sin corregir.**

La cuenta de acceso a este panel (`alvarovillena8@gmail.com`) se creó desde SQL, con la contraseña
escrita literal dentro de la migración `20260902180000_alta_usuario_alvaro.local.sql`. El archivo
está excluido de git por el patrón `*.local.sql`, pero **eso no evitó la exposición**: Supabase
guarda el cuerpo completo de cada migración aplicada en `supabase_migrations.schema_migrations`, así
que la contraseña sigue legible dentro de la base de producción.

Alcance real, para dimensionarlo sin exagerarlo:

* **No** está en el repositorio, ni viaja por la red, ni la expone el frontend.
* **Sí** la puede leer cualquiera con acceso a la base: la `service_role_key`, el dashboard del
  proyecto, o un volcado o respaldo de la base.
* Autentica contra `auth.users`, que es **única por proyecto** y compartida con la app móvil. Lo que
  abre en cada sitio es distinto: aquí concede soporte completo vía `admin_support_users`, y en la
  app dependería de `profiles` y `device_members`. El daño serio es este panel.

**Corrección, en este orden — el inverso no sirve de nada:**

1. Cambiar la contraseña de esa cuenta, en *Authentication → Users* del dashboard de Supabase o por
   correo de recuperación. Mientras la antigua siga siendo válida, limpiar el historial no aporta.
2. Vaciar la columna `statements` de esa fila en `supabase_migrations.schema_migrations`,
   conservando el registro de que la migración se aplicó.

> [!IMPORTANT]
> **La regla que se incumplió:** no crear cuentas desde SQL con la contraseña incrustada, aunque el
> archivo esté en `.gitignore`. El archivo no se sube, pero su contenido viaja igual al historial
> remoto en cuanto se hace `db push`. Para altas manuales, usar el dashboard o `auth.admin`, que no
> dejan rastro del secreto. Ver [`supabase/README.md` §10.5](../supabase/README.md).

---

## 7. Variables de entorno

Crear el archivo `Web/.env` basándose en `Web/.env.example`:

```bash
VITE_SUPABASE_URL=https://bjmhjatykqccksddgtmo.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_publica
```

---

## 8. Comandos de desarrollo

```bash
# Entrar al directorio
cd Web

# Instalar paquetes
npm install

# Servidor de desarrollo local (http://localhost:5173)
npm run dev

# Chequeo estricto de TypeScript (src/ y backend/, con strict activado)
npm run type-check

# Pruebas unitarias
npm test

# Compilación para producción (genera dist/)
npm run build

# Previsualización local del build
npm run preview
```

---

## 9. Despliegue en Vercel

* **URL Activa de Producción:** **https://terrasense-web.vercel.app**
* **Configuración SPA:** `Web/vercel.json` asegura que cualquier ruta directa (ej. `/admin` o `/admin/devices/:id`) cargue correctamente `index.html`.

Para desplegar una nueva versión a producción:

```bash
cd Web
vercel --prod --yes
```

---

## 10. Correos transaccionales y recuperación de acceso

Sin sesión, la consola sólo expone tres rutas: `/ingresar`, `/crear-cuenta` y
`/recuperar-acceso` ([src/auth/](src/auth/)). Cualquier otra lleva a `/ingresar` y, al
entrar, se vuelve a la pantalla que se había pedido. El orden después de entrar es:
sesión → `is_support_staff()` → código de invitación si la cuenta aún no es del equipo →
panel de soporte.

**La web y la app comparten la base de usuarios de Supabase: un correo es una sola
cuenta.** El backoffice se usa con un correo propio, distinto al de la cuenta de la app,
y `/crear-cuenta` lo advierte. Si el correo ya tiene cuenta, Supabase no devuelve error
ni envía código (para no revelar qué correos existen); la pantalla lo detecta porque el
usuario vuelve sin identidades y pide otro correo, en vez de dejar esperando un código.
La contraseña cumple las mismas reglas que en la app
([`App/src/utils/passwordRules.ts`](../App/src/utils/passwordRules.ts)).

El registro y la recuperación muestran [EmailCodeForm](src/components/EmailCodeForm.tsx).
La verificación del código establece una sesión; en recuperación se muestra primero
`ResetPasswordScreen` para elegir una nueva contraseña. El estado de recuperación se
conserva al recargar el navegador y se limpia al cerrar sesión. Los permisos de soporte
y la invitación se mantienen: confirmar el correo no concede acceso administrativo.

Las [plantillas, parámetros y activación remota](../supabase/README.md#7-plantillas-de-correo)
se comparten con la app. La configuración local declara SMTP propio, pero su estado
remoto y la entrega real no fueron verificados en este cambio. `/cuenta-confirmada`
se conserva para correos antiguos. El panel de términos previo al registro es exclusivo
de la app móvil.

---

## 11. Estado de Implementación y Roadmap Futuro del Backoffice

> ### ⚠️ Estado de verificación
> Corregido tras la [auditoría del 4 de septiembre de 2026](../finanzas/historico/documentacion/docs/AUDITORIA_READMES_2026-09-04.md). El estado **remoto de producción no fue comprobado**; lo que sigue describe el código de este repositorio.
>
> **Verificado localmente el 05-09-2026**, sobre las dependencias ya instaladas:
> - `npm run type-check` (`tsc -b`) → **aprobado**
> - `npm run build` → **aprobado**, 2.307 módulos transformados en 9 s
> - Servidor de desarrollo levantado y cada módulo nuevo solicitado a Vite para comprobar que transforma sin error
>
> La advertencia de tamaño **ya no aparece**: `vite.config.ts` divide las dependencias en tres grupos (`react`, `supabase`, `ui`) y ninguno supera el umbral de 500 kB. El reparto queda en 50 / 220 / 148 kB de dependencias más 261 kB de código propio (195 kB en total con gzip), y un despliegue normal sólo invalida el último.
>
> **Sobre el esquema de base de datos:** la consola web no ejecuta DDL propio. Todo lo que añade consume funciones que ya existían en `supabase/migrations/20260902120000_panel_soporte_backend.sql` y que están presentes en `Web/backend/database.types.ts`, generado contra el proyecto remoto. Ver [`supabase/APP_COMPATIBILITY_20260905.md`](../supabase/APP_COMPATIBILITY_20260905.md) para el estado del historial de migraciones, cuyas diferencias históricas ya no aparecen en la consulta del 11-09-2026.

### 11.1. Módulos implementados
* ✅ **Panel de Soporte Técnico (`/admin`):** Buscador multi-criterio (por código de hardware de 15 dígitos, alias o correo del usuario).
* ✅ **Flota y Mediciones (`/fleet`, `/measurements`):** el parque completo, sobre `admin_list_fleet()` y `admin_list_recent_measurements()`. Sustituyen a las dos pantallas que leían `devices` y `soil_measurements` desde el navegador y que RLS dejaba siempre vacías para una cuenta de soporte.
* ✅ **Validación de Laboratorio (`/validation`):** contraste contra laboratorios acreditados, por fin enrutada.
* ✅ **Ficha Técnica y Diagnóstico Individual (`/admin/devices/:id`):** Visualización de curvas de batería de litio, versión de firmware activa, tabla de miembros vinculados y últimas mediciones edafológicas reportadas.
* ✅ **Gobernanza de Membresías:** Dos roles (`admin`, `user`), con aprobación, suspensión, delegación y desvinculación como cuatro acciones distintas.
* ✅ **Factory Reset Remoto Seguro:** Desvinculación atómica de miembros y purga de mediciones privadas ante reventa o traspaso entre agricultores.
* ✅ **Historial de Mediciones Agronómicas:** tabla de las últimas 50 lecturas con veredicto, campo y etapa. El dato ya venía en `admin_get_device_detail`; hasta ahora la ficha lo descartaba sin mostrarlo.
* ✅ **Comprobación de Firmware Individual:** selector de versión publicada y verificación contra el servidor desde la ficha del equipo. **No envía avisos**: la RPC dejó de encolarlos en `20260920120000` y la interfaz seguía anunciando lo contrario hasta la auditoría del 21-09-2026.
* ✅ **Gobernanza del Equipo de Soporte (`/admin/staff`) y alta autoservicio:** `support_self_register`, `admin_set_staff_active` y `admin_rotate_invite_code` pasan de estar sólo declaradas en `adminApi.ts` a tener interfaz. Antes, una cuenta nueva sin pertenencia al panel aterrizaba en un inventario vacío sin ninguna vía de acceso.
* ✅ **Exportación de Telemetría (CSV):** batería y mediciones descargables desde la ficha del equipo.
* ⚠️ **Catálogo de firmware (`/firmware`) — solo lectura.** `FirmwareView.tsx` **consulta** el catálogo y está definido expresamente como una vista de lectura. **No implementa carga de binarios `.bin`, cálculo de SHA-256 ni publicación OTA masiva.** La ruta `/firmware` ahora existe en el enrutador (antes el catálogo sólo se alcanzaba desde una pestaña interna de `/devices`), pero su alcance no ha cambiado.

  Hay que distinguir cinco cosas que no son equivalentes: **catálogo** (existe), **aviso** al dispositivo (**no existe**: la RPC dejó de encolarlo), **descarga**, **verificación de integridad** e **instalación comprobada en hardware**. Sólo la primera está implementada, y **no hay un binario validado contra hardware**.
* ✅ **Despliegue continuo en Vercel:** Integración SPA activa en `https://terrasense-web.vercel.app`.

### 11.2. Roadmap y funcionalidades pendientes
* ⏳ **Resolver los dos equipos con `device_code` de 20 dígitos.** Están congelados: la restricción `devices_device_code_15_digits` hace fallar cualquier escritura sobre ellos, incluida la de `device-checkin`. Detalle y salidas en [TAREAS.md §1.4](TAREAS.md).
* ⏳ **Verificación visual y de accesibilidad con herramienta:** el rediseño se comprobó por compilación y por cálculo de contraste, no en pantalla. [TAREAS.md §4.1](TAREAS.md).
* ⏳ **Publicación OTA real:** carga de binarios, cálculo y verificación de SHA-256, marcado de versión obligatoria y despliegue a la flota. Requiere además firmware de ESP32, que **no existe en el repositorio**.
* ⏳ **Sistema de Tickets de Soporte Integrado:** Bandeja interna de solicitudes de asistencia vinculadas al correo del agricultor y al ID de la sonda para trazabilidad de fallas de hardware.
* ⏳ **Monitor de Salud Preventiva de Flota:** Disparador automático de alertas cuando una sonda reporte voltajes inferiores a 3.4V o fallas repetidas de CRC en el bus RS-485.
* ⏳ **Despliegue OTA Escalonado (Canary Releases):** Capacidad de programar actualizaciones graduales de firmware (10 % $\rightarrow$ 50 % $\rightarrow$ 100 % de las sondas activas) para mitigar riesgos en campo antes de un lanzamiento general.

---

## 12. Comprobaciones del repositorio

```bash
cd Web
npm run type-check    # tsc -b sobre src/ y backend/, con strict activado
npm test              # pruebas unitarias
npm run build         # compilación de producción
npm run check-classes # toda clase de color usada genera CSS (requiere build previo)
```

`check-classes` existe por un defecto que ninguna de las otras tres detecta.
Tailwind v4 sólo genera utilidades para los tokens declarados en `@theme`; los
colores del semáforo estaban definidos en `:root` pero fuera de ese bloque, así
que 138 clases no producían ni un byte de CSS. La compilación no falla, los
tipos no fallan y las pruebas no fallan: el semáforo agronómico, los avisos de
error y el botón de reseteo simplemente se pintaban sin color. El script
recorre `src/`, extrae cada utilidad `(bg|text|border|…)-(terra|verdict|support)-*`
y verifica que aparezca en el CSS compilado.

Fuera de `Web/`, `python docs/verificar_documentacion.py` valida los enlaces
locales de este README.

# 🖥️ TerraSense · Consola Web de Administración y Backoffice

> Documentación de la consola web. Incluye el detalle 2×5 en inventario y soporte, el ambiente y la batería en la exportación CSV, y el mapa reservado a las mediciones de pre-siembra.

## Mediciones y mapa — implementados el 11-09-2026

Las rutas `/measurements` (Mis mediciones) y `/map` (Mapa de pre-siembra) están conectadas a la navegación actual. Conservan la comprobación de acceso al backoffice y la membresía/RLS de los equipos; no conceden acceso a toda la flota. Para consultar equipos como personal de soporte se utiliza `/admin/devices/:id`.

El historial y la ficha de soporte permiten expandir una lectura al Grid **2×5** de [App](../App/README.md#interfaz-e-integración-actualizadas-al-11-09-2026): humedad del suelo/CE, temperatura del suelo/N, P/K, pH/temperatura ambiente, humedad relativa/presión. Se indican unidades y datos ausentes; N/P/K quedan separados e informativos, sin validación química ni cálculo de dosis. Batería, fecha, completitud y estado se presentan aparte. `diagnosis.localSource` permite identificar las capturas del nuevo flujo; un histórico sin marca se muestra con origen ambiental no verificado.

El CSV de soporte incluye las diez variables, batería en captura, fecha y diagnóstico con fuentes y pronóstico guardado. El pronóstico no sustituye a las tres variables BME280 ni ocupa tarjetas del Grid. El mapa sólo admite `pre_siembra` con coordenadas finitas; el filtro existe tanto en la consulta GIS como en el componente de interpolación. El historial conserva las cuatro fases y los registros sin ubicación.

El panel muestra **Reporte reciente** en lugar de afirmar conexión permanente: `devices.last_seen_at` no verifica una conexión BLE activa. El esquema y `admin_get_device_detail` fueron actualizados mediante la [migración aplicada y verificada en Supabase](../supabase/README.md#persistencia-ambiental-y-bateria).

Verificación de esta entrega: `npm test` pasó la prueba de fase/GPS (incluidos ceros válidos, nulos y valores no finitos); `npm run build` pasó TypeScript y generó el build Vite. Esto no publica ese build. Siguen pendientes pruebas visuales, accesibilidad y publicación web/móvil, además del roadmap de tickets, OTA real, alertas preventivas y canary. Autonomía, exactitud, IP67 y ahorro siguen sujetos a ensayos; la página técnica, QR y expediente comercial se validan por separado.

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
- [3. Sistema de Diseño y Modo Claro/Oscuro](#3-sistema-de-diseño-y-modo-clarooscuro)
- [4. Estructura de carpetas](#4-estructura-de-carpetas)
- [5. Capa Backend y Funciones RPC](#5-capa-backend-y-funciones-rpc)
- [6. Seguridad y Aislamiento (Postgres RLS)](#6-seguridad-y-aislamiento-postgres-rls)
  - [6.1. ⚠️ Pendiente: contraseña de soporte en texto plano](#61--pendiente-contraseña-de-soporte-en-texto-plano-en-producción)
- [7. Variables de entorno](#7-variables-de-entorno)
- [8. Comandos de desarrollo](#8-comandos-de-desarrollo)
- [9. Despliegue en Vercel](#9-despliegue-en-vercel)
- [10. Correos transaccionales y recuperación de acceso](#10-correos-transaccionales-y-recuperación-de-acceso)

---

## 1. Alcance Operativo del Backoffice

Esta consola resuelve de forma unificada las necesidades de post-venta, soporte y mantenimiento técnico de TerraSense:

1. **Gestión de Flota Centralizada en Soporte:** Todo el parque de sondas se administra directamente a través del buscador inteligente del panel de soporte (por código de 15 dígitos, alias o correo del usuario).
2. **Diagnóstico Técnico y Salud de la Sonda:** Supervisión en tiempo real de curvas de voltaje de batería de litio recargable, última señal y registro de últimas mediciones para diagnosticar el comportamiento de sensores en terreno.
3. **Administración de Membresías:** aprobar pendientes, delegar el único administrador (`admin`) y eliminar usuarios (`user`). Al delegar, el administrador anterior pasa a usuario. Debe conservarse al menos un miembro; sólo el reset elimina todos. El acceso al backoffice se controla en `admin_support_users`, independientemente de los roles de equipo. [Contrato, reset y despliegue](../supabase/ADMINISTRACION.md).
4. **Reseteo de Fábrica (Factory Reset):** Proceso seguro para desvincular a todos los miembros y limpiar mediciones privadas ante ventas o transferencias entre agricultores, preservando la identidad de hardware de la sonda.
5. **Firmware OTA:** catálogo de consulta y aviso individual por alerta push. La carga de binarios, su verificación, instalación y despliegue masivo siguen pendientes (§11.2).

---

## 2. Módulos y Enrutamiento Central

La plataforma se organiza en torno a dos ejes operativos bien diferenciados:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TERRASENSE · BACKOFFICE WEB                           │
├─────────────────────────────────────────────┬───────────────────────────────┤
│ 🛡️ PANEL DE SOPORTE Y GESTIÓN DE EQUIPOS    │ ⚡ CATÁLOGO FIRMWARE OTA       │
│ /admin  &  /admin/devices/:id               │ /firmware                     │
│ Búsqueda por ID/Email, batería, mediciones, │ Versiones publicadas, SHA-256 │
│ roles, reset, OTA individual y CSV          │ y equipos desactualizados     │
│ /admin/staff · alta y baja de personal      │ (solo lectura)                │
└─────────────────────────────────────────────┴───────────────────────────────┘
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
1. **Identidad del Hardware:** Código de vinculación formateado (`XXX-XXX-XXX-XXX-XXX`), target de hardware, versión de firmware activa vs. catálogo publicado y última señal registrada.
2. **Telemetría de Batería Li-Ion:**
   - Historial de hasta 100 lecturas con porcentaje, voltaje y estado de carga.
   - Filtro interactivo por rango de fechas (`Desde` / `Hasta`) para examinar curvas de descarga en terreno y diagnosticar problemas energéticos.
3. **Historial de Mediciones Agronómicas:**
   - Tabla de las últimas 50 lecturas tomadas por el equipo (humedad, temperatura de suelo, CE, pH, N, P, K) con su veredicto, campo y etapa fenológica, para verificar el funcionamiento de los sensores.
   - Los valores N/P/K se muestran agrupados y con una advertencia en pantalla: se derivan de la conductividad eléctrica, no de electrodos ion-selectivos, así que sirven para comprobar que el sensor responde, no para calcular dosis.
4. **Gestión de Miembros y Roles:**
   - Visualización de todos los usuarios asociados a la sonda con sus respectivos correos y roles.
   - Botón para delegar en otro usuario aprobado (`setMemberRole`). El administrador anterior pasa a `user` y el destinatario a `admin`.
   - La desvinculación pide confirmación en la propia fila. La consola no usa `alert()` ni `confirm()`: un diálogo modal del navegador bloquea el hilo, no deja rastro de lo ocurrido y no se puede leer después; los resultados se muestran como aviso en pantalla.
   - Botón para aprobar solicitudes pendientes (`setMemberAuthorized`).
   - Desvinculación definitiva de miembros individuales (`removeMember`).
5. **Actualización de Firmware Individual (`admin_push_firmware_update`):**
   - Selector de versión, alimentado por `listPublishedFirmware()`, para avisar de una actualización OTA específicamente a esta sonda mediante una alerta push, ideal para pruebas de soporte o parches puntuales.
   - El selector muestra el `hardware_target` de cada versión y no filtra por el `hardware_version` del equipo: ambas columnas no siempre usan la misma nomenclatura, y un desplegable vacío por un desajuste de cadenas sería peor que dejar elegir con criterio.
   - **Lo que hace y lo que no:** encola una alerta push. No transfiere el binario, no verifica el SHA-256 y no instala nada; eso lo resuelve la sonda contra `check_firmware_update()`.
7. **Exportación de Telemetría (CSV):** Tanto el rango de batería visible como las mediciones agronómicas se descargan en CSV con separador `;` y BOM UTF-8, para que Excel en configuración regional española los abra en columnas y sin romper los acentos.
6. **Reseteo de Fábrica Seguro (`FactoryResetModal`):**
   - Permite restablecer la sonda a valores de fábrica cuando un agricultor vende o regala su equipo.
   - **Confirmación Estricta:** Exige reescribir manualmente el código de 15 dígitos del equipo para desbloquear el botón.
   - **Ejecución Atómica (`admin_factory_reset_device`):** Desvincula a todos los miembros y elimina el historial privado de mediciones, alertas y cuadrantes, manteniendo intactos el `device_code` y los números de serie de hardware para que un nuevo agricultor lo vincule como primer dueño.

### 2.3. Catálogo de Firmware OTA (`/firmware`)
* **Solo lectura, a propósito.** La política RLS de `firmware_releases` sólo expone las versiones publicadas y reserva la escritura al rol de servicio: publicar un binario que se instalará sin supervisión en equipos repartidos por el campo no debe poder hacerse con una sesión de navegador.
* Lista cada versión con su `hardware_target`, estado (publicada o borrador), tamaño, SHA-256 y fecha, marcando en rojo las que no traen firma.
* **Contraste de flota:** compara la versión instalada de cada equipo contra la última publicada para su plataforma. Ese contraste se alimenta de la tabla `devices`, acotada por RLS a los equipos donde la sesión es miembro: una cuenta de soporte pura no es miembro de ninguno y verá cero. La página lo advierte en pantalla en lugar de dar a entender que la flota está al día; para el firmware de una sonda concreta, la fuente correcta es su ficha en el panel de soporte.
* La publicación de una versión nueva se documenta en la propia página, con el SQL que se ejecuta con la clave de servicio.

### 2.4. Gobernanza del Equipo de Soporte (`/admin/staff`)
Pantalla para decidir quién entra al backoffice, apoyada en `admin_support_users`:
* **Listado del equipo:** nombre, correo y estado de cada persona, distinguiendo tres situaciones —activo, suspendido e *invitado sin registrar* (fila creada con el correo pero sin `user_id` porque todavía no completó el alta)—. La lectura no necesita RPC: la política `support_select_staff` ya deja ver la tabla completa a quien pertenece al panel, y sólo su propia fila a quien no.
* **Suspender y reactivar (`admin_set_staff_active`):** el servidor rechaza la autodesactivación, y la interfaz además no ofrece el botón sobre la propia fila.
* **Rotación del código de invitación (`admin_rotate_invite_code`):** exige un mínimo de 8 caracteres y confirmación por duplicado. Postgres guarda sólo el hash bcrypt, de modo que el código vigente no se puede consultar desde aquí: si se pierde, se rota.
* **Alta autoservicio (`support_self_register`):** una sesión válida que todavía no pertenece al equipo no aterriza en un inventario vacío, sino en un formulario de alta con nombre y código de invitación. Es el control que impide que llegar a la URL del panel baste para entrar, dado que `auth.users` se comparte con la app de agricultores. Cinco intentos fallidos en una hora bloquean el alta desde la base de datos.

---

## 3. Sistema de Diseño y Modo Claro/Oscuro

El backoffice cuenta con soporte completo para **Modo Oscuro y Modo Claro**:

* **Tokens Semánticos:** Definidos en `Web/src/index.css` mediante la directiva `@theme` de Tailwind CSS v4.
  - `bg-terra-bg` / `bg-terra-surface`: Fondos oscuros profundos (`#070B0E` / `#0E171E`) o fondos claros limpios (`#F3F5F4` / `#FFFFFF`).
  - `text-terra-text` / `text-terra-muted`: Contraste tipográfico adaptado para sesiones operativas prolongadas.
  - `border-terra-border`: Bordes sutiles y definidos para tablas y formularios.
  - `text-terra-primary`: Verde agronómico de acento (`#10B981` / `#059669`).
* **Conmutador `ThemeToggle`:** Alterna el tema instantáneamente con animación suave.
* **Persistencia:** Guarda la preferencia en `localStorage` bajo la clave `terra-theme` y aplica el atributo `data-theme="light"` o `data-theme="dark"` en la etiqueta raíz `<html>`.
* **Panel de Vidrio (`.glass-panel`):** Efecto de desenfoque de fondo y bordes adaptativos de alto contraste.

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
└── src/
    ├── main.tsx                    # Montaje de React con ThemeProvider y BrowserRouter
    ├── App.tsx                     # Enrutador de sesión (Auth, Reset, Rutas /admin y /firmware)
    ├── index.css                   # Tokens de diseño Tailwind 4 (@theme) y clases de vidrio
    ├── types.ts                    # Tipos de entidades frontend (soporte, telemetría, batería)
    ├── contexts/
    │   └── ThemeContext.tsx        # Contexto para cambio de tema Claro/Oscuro
    ├── layouts/
    │   └── DashboardLayout.tsx     # Shell principal con barra superior, navegación y tema
    ├── pages/
    │   ├── SupportPanelPage.tsx    # /admin - Buscador global y panel de soporte técnico
    │   ├── SupportDeviceDetailPage.tsx # /admin/devices/:id - Ficha, telemetría, miembros, OTA y reset
    │   ├── SupportStaffPage.tsx    # /admin/staff - Personal de soporte y código de invitación
    │   ├── FirmwarePage.tsx        # /firmware - Catálogo de versiones publicadas
    │   └── DevicesPage.tsx         # /devices - Inventario propio (acotado por RLS)
    ├── components/
    │   ├── AuthScreen.tsx          # Pantalla de acceso de administradores
    │   ├── ResetPasswordScreen.tsx # Formulario de restablecimiento de contraseña
    │   ├── SupportOnboarding.tsx   # Alta de personal con código de invitación
    │   ├── ThemeToggle.tsx         # Conmutador animado Sol / Luna
    │   ├── FirmwareView.tsx        # Catálogo OTA de solo lectura y contraste de flota
    │   └── admin/
    │       └── FactoryResetModal.tsx # Modal crítico de reseteo de fábrica
    ├── services/
    │   └── supabase.ts             # Cliente frontend de Supabase (instancia única de GoTrue)
    └── utils/
        ├── verdict.ts              # Formateo de códigos de 15 dígitos y tiempos relativos
        └── csv.ts                  # Exportación CSV con separador ; y BOM UTF-8
```

---

## 5. Capa Backend y Funciones RPC

Las operaciones sensibles del backoffice se ejecutan mediante **Remote Procedure Calls (RPCs)** definidas en Postgres (`supabase/migrations/20260902120000_panel_soporte_backend.sql`) y consumidas a través de `Web/backend/adminApi.ts`:

| Función en `adminApi.ts` | RPC en Postgres | Parámetros | Propósito |
| :--- | :--- | :--- | :--- |
| `isSupportStaff()` | `is_support_staff` | — | Valida si la sesión pertenece al personal de soporte activo. |
| `selfRegisterSupportStaff()` | `support_self_register` | `p_full_name`, `p_invite_code` | Alta autoservicio contra el hash del código de invitación. |
| `listSupportStaff()` | — (SELECT con RLS) | — | Lee `admin_support_users`; la política `support_select_staff` hace de filtro. |
| `setStaffActive()` | `admin_set_staff_active` | `p_user_id`, `p_active` | Suspende o reactiva a otro miembro; rechaza la autodesactivación. |
| `rotateInviteCode()` | `admin_rotate_invite_code` | `p_new_code` | Sustituye el código de invitación (mínimo 8 caracteres). |
| `searchDevices()` | `admin_search` | `p_query: text` | Búsqueda multicriterio (código 15 dígitos, alias, email). |
| `getDeviceDetail()` | `admin_get_device_detail` | `p_device_id: uuid` | Retorna equipo, firmware, miembros, 100 baterías y 50 mediciones. |
| `setMemberAuthorized()`| `admin_set_member_authorized` | `p_device_id`, `p_user_id`, `p_authorized` | Habilita o suspende el acceso de un miembro al equipo. |
| `setMemberRole()` | `admin_set_member_role` | `p_device_id`, `p_user_id`, `p_role` | Delega `admin` en otro usuario aprobado; el anterior pasa a `user`. |
| `removeMember()` | `admin_unbind_user_device`| `p_device_id`, `p_user_id` | Desvincula totalmente a un usuario del equipo. |
| `factoryResetDevice()` | `admin_factory_reset_device`| `p_device_id`, `p_confirm_device_code` | Borra membresías y mediciones privadas exigiendo el código. |
| `listPublishedFirmware()` | — (SELECT con RLS) | `hardwareTarget?` | Catálogo publicado, para el selector de versión de la ficha. |
| `pushFirmwareUpdate()` | `admin_push_firmware_update`| `p_device_id`, `p_firmware_release_id` | Genera alerta push individual avisando de una actualización OTA. |

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

# Chequeo estricto de TypeScript
npm run type-check

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

El proyecto utiliza un servidor SMTP propio de Gmail en Supabase (`[auth.email.smtp]`) y plantillas HTML oficiales con la identidad gráfica de TerraSense:

| Correo | Cuándo se dispara | Plantilla | Estado |
| :--- | :--- | :--- | :---: |
| **Recuperación de contraseña** | «Olvidé mi contraseña» en `AuthScreen.tsx` | `supabase/templates/recovery.html` | 🟢 En producción |
| **Confirmación de registro** | Alta de un nuevo usuario administrador | `supabase/templates/confirmation.html` | 🟢 En producción |
| **Aviso de cambio de clave** | Tras actualizar contraseña en `ResetPasswordScreen.tsx` | `supabase/templates/password_changed.html` | 🟢 En producción |

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
* ✅ **Panel de Soporte Técnico (`/admin`):** Buscador multi-criterio en tiempo real (por ID de hardware de 15 dígitos, alias o correo del usuario) con listado dinámico de flota.
* ✅ **Ficha Técnica y Diagnóstico Individual (`/admin/devices/:id`):** Visualización de curvas de batería de litio, versión de firmware activa, tabla de miembros vinculados y últimas mediciones edafológicas reportadas.
* ✅ **Gobernanza de Membresías:** Dos roles (`admin`, `user`), aprobación, delegación y eliminación de miembros.
* ✅ **Factory Reset Remoto Seguro:** Desvinculación atómica de miembros y purga de mediciones privadas ante reventa o traspaso entre agricultores.
* ✅ **Historial de Mediciones Agronómicas:** tabla de las últimas 50 lecturas con veredicto, campo y etapa. El dato ya venía en `admin_get_device_detail`; hasta ahora la ficha lo descartaba sin mostrarlo.
* ✅ **Aviso de Firmware OTA Individual:** selector de versión publicada y envío de la alerta push desde la ficha del equipo (`listPublishedFirmware` + `admin_push_firmware_update`). Ambas funciones existían en `adminApi.ts` sin ninguna pantalla que las invocara.
* ✅ **Gobernanza del Equipo de Soporte (`/admin/staff`) y alta autoservicio:** `support_self_register`, `admin_set_staff_active` y `admin_rotate_invite_code` pasan de estar sólo declaradas en `adminApi.ts` a tener interfaz. Antes, una cuenta nueva sin pertenencia al panel aterrizaba en un inventario vacío sin ninguna vía de acceso.
* ✅ **Exportación de Telemetría (CSV):** batería y mediciones descargables desde la ficha del equipo.
* ⚠️ **Catálogo de firmware (`/firmware`) — solo lectura.** `FirmwareView.tsx` **consulta** el catálogo y está definido expresamente como una vista de lectura. **No implementa carga de binarios `.bin`, cálculo de SHA-256 ni publicación OTA masiva.** La ruta `/firmware` ahora existe en el enrutador (antes el catálogo sólo se alcanzaba desde una pestaña interna de `/devices`), pero su alcance no ha cambiado.

  Hay que distinguir cinco cosas que no son equivalentes: **catálogo** (existe), **aviso** al dispositivo (la alerta `admin_push_firmware_update` existe y ya tiene interfaz), **descarga**, **verificación de integridad** e **instalación comprobada en hardware**. Sólo las dos primeras están implementadas, y **no hay un binario validado contra hardware**.
* ⚠️ **Inventario propio (`/devices`) — vacío para una cuenta de soporte.** La tabla `devices` está acotada por RLS a los equipos donde la sesión es miembro, y una cuenta de backoffice no lo es de ninguno. Se conserva en la navegación porque un operador puede tener su propia sonda de pruebas, pero la vía correcta para la flota es el panel de soporte. Por eso la raíz `/` redirige a `/admin` y no a `/devices`.
* ✅ **Despliegue continuo en Vercel:** Integración SPA activa en `https://terrasense-web.vercel.app`.

### 11.2. Roadmap y funcionalidades pendientes
* ⏳ **Publicación OTA real:** carga de binarios, cálculo y verificación de SHA-256, marcado de versión obligatoria y despliegue a la flota. Requiere además firmware de ESP32, que **no existe en el repositorio**.
* ⏳ **Sistema de Tickets de Soporte Integrado:** Bandeja interna de solicitudes de asistencia vinculadas al correo del agricultor y al ID de la sonda para trazabilidad de fallas de hardware.
* ⏳ **Monitor de Salud Preventiva de Flota:** Disparador automático de alertas cuando una sonda reporte voltajes inferiores a 3.4V o fallas repetidas de CRC en el bus RS-485.
* ⏳ **Despliegue OTA Escalonado (Canary Releases):** Capacidad de programar actualizaciones graduales de firmware (10 % $\rightarrow$ 50 % $\rightarrow$ 100 % de las sondas activas) para mitigar riesgos en campo antes de un lanzamiento general.

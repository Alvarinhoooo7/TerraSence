# 🖥️ TerraSense · Consola Web de Administración y Backoffice

Consola central de operaciones técnicas, gestión de flota por soporte y distribución de firmware desarrollada en **React 19 + Vite 6 + Tailwind CSS v4 + TypeScript + React Router v7**. 
Es la **herramienta de backoffice del creador/administrador (Álvaro)** para supervisar las sondas TerraSense en terreno, auditar la salud técnica del hardware, gestionar miembros, resolver casos de soporte y desplegar actualizaciones de firmware OTA (tanto de forma individual desde la ficha de cada equipo como de manera masiva para toda la flota).

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
  - [2.3. Distribución de Firmware OTA Masiva (`/firmware`)](#23-distribución-de-firmware-ota-masiva-firmware)
- [3. Sistema de Diseño y Modo Claro/Oscuro](#3-sistema-de-diseño-y-modo-clarooscuro)
- [4. Estructura de carpetas](#4-estructura-de-carpetas)
- [5. Capa Backend y Funciones RPC](#5-capa-backend-y-funciones-rpc)
- [6. Seguridad y Aislamiento (Postgres RLS)](#6-seguridad-y-aislamiento-postgres-rls)
- [7. Variables de entorno](#7-variables-de-entorno)
- [8. Comandos de desarrollo](#8-comandos-de-desarrollo)
- [9. Despliegue en Vercel](#9-despliegue-en-vercel)
- [10. Correos transaccionales y recuperación de acceso](#10-correos-transaccionales-y-recuperación-de-acceso)

---

## 1. Alcance Operativo del Backoffice

Esta consola resuelve de forma unificada las necesidades de post-venta, soporte y mantenimiento técnico de TerraSense:

1. **Gestión de Flota Centralizada en Soporte:** Todo el parque de sondas se administra directamente a través del buscador inteligente del panel de soporte (por código de 15 dígitos, alias o correo del usuario).
2. **Diagnóstico Técnico y Salud de la Sonda:** Supervisión en tiempo real de curvas de voltaje de batería Li-Ion 18650, última señal y registro de últimas mediciones para diagnosticar el comportamiento de sensores en terreno.
3. **Administración de Membresías y Roles:** Capacidad para autorizar, suspender o reasignar roles de miembros vinculados a una sonda (`owner`, `admin`, `operator`), o desvincular usuarios.
4. **Reseteo de Fábrica (Factory Reset):** Proceso seguro para desvincular a todos los miembros y limpiar mediciones privadas ante ventas o transferencias entre agricultores, preservando la identidad de hardware de la sonda.
5. **Firmware OTA Dual (Individual y Masivo):** Capacidad para forzar la actualización inalámbrica de un equipo puntual desde su ficha técnica, o publicar releases obligatorios globales para toda la flota.

---

## 2. Módulos y Enrutamiento Central

La plataforma se organiza en torno a dos ejes operativos bien diferenciados:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TERRASENSE · BACKOFFICE WEB                           │
├─────────────────────────────────────────────┬───────────────────────────────┤
│ 🛡️ PANEL DE SOPORTE Y GESTIÓN DE EQUIPOS    │ ⚡ DISTRIBUCIÓN FIRMWARE OTA  │
│ /admin  &  /admin/devices/:id               │ /firmware                     │
│ Búsqueda por ID/Email, Batería, Mediciones, │ Carga de Binarios ESP32       │
│ Roles, Reset y Firmware Individual          │ Lanzamientos Masivos Globales │
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
   - Acceso a las últimas 50 lecturas tomadas por el equipo (humedad, temperatura, CE, pH, N, P, K) para verificar el funcionamiento de los sensores.
4. **Gestión de Miembros y Roles:**
   - Visualización de todos los usuarios asociados a la sonda con sus respectivos correos y roles.
   - Selector en línea para reasignar rol (`setMemberRole`), transfiriendo la propiedad automáticamente si se designa un nuevo `owner`.
   - Toggle para autorizar o suspender acceso sin romper el vínculo (`setMemberAuthorized`).
   - Desvinculación definitiva de miembros individuales (`removeMember`).
5. **Actualización de Firmware Individual (`admin_push_firmware_update`):**
   - Selector de versión para empujar una actualización OTA específicamente a esta sonda mediante una alerta push, ideal para pruebas de soporte o parches específicos.
6. **Reseteo de Fábrica Seguro (`FactoryResetModal`):**
   - Permite restablecer la sonda a valores de fábrica cuando un agricultor vende o regala su equipo.
   - **Confirmación Estricta:** Exige reescribir manualmente el código de 15 dígitos del equipo para desbloquear el botón.
   - **Ejecución Atómica (`admin_factory_reset_device`):** Desvincula a todos los miembros y elimina el historial privado de mediciones, alertas y cuadrantes, manteniendo intactos el `device_code` y los números de serie de hardware para que un nuevo agricultor lo vincule como primer dueño.

### 2.3. Distribución de Firmware OTA Masiva (`/firmware`)
* Repositorio central de binarios `.bin` compilados para microcontroladores ESP32.
* Registro de nuevas versiones con versionado semántico (`v1.2.0`, `v1.3.1`, etc.) y notas de versión (`release_notes`).
* **Despliegue Masivo:** Opción de marcar releases como obligatorios (`is_mandatory`) para que todas las sondas activas que se comuniquen inicien su actualización OTA automáticamente.

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
    │   └── SupportDeviceDetailPage.tsx # /admin/devices/:id - Ficha, telemetría, miembros y reset
    ├── components/
    │   ├── AuthScreen.tsx          # Pantalla de acceso de administradores
    │   ├── ResetPasswordScreen.tsx # Formulario de restablecimiento de contraseña
    │   ├── ThemeToggle.tsx         # Conmutador animado Sol / Luna
    │   ├── FirmwareView.tsx        # Módulo de administración y subida masiva de binarios OTA
    │   └── admin/
    │       └── FactoryResetModal.tsx # Modal crítico de reseteo de fábrica
    ├── services/
    │   └── supabase.ts             # Cliente frontend de Supabase
    └── utils/
        └── verdict.ts              # Formateo de códigos de 15 dígitos y tiempos relativos
```

---

## 5. Capa Backend y Funciones RPC

Las operaciones sensibles del backoffice se ejecutan mediante **Remote Procedure Calls (RPCs)** definidas en Postgres (`supabase/migrations/20260902120000_panel_soporte_backend.sql`) y consumidas a través de `Web/backend/adminApi.ts`:

| Función en `adminApi.ts` | RPC en Postgres | Parámetros | Propósito |
| :--- | :--- | :--- | :--- |
| `isSupportStaff()` | `is_support_staff` | — | Valida si la sesión pertenece al personal de soporte activo. |
| `searchDevices()` | `admin_search` | `p_query: text` | Búsqueda multicriterio (código 15 dígitos, alias, email). |
| `getDeviceDetail()` | `admin_get_device_detail` | `p_device_id: uuid` | Retorna equipo, firmware, miembros, 100 baterías y 50 mediciones. |
| `setMemberAuthorized()`| `admin_set_member_authorized` | `p_device_id`, `p_user_id`, `p_authorized` | Habilita o suspende el acceso de un miembro al equipo. |
| `setMemberRole()` | `admin_set_member_role` | `p_device_id`, `p_user_id`, `p_role` | Modifica rol (`owner`, `admin`, `operator`) con traspaso automático. |
| `removeMember()` | `admin_unbind_user_device`| `p_device_id`, `p_user_id` | Desvincula totalmente a un usuario del equipo. |
| `factoryResetDevice()` | `admin_factory_reset_device`| `p_device_id`, `p_confirm_device_code` | Borra membresías y mediciones privadas exigiendo el código. |
| `pushFirmwareUpdate()` | `admin_push_firmware_update`| `p_device_id`, `p_firmware_release_id` | Genera alerta push individual para forzar actualización OTA. |

---

## 6. Seguridad y Aislamiento (Postgres RLS)

La seguridad reside en la base de datos PostgreSQL mediante **Row Level Security (RLS)**:
* Cada RPC de administración ejecuta internamente `is_support_staff()`. Si el usuario no tiene permisos, Postgres bloquea la llamada inmediatamente.
* **Nunca exponer la clave `service_role`** en el frontend: la aplicación web opera exclusivamente con `VITE_SUPABASE_ANON_KEY`.

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

### 11.1. Módulos Operativos al 100 % en Producción
* ✅ **Panel de Soporte Técnico (`/admin`):** Buscador multi-criterio en tiempo real (por ID de hardware de 15 dígitos, alias o correo del usuario) con listado dinámico de flota.
* ✅ **Ficha Técnica y Diagnóstico Individual (`/admin/devices/:id`):** Visualización de curvas de batería Li-Ion 18650, versión de firmware activa, tabla de miembros vinculados y últimas mediciones edafológicas reportadas.
* ✅ **Gobernanza de Membresías:** Reasignación de roles (`owner`, `admin`, `operator`) y revocación de permisos de acceso.
* ✅ **Factory Reset Remoto Seguro:** Desvinculación atómica de miembros y purga de mediciones privadas ante reventa o traspaso entre agricultores.
* ✅ **Gestor de Firmware OTA Masivo (`/firmware`):** Catálogo centralizado con subida de binarios `.bin`, cálculo SHA-256, marcado de versiones obligatorias y despliegue global a toda la flota.
* ✅ **Despliegue Continuo Vercel:** Integración SPA activa en `https://terrasense-web.vercel.app`.

### 11.2. Roadmap y Funcionalidades Pendientes por Implementar
* ⏳ **Exportación Forense de Telemetría (CSV / Excel):** Botón de descarga de registros históricos de lecturas por sonda para peritajes agronómicos y soporte técnico avanzado.
* ⏳ **Sistema de Tickets de Soporte Integrado:** Bandeja interna de solicitudes de asistencia vinculadas al correo del agricultor y al ID de la sonda para trazabilidad de fallas de hardware.
* ⏳ **Monitor de Salud Preventiva de Flota:** Disparador automático de alertas cuando una sonda reporte voltajes inferiores a 3.4V o fallas repetidas de CRC en el bus RS-485.
* ⏳ **Despliegue OTA Escalonado (Canary Releases):** Capacidad de programar actualizaciones graduales de firmware (10 % $\rightarrow$ 50 % $\rightarrow$ 100 % de las sondas activas) para mitigar riesgos en campo antes de un lanzamiento general.

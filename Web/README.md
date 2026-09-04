# 🖥️ TerraSense · Consola Web de Administración y Backoffice de Flota

Consola central de operaciones, aprovisionamiento de hardware, soporte técnico y distribución de firmware desarrollada en **React 19 + Vite 6 + Tailwind CSS v4 + TypeScript + React Router v7**. 
Es la **herramienta de backoffice del creador/administrador (Álvaro)** para supervisar el parque de sondas TerraSense en terreno, auditar el estado técnico del hardware, gestionar miembros y desplegar actualizaciones de firmware OTA (masivas e individuales).

> [!IMPORTANT]
> **Propósito Exclusivo de Backoffice:**
> * **No es un portal de agricultores ni una plataforma SaaS con suscripciones.** En TerraSense, el agricultor opera de forma 100% autónoma en terreno mediante la **App Móvil** (offline-first, sin planes mensuales ni cobros recurrentes).
> * **La Consola Web es estrictamente un Backoffice Operativo:** Su alcance se enfoca en aprovisionamiento de códigos de serie, auditoría de salud de batería de las sondas, soporte técnico reactivo, gestión de membresías/roles, reseteos de fábrica y gestión/carga de binarios de firmware OTA.
> * **Despliegue en Producción:** La consola se encuentra desplegada y operativa en **https://terrasense-web.vercel.app**.

---

## 📑 Contenido

- [1. Alcance Operativo del Backoffice](#1-alcance-operativo-del-backoffice)
- [2. Módulos y Enrutamiento](#2-módulos-y-enrutamiento)
  - [2.1. Gestión de Flota (`/devices`)](#21-gestión-de-flota-devices)
  - [2.2. Panel de Soporte Técnico (`/admin`)](#22-panel-de-soporte-técnico-admin)
  - [2.3. Ficha Detallada de Sonda (`/admin/devices/:id`)](#23-ficha-detallada-de-sonda-admindevicesid)
  - [2.4. Reseteo de Fábrica Seguro (`FactoryResetModal`)](#24-reseteo-de-fábrica-seguro-factoryresetmodal)
  - [2.5. Gestión y Carga de Firmware OTA (Masiva e Individual)](#25-gestión-y-carga-de-firmware-ota-masiva-e-individual)
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

Esta consola resuelve de forma centralizada las necesidades operativas y de soporte post-venta del hardware TerraSense:

1. **Aprovisionamiento y Control de Inventario:** Generación, auditoría y control de los códigos de vinculación únicos de 15 dígitos (*Pairing Codes*) asignados a cada sonda fabricada.
2. **Monitoreo de Salud del Parque de Sondas:** Supervisión en tiempo real del nivel de batería (voltaje Li-Ion 18650), última fecha/hora de sincronización, versión de firmware activa y estado de conexión de cada equipo.
3. **Buscador de Soporte Técnico Multicriterio:** Localización instantánea de equipos por código de 15 dígitos, alias de la sonda o correo electrónico de cualquiera de los usuarios vinculados (dueño, admin u operador).
4. **Gestión de Membresías y Roles:** Capacidad para autorizar, suspender o reasignar roles de usuarios vinculados a una sonda, así como desvincular cuentas de forma limpia.
5. **Reseteo de Fábrica (Factory Reset):** Proceso seguro para limpiar la membresía y los datos privados de un equipo ante ventas o transferencias entre agricultores, preservando la identidad de hardware de la sonda.
6. **Gestión y Carga de Firmware OTA:** Repositorio de binarios compilados de ESP32 para empujar actualizaciones inalámbricas por WiFi de forma masiva o dirigida a un equipo específico.

---

## 2. Módulos y Enrutamiento

La aplicación utiliza **React Router DOM v7** con un layout administrativo unificado (`DashboardLayout.tsx`) que gestiona la sesión, la cabecera y el conmutador de tema.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TERRASENSE · BACKOFFICE WEB                           │
├──────────────────────────┬──────────────────────────┬───────────────────────┤
│ 📡 GESTIÓN DE FLOTA      │ 🛡️ PANEL DE SOPORTE      │ ⚡ FIRMWARE OTA       │
│ /devices                 │ /admin                   │ /firmware             │
│ Inventario, Batería, IDs │ Búsqueda, Ficha, Reset   │ Carga Masiva/Sonda    │
└──────────────────────────┴──────────────────────────┴───────────────────────┘
```

### 2.1. Gestión de Flota (`/devices`)
* Muestra el listado completo de dispositivos registrados en el sistema.
* Tarjetas técnicas con alias, código de 15 dígitos formateado (`XXX-XXX-XXX-XXX-XXX`), versión de firmware actual y badge de conectividad en tiempo real (activo/inactivo, online si se comunicó en la última hora).
* Monitoreo del porcentaje y voltaje de la celda Li-Ion 18650 para detección proactiva de equipos descargados en terreno.

### 2.2. Panel de Soporte Técnico (`/admin`)
* **Acceso Restringido:** Gateado mediante la RPC `is_support_staff()`. Si el usuario autenticado no pertenece a la tabla `admin_support_users`, Postgres responde con error `42501`.
* **Buscador Multicriterio:** Invoca `admin_search(p_query)` para buscar indistintamente por:
  - Código numérico de 15 dígitos del equipo.
  - Nombre o alias asignado por el agricultor.
  - Correo electrónico de cualquier usuario vinculado (propietario, admin u operador).
* **Resultados en Tiempo Real:** Tarjetas con badges de rol, motivo de coincidencia (`member_email`, `device_code`, `alias`), estado de conectividad e ingreso directo a la ficha del equipo.

### 2.3. Ficha Detallada de Sonda (`/admin/devices/:id`)
Página de diagnóstico exhaustivo alimentada por la RPC `admin_get_device_detail(p_device_id)`:
1. **Identidad de Hardware:** Código de vinculación, hardware target, versión de firmware instalada vs. última versión publicada y última señal.
2. **Gestión de Usuarios y Roles:**
   - Lista todos los miembros enlazados con su correo y rol (`owner`, `admin`, `operator`).
   - Selector en línea para cambiar rol (`setMemberRole`). Al promover a un nuevo `owner`, el dueño anterior pasa automáticamente a `admin`.
   - Toggle para habilitar/suspender acceso sin romper el vínculo (`setMemberAuthorized`).
   - Desvinculación definitiva de miembros individuales (`removeMember`).
3. **Telemetría de Batería:**
   - Historial de hasta 100 lecturas de voltaje, porcentaje y estado de carga.
   - Filtro por rango de fechas (`Desde` / `Hasta`) para examinar curvas de descarga en terreno.
4. **Registro de Últimas Mediciones:**
   - Consulta de las últimas 50 lecturas sincronizadas por el equipo para soporte técnico y diagnóstico de funcionamiento de sensores.

### 2.4. Reseteo de Fábrica Seguro (`FactoryResetModal`)
* Herramienta crítica de soporte disponible en la ficha del equipo ante venta o traspaso de la sonda:
* **Confirmación Estricta:** El operador de soporte debe reescribir manualmente el código de 15 dígitos del equipo antes de habilitar la acción.
* **Ejecución Atómica (`admin_factory_reset_device`):**
  - Desvincula a **todos** los usuarios enlazados (dueño, administradores, operadores).
  - Elimina el historial privado de mediciones, cuadrantes y alertas asociadas al usuario anterior.
  - **Preserva el hardware intacto:** el `device_code`, `firmware_version` y `hardware_version` se mantienen en la base de datos, permitiendo que un nuevo comprador vincule la sonda desde cero como primer propietario.

### 2.5. Gestión y Carga de Firmware OTA (Masiva e Individual)
* Catálogo centralizado de binarios `.bin` de ESP32 con versionado semántico (`v1.2.0`, `v1.3.1`, etc.).
* Carga de nuevos binarios y especificación de notas de release (`release_notes`).
* **Actualización Masiva:** Marcado de releases como obligatorios (`is_mandatory`) para que todas las sondas activas que se conecten actualicen su firmware automáticamente.
* **Actualización Individual (`admin_push_firmware_update`):** Disparo de una alerta push dirigida a un equipo específico para forzar la actualización OTA de una unidad en soporte sin afectar al resto de la flota.

---

## 3. Sistema de Diseño y Modo Claro/Oscuro

El backoffice implementa una interfaz moderna y pulida con soporte para **Modo Oscuro y Modo Claro**:

* **Tokens Semánticos:** Definidos en `Web/src/index.css` mediante la directiva `@theme` de Tailwind CSS v4.
  - `bg-terra-bg` / `bg-terra-surface`: Fondos oscuros profundos (`#070B0E` / `#0E171E`) o fondos claros limpios (`#F3F5F4` / `#FFFFFF`).
  - `text-terra-text` / `text-terra-muted`: Contraste tipográfico equilibrado para jornadas largas de soporte.
  - `border-terra-border`: Delimitación sutil y definida de tablas y tarjetas.
  - `text-terra-primary`: Verde agronómico de acento (`#10B981` / `#059669`).
* **Conmutador `ThemeToggle`:** Alterna el tema instantáneamente con animación suave.
* **Persistencia:** Guarda la preferencia en `localStorage` bajo la clave `terra-theme` y aplica el atributo `data-theme="light"` o `data-theme="dark"` en `<html>`.
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
    ├── App.tsx                     # Enrutador de sesión (Auth, Reset, Rutas /devices y /admin)
    ├── index.css                   # Tokens de diseño Tailwind 4 (@theme) y clases de vidrio
    ├── types.ts                    # Tipos de entidades frontend (flota, telemetría, batería)
    ├── contexts/
    │   └── ThemeContext.tsx        # Contexto para cambio de tema Claro/Oscuro
    ├── layouts/
    │   └── DashboardLayout.tsx     # Shell principal con barra superior, navegación y tema
    ├── pages/
    │   ├── DevicesPage.tsx         # /devices - Vista de flota y salud de sondas
    │   ├── SupportPanelPage.tsx    # /admin - Buscador global y panel de soporte técnico
    │   └── SupportDeviceDetailPage.tsx # /admin/devices/:id - Ficha, telemetría y membresías
    ├── components/
    │   ├── AuthScreen.tsx          # Pantalla de acceso de administradores
    │   ├── ResetPasswordScreen.tsx # Formulario de restablecimiento de contraseña
    │   ├── ThemeToggle.tsx         # Conmutador animado Sol / Luna
    │   ├── FirmwareView.tsx        # Módulo de administración y subida de binarios OTA
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
* **Configuración SPA:** `Web/vercel.json` asegura que cualquier ruta directa (ej. `/devices` o `/admin`) cargue correctamente `index.html`.

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

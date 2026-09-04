# 🖥️ TerraSense · Consola Web de Administración y Gestión de Flota

Consola central de operaciones, aprovisionamiento y soporte técnico desarrollada en **React 19 + Vite 6 + Tailwind CSS v4 + TypeScript + React Router v7**. 
Es la **herramienta de control, aprovisionamiento de hardware, telemetría y soporte técnico del administrador del proyecto (Álvaro)** para supervisar la flota de sondas TerraSense en terreno, gestionar inventario, publicar actualizaciones de firmware OTA, auditar miembros y respaldar la validación metrológica.

> [!IMPORTANT]
> **Propósito y Arquitectura:**
> * **No es un portal de agricultores ni una plataforma SaaS con suscripciones.** En TerraSense, el agricultor opera de forma 100% autónoma en terreno mediante la **App Móvil** (offline-first, sin planes mensuales ni pagos recurrentes).
> * **La Consola Web es el Backoffice Central del Creador/Soporte Técnico:** Permite administrar el hardware fabricado, supervisar la salud de la batería Li-Ion de las sondas, gestionar permisos/roles de miembros, realizar reseteos de fábrica controlados, publicar binarios OTA de ESP32 y brindar soporte agronómico avanzado.
> * **Despliegue en Producción:** La consola se encuentra desplegada y operativa en **https://terrasense-web.vercel.app** (conectada al proyecto de Supabase en producción).

---

## 📑 Contenido

- [1. Para quién es y qué resuelve](#1-para-quién-es-y-qué-resuelve)
- [2. Módulos y Enrutamiento de la Consola](#2-módulos-y-enrutamiento-de-la-consola)
  - [2.1. Gestión de Flota (`/devices`)](#21-gestión-de-flota-devices)
  - [2.2. Panel de Soporte Técnico (`/admin`)](#22-panel-de-soporte-técnico-admin)
  - [2.3. Ficha Detallada de Sonda (`/admin/devices/:id`)](#23-ficha-detallada-de-sonda-admindevicesid)
  - [2.4. Reseteo de Fábrica Seguro (`FactoryResetModal`)](#24-reseteo-de-fábrica-seguro-factoryresetmodal)
  - [2.5. Gestión y Publicación de Firmware OTA](#25-gestión-y-publicación-de-firmware-ota)
  - [2.6. Visor Geoespacial IDW](#26-visor-geoespacial-idw)
  - [2.7. Corpus de Validación Metrológica](#27-corpus-de-validación-metrológica)
- [3. Sistema de Diseño y Modo Claro/Oscuro](#3-sistema-de-diseño-y-modo-clarooscuro)
- [4. Estructura de carpetas](#4-estructura-de-carpetas)
- [5. Capa Backend y Funciones RPC](#5-capa-backend-y-funciones-rpc)
- [6. El Visor GIS: por qué IDW y no Kriging](#6-el-visor-gis-por-qué-idw-y-no-kriging)
- [7. Seguridad y Aislamiento (Postgres RLS)](#7-seguridad-y-aislamiento-postgres-rls)
- [8. Variables de entorno](#8-variables-de-entorno)
- [9. Comandos de desarrollo](#9-comandos-de-desarrollo)
- [10. Despliegue en Vercel](#10-despliegue-en-vercel)
- [11. Correos transaccionales y recuperación de acceso](#11-correos-transaccionales-y-recuperación-de-acceso)

---

## 1. Para quién es y qué resuelve

Esta consola resuelve la administración integral del ciclo de vida del hardware de TerraSense:

1. **Aprovisionamiento y Control de Inventario:** Generación, auditoría y control de los códigos únicos de 15 dígitos (*Pairing Codes*) de cada sonda fabricada antes de su entrega al cliente.
2. **Monitoreo Técnico de Salud de la Flota:** Supervisión en tiempo real del estado de batería (voltaje Li-Ion), última fecha/hora de conexión, versión de firmware activa y estado de enlace de cada equipo en terreno.
3. **Panel de Soporte Técnico Multicriterio:** Búsqueda rápida de equipos por código de 15 dígitos, alias o correo electrónico de cualquiera de los usuarios enlazados (dueño, admin u operador).
4. **Auditoría y Gestión de Miembros:** Capacidad para autorizar, revocar o reasignar roles de usuarios vinculados a una sonda, así como desvincular cuentas huérfanas.
5. **Reseteo de Fábrica (Factory Reset):** Proceso seguro para limpiar completamente la membresía y mediciones privadas de un equipo vendido o transferido, conservando su hardware y número de serie intactos.
6. **Gestión y Publicación de Firmware OTA:** Repositorio de binarios compilados de ESP32 para desplegar actualizaciones de firmware inalámbricas vía WiFi/OTA.
7. **Corpus de Validación Metrológica:** Registro y contraste estadístico de muestras de campo contrastadas contra laboratorios químicos acreditados (evidencia empírica para la defensa de título y control de calidad).

---

## 2. Módulos y Enrutamiento de la Consola

La aplicación utiliza **React Router DOM v7** con un layout unificado (`DashboardLayout.tsx`) que gestiona la sesión, la cabecera del usuario y el conmutador de tema.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TERRASENSE · ADMIN CONSOLA WEB                        │
├──────────────┬──────────────────┬──────────────┬──────────────┬─────────────┤
│ 📡 FLOTA     │ 🛡️ SOPORTE       │ 🗺️ MAPA GIS  │ ⚡ FIRMWARE  │ 🔬 LAB      │
│ /devices     │ /admin           │ /gis         │ /firmware    │ /validation │
│ Mis Equipos  │ Búsqueda global, │ Interpolación│ Releases OTA │ Contraste   │
│ y Telemetría │ Ficha y Reset    │ IDW 7 capas  │ Binarios ESP │ vs Sonda    │
└──────────────┴──────────────────┴──────────────┴──────────────┴─────────────┘
```

### 2.1. Gestión de Flota (`/devices`)
* Lista todos los dispositivos accesibles para la sesión autenticada.
* Tarjetas de estado con alias, código formateado de 15 dígitos (`XXX-XXX-XXX-XXX-XXX`), versión de firmware y badge de conectividad en tiempo real (activo/inactivo, online si se conectó en la última hora).
* Muestra el porcentaje y voltaje de la batería Li-Ion 18650 para detectar sondas con necesidad de recarga.

### 2.2. Panel de Soporte Técnico (`/admin`)
* **Acceso Restringido:** Protegido por la RPC `is_support_staff()`. Si el usuario no pertenece a la tabla `admin_support_users` activa, la base de datos rechaza la llamada con error Postgres `42501`.
* **Buscador Multicriterio:** Invoca el RPC `admin_search(p_query)`. Permite buscar ingresando:
  - Código numérico de 15 dígitos (con o sin espacios/guiones).
  - Nombre o alias asignado a la sonda.
  - Correo electrónico de cualquier usuario vinculado (dueño, administrador u operador).
* **Resultados en Tiempo Real:** Renderiza tarjetas interactivas con badges de rol, motivo de coincidencia (`member_email`, `device_code`, `alias`), estado de conectividad e ingreso directo a la ficha del equipo.
* Incluye botón de limpieza rápida (`X`) y diseño en panel de vidrio (*glass-panel*).

### 2.3. Ficha Detallada de Sonda (`/admin/devices/:id`)
Página de diagnóstico exhaustivo que reúne toda la información técnica mediante la RPC `admin_get_device_detail(p_device_id)`:
1. **Metadatos de Hardware:** Código de vinculación, versión de firmware actual vs. catálogo publicado, versión de hardware, fecha de registro y última señal.
2. **Gestión de Membresías y Roles:**
   - Visualiza todos los usuarios vinculados con sus correos y roles (`owner`, `admin`, `operator`).
   - Selector en línea para cambiar rol (`setMemberRole`). Al promover a un nuevo `owner`, el dueño anterior pasa automáticamente a `admin`.
   - Toggle para autorizar o suspender acceso sin romper el vínculo (`setMemberAuthorized`).
   - Desvinculación definitiva de miembros individuales (`removeMember`).
3. **Telemetría de Batería:**
   - Historial de hasta 100 lecturas recientes de voltaje, porcentaje y estado de carga.
   - Filtros por rango de fecha (`Desde` / `Hasta`) para analizar curvas de descarga.
4. **Registro de Mediciones Agronómicas:**
   - Últimas 50 lecturas sincronizadas en terreno (humedad, temperatura, conductividad eléctrica, pH, nitrógeno, fósforo, potasio).
   - Acceso a coordenadas GPS para verificar en qué potrero se utilizó.

### 2.4. Reseteo de Fábrica Seguro (`FactoryResetModal`)
* Ubicado en la ficha de soporte de la sonda para casos donde el agricultor vendió el equipo o transfirió la propiedad.
* **Confirmación Estricta:** Exige escribir de manera manual y exacta el código de 15 dígitos del equipo antes de habilitar el botón de reseteo.
* **Ejecución Atómica (`admin_factory_reset_device`):**
  - Desvincula a **todos** los usuarios enlazados (dueño, administradores, operadores).
  - Elimina el historial privado de mediciones, cuadrantes y alertas del usuario anterior.
  - **Conserva el hardware intacto:** el `device_code`, `firmware_version` y `hardware_version` no se borran, permitiendo que un nuevo agricultor lo vincule inmediatamente como primer dueño.

### 2.5. Gestión y Publicación de Firmware OTA
* Repositorio de binarios compilados `.bin` para ESP32 con versionado semántico (`v1.2.0`, `v1.3.1`, etc.).
* Marcado de actualizaciones críticas/obligatorias (`is_mandatory`).
* Disparo de notificaciones push a través de la cola `push_alerts` para avisar a la app móvil de los equipos afectados que existe una nueva versión disponible para flashear vía OTA.

### 2.6. Visor Geoespacial IDW
* Renderizado de mapas de variabilidad predial sobre un elemento `<canvas>` HTML5 de alto rendimiento.
* Interpolación espacial por Distancia Inversa Ponderada (IDW, exponente $p = 2$) sobre las 7 variables del sensor (pH, CE, VWC, Temperatura, N, P, K).
* Independiente de servidores cartográficos comerciales: opera localmente en el navegador.

### 2.7. Corpus de Validación Metrológica
* Módulo de respaldo científico y metrológico para la defensa de título y control de calidad.
* Permite cargar resultados certificados de laboratorio químico de suelos (ej. INIA / laboratorios acreditados) y contrastarlos contra las lecturas tomadas por las sondas TerraSense en el mismo lote y fecha.
* Calcula automáticamente el porcentaje de concordancia ($R^2$ / error relativo %) para pH, CE y macronutrientes.

---

## 3. Sistema de Diseño y Modo Claro/Oscuro

La consola implementa una estética de alta gama con soporte completo para **Modo Oscuro y Modo Claro**:

* **Tokens de Color Semánticos:** Definidos en `Web/src/index.css` mediante la directiva `@theme` de Tailwind CSS v4.
  - `bg-terra-bg` / `bg-terra-surface`: Fondos oscuros profundos (`#070B0E` / `#0E171E`) o fondos claros limpios (`#F3F5F4` / `#FFFFFF`).
  - `text-terra-text` / `text-terra-muted`: Contraste tipográfico optimizado en ambos modos.
  - `border-terra-border`: Delimitación sutil y elegante de componentes.
  - `text-terra-primary`: Verde esmeralda agronómico de alto impacto (`#10B981` / `#059669`).
  - `verdict-green`, `verdict-amber`, `verdict-red`: Colores de estado técnico y agronómico.
* **Componente `ThemeToggle`:** Permite alternar el tema instantáneamente con animación suave.
* **Persistencia:** Guarda la preferencia en `localStorage` bajo la clave `terra-theme` y aplica el atributo `data-theme="light"` o `data-theme="dark"` en el elemento raíz `<html>`.
* **Efecto Glassmorphism:** Clase utilitaria `.glass-panel` configurada con `backdrop-blur-md` y bordes adaptativos que garantizan legibilidad bajo sol brillante o en sala de control oscura.

---

## 4. Estructura de carpetas

```text
Web/
├── index.html                      # Documento HTML5 raíz con fuentes Inter / Outfit
├── vite.config.ts                  # Configuración de Vite 6 + React 19 + Tailwind CSS v4
├── vercel.json                     # Configuración de rewrite SPA para Vercel
├── package.json                    # Dependencias y scripts de construcción
├── backend/                        # Capa de integración RPC para administración
│   ├── adminApi.ts                 # Funciones tipadas para soporte, miembros, firmware y reset
│   ├── database.types.ts           # Definiciones de tipos generadas desde PostgreSQL
│   ├── supabaseAdmin.ts            # Cliente Supabase tipado para el backoffice
│   └── types.ts                    # Interfaces de datos para respuestas y entidades de soporte
└── src/
    ├── main.tsx                    # Montaje de React con ThemeProvider y BrowserRouter
    ├── App.tsx                     # Enrutador principal de sesión (Auth, Reset, Rutas)
    ├── index.css                   # Tokens de diseño Tailwind 4 (@theme) y estilos glassmorphism
    ├── types.ts                    # Tipos de entidades frontend (mediciones, flota, telemetría)
    ├── contexts/
    │   └── ThemeContext.tsx        # Contexto de React para cambio de tema Claro/Oscuro
    ├── layouts/
    │   └── DashboardLayout.tsx     # Shell principal con barra superior, navegación y tema
    ├── pages/
    │   ├── DevicesPage.tsx         # /devices - Vista de flota y salud de sondas
    │   ├── SupportPanelPage.tsx    # /admin - Buscador global y panel de soporte técnico
    │   ├── SupportDeviceDetailPage.tsx # /admin/devices/:id - Ficha, telemetría y membresías
    │   ├── DashboardHome.tsx       # Resumen general y métricas operativas
    │   ├── GisMapPage.tsx          # Visor geoespacial con selector de capas
    │   └── ValidationPage.tsx      # Módulo de contraste metrológico contra laboratorio
    ├── components/
    │   ├── AuthScreen.tsx          # Pantalla de inicio de sesión administrativo
    │   ├── ResetPasswordScreen.tsx # Formulario de nueva contraseña (recuperación)
    │   ├── ThemeToggle.tsx         # Conmutador animado Sol / Luna
    │   ├── Dashboard.tsx           # Contenedor de módulos tradicionales
    │   ├── GisHeatmap.tsx          # Motor de interpolación espacial IDW en Canvas
    │   ├── FirmwareView.tsx        # Subida y catálogo de binarios OTA
    │   └── admin/
    │       └── FactoryResetModal.tsx # Modal de confirmación crítica de reseteo de fábrica
    ├── services/
    │   └── supabase.ts             # Cliente de Supabase del frontend
    └── utils/
        └── verdict.ts              # Formateo de códigos de 15 dígitos, fechas y semáforos
```

---

## 5. Capa Backend y Funciones RPC

Toda la lógica de soporte y administración sensible se ejecuta en la base de datos PostgreSQL mediante **Remote Procedure Calls (RPCs)** definidas en `supabase/migrations/20260902120000_panel_soporte_backend.sql`. El frontend web las consume a través de `Web/backend/adminApi.ts`:

| Función en `adminApi.ts` | RPC en Postgres | Parámetros Clave | Qué hace |
| :--- | :--- | :--- | :--- |
| `isSupportStaff()` | `is_support_staff` | — | Comprueba si el usuario autenticado tiene rol de soporte activo. |
| `searchDevices()` | `admin_search` | `p_query: text` | Búsqueda multicriterio (código 15 dígitos, alias, email de miembro). |
| `getDeviceDetail()` | `admin_get_device_detail` | `p_device_id: uuid` | Obtiene equipo, firmware, última señal, miembros, 100 baterías y 50 mediciones. |
| `setMemberAuthorized()`| `admin_set_member_authorized` | `p_device_id`, `p_user_id`, `p_authorized` | Activa o suspende el acceso de un usuario al equipo. |
| `setMemberRole()` | `admin_set_member_role` | `p_device_id`, `p_user_id`, `p_role` | Cambia el rol (`owner`, `admin`, `operator`). Traspasa la propiedad automáticamente si es `owner`. |
| `removeMember()` | `admin_unbind_user_device`| `p_device_id`, `p_user_id` | Desvincula totalmente a un usuario del equipo. |
| `factoryResetDevice()` | `admin_factory_reset_device`| `p_device_id`, `p_confirm_device_code` | Borra membresías y mediciones privadas; exige código de 15 dígitos. |
| `pushFirmwareUpdate()` | `admin_push_firmware_update`| `p_device_id`, `p_firmware_release_id` | Genera alerta push para avisar a la sonda de una actualización OTA. |

---

## 6. El Visor GIS: por qué IDW y no Kriging

En la consola web, el mapa predial de calor utiliza el algoritmo **IDW (Inverse Distance Weighting)** con exponente $p = 2$:

$$\hat{z}(x) = \frac{\sum_{i=1}^n \frac{z_i}{d_i^p}}{\sum_{i=1}^n \frac{1}{d_i^p}}$$

### ¿Por qué IDW en Canvas y no Kriging en Base de Datos?
1. **Limitación de Extensiones Cloud:** PostGIS no implementa Kriging de forma nativa; requeriría extensiones como `PL/R` o `PL/Python`, no disponibles en entornos PostgreSQL gestionados estándar.
2. **Procesamiento en Cliente:** El cálculo se ejecuta directamente en el navegador del administrador sobre un elemento `<canvas>` HTML5 de alto rendimiento.
3. **Independencia de APIs Pagadas:** No depende de claves de Google Maps ni servidores de teselas comerciales.
4. **Malla Optimizada:** La interpolación se calcula en cuadrículas de 6 px con suavizado bilineal, logrando renderizados fluidos sin bloquear el hilo principal.

> [!NOTE]
> La consola exige un mínimo de **3 puntos de muestreo georreferenciados** para proyectar la superficie interpolada, indicando con claridad qué área es dato medido y cuál es estimación espacial.

---

## 7. Seguridad y Aislamiento (Postgres RLS)

La seguridad de la consola reside íntegramente en la base de datos PostgreSQL mediante **Row Level Security (RLS)**:
* La aplicación cliente no filtra datos por software: las políticas de base de datos determinan exactamente qué filas puede leer o modificar el usuario autenticado.
* Para el panel de soporte, cada RPC valida explícitamente `is_support_staff()`; ningún usuario común puede invocar estas funciones.
* **Nunca exponer la clave `service_role`** en el frontend: la aplicación web opera exclusivamente con `VITE_SUPABASE_ANON_KEY`.

---

## 8. Variables de entorno

Crear el archivo `Web/.env` basándose en `Web/.env.example`:

```bash
VITE_SUPABASE_URL=https://bjmhjatykqccksddgtmo.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_publica
```

---

## 9. Comandos de desarrollo

```bash
# Entrar al directorio
cd Web

# Instalación de dependencias
npm install

# Servidor local de desarrollo (http://localhost:5173)
npm run dev

# Verificación estricta de tipos TypeScript
npm run type-check

# Compilación de producción optimizada (genera dist/)
npm run build

# Vista previa local del build compilado
npm run preview
```

---

## 10. Despliegue en Vercel

> [!IMPORTANT]
> **Estado en Producción:**
> * **URL Activa:** **https://terrasense-web.vercel.app**
> * **Proyecto Vercel:** `akura3/terrasense-web`
> * **Configuración SPA:** `Web/vercel.json` gestiona el reenvío de todas las rutas a `index.html` para permitir navegación directa a `/devices` o `/admin`.

Para desplegar actualizaciones o configurar una nueva instancia:

```bash
cd Web

# Desplegar a producción
vercel --prod --yes
```

---

## 11. Correos transaccionales y recuperación de acceso

El proyecto cuenta con un servidor SMTP propio de Gmail configurado en Supabase (`[auth.email.smtp]`) y plantillas HTML personalizadas con la identidad gráfica de TerraSense:

| Correo | Cuándo se dispara | Plantilla | Estado |
| :--- | :--- | :--- | :---: |
| **Recuperación de contraseña** | «Olvidé mi contraseña» en `AuthScreen.tsx` | `supabase/templates/recovery.html` | 🟢 En producción |
| **Confirmación de registro** | Alta de un nuevo usuario administrador | `supabase/templates/confirmation.html` | 🟢 En producción |
| **Aviso de cambio de clave** | Tras actualizar contraseña en `ResetPasswordScreen.tsx` | `supabase/templates/password_changed.html` | 🟢 En producción |

* **Flujo Web:** Supabase envía el correo de recuperación con `redirectTo` a `https://terrasense-web.vercel.app`. Al pulsar el enlace, `App.tsx` detecta el evento `PASSWORD_RECOVERY` y presenta la pantalla interactiva `ResetPasswordScreen.tsx` para definir la nueva contraseña.
* **Flujo Móvil:** La app móvil comparte exactamente la misma infraestructura SMTP y despacha el correo solicitando el deep link `terrasense://reset-password`.

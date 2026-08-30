# 🖥️ TerraSense · Consola Web de Administración y Gestión de Flota

Consola central de operaciones y administración en **React 19 + Vite 6 + Tailwind 4 + TypeScript**. 
Es la **herramienta de control, aprovisionamiento de hardware y soporte técnico del administrador del proyecto (Álvaro)** para gestionar el parque de dispositivos TerraSense, supervisar la telemetría en terreno, publicar firmware OTA y auditar la validación metrológica.

> [!IMPORTANT]
> **Propósito y Arquitectura:**
> * **No es un portal de agricultores ni una plataforma SaaS con suscripciones.** En TerraSense, el agricultor opera de forma 100% autónoma en terreno mediante la **App Móvil** (offline-first, sin planes mensuales ni pagos recurrentes).
> * **La Consola Web es el Backoffice Central del Creador/Administrador** para administrar el hardware vendido, dar de alta números de serie, monitorear la salud de la batería de las sondas, gestionar actualizaciones de firmware y brindar soporte agronómico avanzado.

---

## 📑 Contenido

- [1. Para quién es y qué resuelve](#1-para-quién-es-y-qué-resuelve)
- [2. Módulos y Pestañas de la Consola](#2-módulos-y-pestañas-de-la-consola)
- [3. Estructura de carpetas](#3-estructura-de-carpetas)
- [4. El Visor GIS: por qué IDW y no Kriging](#4-el-visor-gis-por-qué-idw-y-no-kriging)
- [5. Seguridad y Aislamiento (Postgres RLS)](#5-seguridad-y-aislamiento-postgres-rls)
- [6. Variables de entorno](#6-variables-de-entorno)
- [7. Comandos de desarrollo](#7-comandos-de-desarrollo)
- [8. Despliegue en Vercel](#8-despliegue-en-vercel)
- [9. 🛠️ Manual de instalación y puesta en marcha](#9-️-manual-de-instalación-y-puesta-en-marcha)
- [10. Correos transaccionales: recuperación, confirmación y aviso de cambio](#10-correos-transaccionales-recuperación-confirmación-y-aviso-de-cambio)
- [11. Aplicar el mismo esquema en la App móvil (pendiente)](#11-aplicar-el-mismo-esquema-en-la-app-móvil-pendiente)

---

## 1. Para quién es y qué resuelve

Esta consola resuelve la administración integral del ciclo de vida del hardware de TerraSense:

1. **Aprovisionamiento y Control de Inventario:** Generación y registro de códigos de vinculación únicos de 15 dígitos (*Pairing Codes*) para cada sonda fabricada antes de su entrega al cliente.
2. **Monitoreo Técnico de Salud de la Flota:** Supervisión en tiempo real del estado de batería (voltaje Li-Ion), última fecha/hora de conexión, versión de firmware activa y estado de enlace de cada equipo en terreno.
3. **Gestión y Publicación de Firmware OTA:** Repositorio de binarios compilados de ESP32 para desplegar actualizaciones de firmware Over-The-Air vía WiFi.
4. **Supervisión Global de Mediciones y Soporte:** Vista agregada de todas las mediciones sincronizadas con búsqueda multicriterio (por predio, cultivo, fecha o equipo) para auditoría agronómica y soporte técnico al productor.
5. **Corpus de Validación Metrológica:** Registro y análisis comparativo de muestras de campo contrastadas contra laboratorios químicos acreditados (evidencia empírica para la defensa de título y control de calidad).

---

## 2. Módulos y Pestañas de la Consola

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TERRASENSE · ADMIN CONSOLA WEB                        │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│ 📊 MEDICIONES│ 🗺️ MAPA GIS  │ 📡 EQUIPOS   │ ⚡ FIRMWARE  │ 🔬 VALIDACIÓN   │
│ Telemetría   │ Interpolación│ Salud Flota, │ Releases OTA │ Contraste Lab   │
│ y Semáforo   │ IDW predial  │ Batería, IDs │ Binarios ESP │ vs Sonda Inox   │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────────┘
```

| Pestaña | Propósito Operacional | Funcionalidad Clave |
| :--- | :--- | :--- |
| **📊 Mediciones** | Auditoría y soporte agronómico | Tabla global de mediciones sincronizadas, filtrable por predio, cultivo, fecha y semáforo. |
| **🗺️ Mapa GIS** | Análisis geoespacial de variabilidad | Mapa de calor predial con interpolación IDW sobre 7 variables (pH, CE, VWC, Temp, N, P, K). |
| **📡 Equipos (Flota)** | Gestión y salud del parque de sondas | Inventario de equipos, códigos de 15 dígitos, nivel de batería Li-Ion, firmware actual y última señal. |
| **⚡ Firmware OTA** | Despliegue inalámbrico de software | Carga de binarios `.bin` de ESP32, versionado semántico y activación de releases OTA. |
| **🔬 Validación Lab** | Respaldo metrológico y defensa | Comparación estadística de lecturas TerraSense vs Laboratorio Acreditado (cálculo de concordancia %). |

---

## 3. Estructura de carpetas

```text
Web/
├── index.html                  Punto de entrada HTML5
├── vite.config.ts              Vite 6 + React 19 + Tailwind 4
├── vercel.json                 Configuración de despliegue SPA
├── src/
│   ├── main.tsx                Punto de montaje de React
│   ├── App.tsx                 Enrutador de sesión: Login vs Dashboard
│   ├── index.css               Design System (Tokens Tailwind 4 @theme)
│   ├── types.ts                Tipos TypeScript alineados con el esquema Supabase
│   ├── services/supabase.ts    Cliente de conexión Supabase
│   ├── utils/verdict.ts        Utilidades de semáforo, formateo de IDs y concordancia
│   └── components/
│       ├── LoginScreen.tsx     Acceso administrativo seguro
│       ├── Dashboard.tsx       Contenedor principal con navegación por pestañas
│       ├── GisHeatmap.tsx      Renderizador de mapas de calor por IDW en Canvas
│       └── FirmwareView.tsx    Módulo de administración y subida de binarios OTA
└── package.json
```

---

## 4. El Visor GIS: por qué IDW y no Kriging

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

## 5. Seguridad y Aislamiento (Postgres RLS)

La seguridad de la consola reside íntegramente en la base de datos PostgreSQL mediante **Row Level Security (RLS)**:
* La aplicación cliente no filtra datos por software: las políticas de base de datos (`has_device_access`) determinan exactamente qué filas puede leer o modificar el usuario autenticado.
* **Nunca exponer la clave `service_role`** en el frontend: la aplicación web opera exclusivamente con `VITE_SUPABASE_ANON_KEY`.

---

## 6. Variables de entorno

Crear el archivo `Web/.env` basándose en `Web/.env.example`:

```bash
VITE_SUPABASE_URL=https://bjmhjatykqccksddgtmo.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_publica
```

---

## 7. Comandos de desarrollo

```bash
# Instalación de dependencias
npm install

# Servidor local de desarrollo (http://localhost:5173)
npm run dev

# Verificación estricta de tipos TypeScript
npm run type-check

# Compilación de producción optimizada
npm run build

# Vista previa local del build de producción
npm run preview
```

---

## 8. Despliegue en Vercel

> [!IMPORTANT]
> **Estado real — desplegada y verificada.**
> **URL de producción: https://terrasense-web.vercel.app**
> Proyecto Vercel: `akura3/terrasense-web` (vinculado desde `Web/` como raíz, usando `Web/vercel.json`).
> Variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` ya configuradas en producción.
> El dominio es el gratuito `*.vercel.app`; no se ha comprado un dominio propio. Si se agrega uno,
> hay que sumarlo también a `additional_redirect_urls` en `supabase/config.toml` y volver a
> `supabase config push` (ver sección 10).

La consola está configurada para despliegue continuo en Vercel mediante `vercel.json`. Para desplegar desde cero en otra cuenta, o para redeploy manual:

```bash
cd Web

# Iniciar sesión en Vercel CLI (una vez)
vercel login

# Vincular el proyecto (usa Web/vercel.json como configuración del proyecto)
vercel link --yes --project terrasense-web

# Configurar variables de entorno en producción (una vez)
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production

# Desplegar a producción
vercel --prod --yes
```

Cada `vercel --prod` desde `Web/` construye con `npm install && npm run build` y publica el contenido de `dist/` — no depende de que exista un `vercel.json` en la raíz del repositorio ni de configurar un *Root Directory* en el panel de Vercel, porque se despliega directamente desde la subcarpeta.

---

## 9. 🛠️ Manual de Instalación y Puesta en Marcha

### 9.1. Requisitos de Entorno
* **Node.js:** Versión 20 o 22 LTS
* **npm:** Versión 10+
* **Git:** Versión 2.40+

### 9.2. Instalación Paso a Paso

```bash
# 1. Clonar el repositorio
git clone https://github.com/Alvarinhoooo7/TerraSence.git

# 2. Entrar a la carpeta web
cd TerraSence/Web

# 3. Instalar paquetes
npm install

# 4. Crear archivo de variables de entorno
cp .env.example .env

# 5. Iniciar servidor de desarrollo
npm run dev
```

### 9.3. Verificación de Compilación Correcta

```bash
npm run type-check   # Debe retornar 0 errores
npm run build        # Debe generar la carpeta dist/ sin advertencias
```

---

## 10. Correos transaccionales: recuperación, confirmación y aviso de cambio

> [!IMPORTANT]
> **Estado real — activo en producción desde el 30 de agosto de 2026.** Los tres correos usan SMTP propio de Gmail y las tres plantillas con marca TerraSense ya están en el proyecto Supabase remoto. No queda ninguna acción manual pendiente en este punto.

| Correo | Cuándo se dispara | Plantilla propia | Estado |
| :--- | :--- | :---: | :---: |
| **Recuperar contraseña** | El usuario pulsa «Olvidé mi contraseña» en `LoginScreen.tsx` | `supabase/templates/recovery.html` | 🟢 Activo, con plantilla y remitente propios |
| **Confirmar registro** | Se crea una cuenta nueva (alta de un administrador/operador) | `supabase/templates/confirmation.html` | 🟢 Activo (`enable_confirmations = true`), con plantilla propia |
| **Aviso de contraseña cambiada** | Justo después de que `ResetPasswordScreen.tsx` llama a `updateUser({ password })` | `supabase/templates/password_changed.html` | 🟢 Activo (`[auth.email.notification.password_changed]`, notificación nativa de Supabase Auth — no requiere ninguna llamada extra desde el código) |

### 10.1. Qué se hizo, en orden

1. **Se corrigió un bug real de flujo**, no solo de correo: el enlace de recuperación dejaba al usuario directo en el Dashboard sin ninguna pantalla para escribir la contraseña nueva. `App.tsx` ahora detecta el evento `PASSWORD_RECOVERY` de Supabase y muestra `ResetPasswordScreen.tsx` antes de dejar entrar a la consola.
2. `resetPasswordForEmail` en `LoginScreen.tsx` ahora envía `redirectTo: window.location.origin`, y `site_url` / `additional_redirect_urls` en `supabase/config.toml` apuntan a `https://terrasense-web.vercel.app` (además de `localhost` para desarrollo).
3. Se habilitó `enable_confirmations = true` para que el alta de una cuenta exija confirmar el correo.
4. Se configuró SMTP propio con una cuenta de Gmail (`smtp.gmail.com:587`, con contraseña de aplicación) en `[auth.email.smtp]` — esto es lo que permite usar plantillas personalizadas en el plan gratuito de Supabase, que las rechaza si se depende del proveedor de correo por defecto.
5. Se activaron las tres plantillas propias: `[auth.email.template.recovery]`, `[auth.email.template.confirmation]` y `[auth.email.notification.password_changed]` (esta última, nueva: se creó `supabase/templates/password_changed.html`, con el mismo estilo visual que las otras dos).
6. Todo lo anterior está aplicado en el proyecto Supabase remoto (`supabase config push`), verificado con `supabase config push` mostrando *"Remote Auth config is up to date"*.

### 10.2. Detalle técnico que vale la pena dejar anotado: rutas de `content_path`

> [!WARNING]
> El CLI de Supabase resuelve `content_path` **de forma distinta según la sección**, algo no documentado y que costó varios intentos fallidos (`open supabase\supabase\templates\...`, `open templates\...: no encontrado`) hasta dar con el patrón correcto, corriendo siempre `supabase config push` desde la raíz del repo:
>
> | Sección | Base de resolución | Ejemplo correcto |
> | :--- | :--- | :--- |
> | `[auth.email.template.*]` | Raíz del repositorio | `content_path = "./supabase/templates/recovery.html"` |
> | `[auth.email.notification.*]` | Carpeta `supabase/` (donde vive `config.toml`) | `content_path = "./templates/password_changed.html"` |
>
> Si en el futuro se agrega una cuarta plantilla y `supabase config push` falla con `"the system cannot find the path specified"`, es casi seguro este mismo problema — probar el patrón de la sección equivalente en la tabla de arriba antes de sospechar de otra cosa.

### 10.3. Único límite operativo a tener presente

Gmail limita el envío por SMTP a **500 correos/día** por cuenta — muy por encima de cualquier volumen realista de esta consola (uso administrativo, no masivo de agricultores), pero conviene declararlo. Si el volumen de correos de confirmación crece de forma relevante (por ejemplo, si la app móvil empieza a registrar agricultores en masa contra el mismo proyecto Supabase), la recomendación que ya dejaba `MIGRACION_AKURA.md` (sección A5) sigue siendo migrar a un proveedor transaccional dedicado (Resend o SendGrid, ambos con plan gratuito) — la migración es solo cambiar el bloque `[auth.email.smtp]`, las plantillas no cambian.

> [!NOTE]
> Gmail limita el envío por SMTP a **500 correos/día** por cuenta — muy por encima de cualquier volumen realista de administradores de esta consola, pero conviene declararlo. Si el proyecto crece a nivel de agricultores usando la app con confirmación de correo masiva, la recomendación del propio proyecto (ver `MIGRACION_AKURA.md`, sección A5) sigue siendo migrar a un proveedor transaccional dedicado (Resend o SendGrid, ambos con plan gratuito).

---

## 11. Aplicar el mismo esquema en la App móvil (pendiente)

> [!NOTE]
> **No se modificó ningún archivo de `App/` para esta auditoría** — se deja documentado aquí, tal como se pidió, para implementarlo más adelante sin tocar la app ahora.

La app móvil (`App/src/screens/AuthScreen.tsx`) ya invoca `supabase.auth.resetPasswordForEmail(...)` para la recuperación de contraseña (ver `App/README.md`), y comparte exactamente el mismo backend de Auth que esta consola — por lo tanto, **con el SMTP de Gmail y las tres plantillas ya activas (sección 10), un agricultor que pida recuperar su contraseña desde la app ya recibe hoy el correo con la marca TerraSense**, sin ningún cambio de código adicional: la plantilla vive en Supabase, no en el cliente.

Lo que sí falta específicamente del lado de la app, y que replica el bug que se corrigió en esta consola (sección 10.1), es una pantalla equivalente a `ResetPasswordScreen.tsx`:

- **Problema esperado:** un enlace de recuperación de contraseña en un correo, en el contexto de una app móvil, no puede simplemente abrir `window.location.origin` — Supabase necesita un **deep link** de la app (esquema `terrasense://reset-password` o un *Universal Link*/*App Link*) configurado como `redirectTo` y dado de alta en `additional_redirect_urls`.
- **Trabajo pendiente cuando se aborde:**
  1. Registrar un esquema de deep link en `App/app.config.js` (Expo ya soporta esto vía `scheme`).
  2. Pasar `redirectTo: 'terrasense://reset-password'` (o el esquema elegido) en la llamada a `resetPasswordForEmail` de `AuthScreen.tsx`.
  3. Sumar ese esquema a `additional_redirect_urls` en `supabase/config.toml` y hacer `supabase config push`.
  4. Crear una pantalla `ResetPasswordScreen.tsx` en `App/src/screens/`, equivalente a la de esta consola, que capture el evento `PASSWORD_RECOVERY` (Supabase JS emite el mismo evento en React Native) y muestre un formulario de contraseña nueva antes de dejar entrar al Dashboard de la app.
- **Lo que NO hay que rehacer:** el correo de confirmación de registro y el aviso de "contraseña cambiada" no requieren ningún trabajo adicional en la app — son responsabilidad exclusiva del backend de Auth y llegan igual de personalizados en cuanto el SMTP esté activo.

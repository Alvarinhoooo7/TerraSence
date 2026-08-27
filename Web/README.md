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

La consola está configurada para despliegue continuo en Vercel mediante `vercel.json`:

```bash
# Iniciar sesión en Vercel CLI
vercel login

# Vincular proyecto
vercel link

# Configurar variables de entorno en producción
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production

# Desplegar a producción
vercel --prod
```

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

# 🖥️ TerraSense · Consola Agronómica Web

Consola de operaciones en **React 19 + Vite 6 + Tailwind 4 + TypeScript**. Es la vista de escritorio
del sistema: mediciones de todos los predios, equipos, mapa de calor predial y corpus de validación
metrológica.

> Este documento cubre **sólo la carpeta `Web/`**. La especificación del producto está en el
> [README raíz](../README.md); la app de campo, en [`App/README.md`](../App/README.md); el backend,
> en [`supabase/README.md`](../supabase/README.md).

---

## 📑 Contenido

- [1. Para quién es](#1-para-quién-es)
- [2. Pestañas](#2-pestañas)
- [3. Estructura de carpetas](#3-estructura-de-carpetas)
- [4. El visor GIS: por qué IDW y no Kriging](#4-el-visor-gis-por-qué-idw-y-no-kriging)
- [5. Seguridad: la consola no filtra, filtra el servidor](#5-seguridad-la-consola-no-filtra-filtra-el-servidor)
- [6. Variables de entorno](#6-variables-de-entorno)
- [7. Comandos de desarrollo](#7-comandos-de-desarrollo)
- [8. Despliegue en Vercel](#8-despliegue-en-vercel)
- [9. Pendientes conocidos](#9-pendientes-conocidos)
- [10. 🛠️ Manual de instalación de herramientas](#10-️-manual-de-instalación-de-herramientas)

---

## 1. Para quién es

No es para el agricultor en el potrero — para eso está la app. Esta consola sirve a **asesores
agronómicos, cooperativas, PRODESAL y soporte técnico**: gente que revisa muchos predios desde un
escritorio y necesita comparar, buscar y exportar.

---

## 2. Pestañas

| Pestaña | Qué muestra |
| :--- | :--- |
| **Mediciones** | Tabla completa con resumen por veredicto. pH, CE, humedad, temperatura y NPK |
| **Mapa GIS** | Mapa de calor predial interpolado sobre 7 variables seleccionables |
| **Equipos** | Sondas con su código de 15 dígitos, batería, firmware y última señal |
| **Validación de laboratorio** | Contraste TerraSense contra laboratorio acreditado, con concordancia |

La pestaña de validación no es decorativa: es **la evidencia que sostiene los KPI metrológicos** del
proyecto. Sin declarar el método de referencia, la correlación no es verificable ante una comisión.

La búsqueda superior filtra por predio, cultivo, veredicto y código de equipo a la vez.

---

## 3. Estructura de carpetas

```text
Web/
├── index.html                  Punto de entrada
├── vite.config.ts              Vite + plugin de React + Tailwind 4
├── vercel.json                 Configuración de despliegue
├── src/
│   ├── main.tsx                Arranque de React
│   ├── App.tsx                 Puerta de sesión: login o consola
│   ├── index.css               Tokens de tema (Tailwind 4 `@theme`)
│   ├── types.ts                Tipos alineados con el esquema real
│   ├── services/supabase.ts    Cliente
│   ├── utils/verdict.ts        Semáforo, formato de código y concordancia
│   └── components/
│       ├── LoginScreen.tsx     Acceso y recuperación de contraseña
│       ├── Dashboard.tsx       Las cuatro pestañas
│       └── GisHeatmap.tsx      Mapa de calor por IDW sobre canvas
└── package.json
```

> [!NOTE]
> `types.ts` **duplica** deliberadamente los tipos de la app móvil. Son dos proyectos npm
> independientes; compartirlos exigiría un paquete común, que a esta escala cuesta más de lo que
> ahorra. Si cambia el esquema, hay que tocar los dos — regenerar con
> `supabase gen types typescript --linked` ayuda a no olvidarlo.

---

## 4. El visor GIS: por qué IDW y no Kriging

El README raíz prometía interpolación por *Kriging* «mediante PostGIS». **No es posible**: PostGIS no
implementa Kriging, requiere las extensiones `PL/R` o `PL/Python`, y la Postgres gestionada de
Supabase no las habilita.

Se usa **IDW** (ponderación inversa de la distancia, p = 2), que sí es exacto, barato y suficiente
para mapear variabilidad intrapredial con decenas de puntos:

```text
z(x) = Σ( zᵢ / dᵢᵖ ) / Σ( 1 / dᵢᵖ )
```

Se calcula **en el navegador sobre canvas**. Eso trae tres ventajas que conviene no perder:

1. No hace falta servidor de teselas ni clave de API.
2. No hay restricción de términos de servicio, a diferencia de Google Maps.
3. Funciona con la base de datos caída, si los puntos ya están cargados.

La malla se interpola cada 6 px y luego se escala: visualmente idéntico a hacerlo píxel a píxel, y
sin bloquear el hilo principal en predios grandes.

> [!IMPORTANT]
> Los círculos son **mediciones reales**; la superficie entre ellos es una **estimación**. La
> interfaz lo dice explícitamente, y esa distinción es exactamente la que un evaluador va a exigir.
> Exige al menos 3 puntos georreferenciados, y lo indica en vez de dibujar una superficie sin sentido.

---

## 5. Seguridad: la consola no filtra, filtra el servidor

La consola **no aplica filtros de seguridad propios**. Lo que cada usuario ve lo acota Row Level
Security en Postgres, porque un filtro en el cliente no es una defensa: cualquiera puede abrir las
herramientas de desarrollo y pedir la tabla completa.

> [!CAUTION]
> Si al añadir una vista notas que «faltan datos», la respuesta correcta casi nunca es relajar la
> política de RLS. Revisa primero si el usuario tiene la membresía que corresponde en
> `device_members`. Ver [`supabase/README.md`](../supabase/README.md).

---

## 6. Variables de entorno

Crear `Web/.env` a partir de `Web/.env.example`:

```bash
VITE_SUPABASE_URL=https://bjmhjatykqccksddgtmo.supabase.co
VITE_SUPABASE_ANON_KEY=
```

> [!NOTE]
> Vite sólo expone al navegador las variables con prefijo `VITE_`. **Nunca** pongas aquí la clave de
> servicio (`service_role`): quedaría empaquetada en el JavaScript público y daría acceso total
> saltándose RLS.

---

## 7. Comandos de desarrollo

```bash
npm install          # dependencias
npm run dev          # servidor de desarrollo (http://localhost:5173)
npm run build        # compilación de producción → dist/
npm run preview      # sirve dist/ para comprobar el build
npm run type-check   # tsc --noEmit
```

---

## 8. Despliegue en Vercel

`vercel.json` ya está configurado, incluida la reescritura que hace funcionar el enrutado del lado
del cliente.

```bash
vercel login                                    # interactivo: abre el navegador
vercel link                                     # vincula la carpeta al proyecto
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod                                   # despliegue
```

> [!WARNING]
> `vercel login` **exige interacción**: abre un flujo OAuth en el navegador y espera confirmación.
> No puede automatizarse en un script desatendido.

---

## 9. Pendientes conocidos

- **Despliegue en Vercel** (A7–A9): bloqueado a la espera del login.
- **Gestión de firmware OTA** (D6b): requiere además una tabla `firmware_releases`, que el esquema
  actual no tiene.
- **Exportación a CSV / GeoJSON** de las mediciones filtradas.
- Afinar el diseño con las capturas de referencia del proyecto Akura.

El estado completo está en [`MIGRACION_AKURA.md`](../MIGRACION_AKURA.md).

---

## 10. 🛠️ Manual de Instalación de Herramientas

Desde una máquina limpia hasta poder levantar la consola.

### 10.1. Node.js y npm

Vite 6 requiere **Node 20 o 22 LTS**.

```bash
node -v     # v20.x o v22.x
npm -v
```

<details>
<summary><b>Windows</b></summary>

```powershell
winget install OpenJS.NodeJS.LTS
# con gestor de versiones:
winget install CoreyButler.NVMforWindows
nvm install 22 && nvm use 22
```
</details>

<details>
<summary><b>macOS</b></summary>

```bash
brew install node@22
# o con nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22 && nvm use 22
```
</details>

<details>
<summary><b>Linux (Debian / Ubuntu)</b></summary>

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```
</details>

### 10.2. Git

```powershell
winget install Git.Git          # Windows
```
```bash
brew install git                # macOS
sudo apt-get install -y git     # Linux
```

### 10.3. Vercel CLI

Sólo si vas a desplegar.

```bash
npm install -g vercel
vercel --version
vercel login
```

### 10.4. Navegador y extensiones recomendadas

Cualquier navegador moderno. Para desarrollo cómodo:

- **React Developer Tools** (Chrome o Firefox)
- Las herramientas de desarrollo del propio navegador, pestaña *Network*, para ver qué devuelve
  PostgREST cuando una consulta viene vacía — casi siempre es RLS, no un error.

### 10.5. Editor recomendado

**Visual Studio Code** con:

- **Tailwind CSS IntelliSense** — autocompletado de clases
- **ESLint**
- **TypeScript** (incluido)

```powershell
winget install Microsoft.VisualStudioCode    # Windows
```
```bash
brew install --cask visual-studio-code       # macOS
```

### 10.6. Puesta en marcha del proyecto

```bash
git clone https://github.com/Alvarinhoooo7/TerraSence.git
cd TerraSence/Web
npm install

cp .env.example .env      # y rellenar las dos claves (§6)

npm run dev               # http://localhost:5173
```

### 10.7. Verificación de que todo quedó bien

```bash
npm run type-check   # sin salida = 0 errores
npm run build        # debe terminar en "✓ built in ..."
npm run preview      # abre y comprueba que carga el login
```

### 10.8. Resumen de versiones

| Herramienta | Versión | ¿Obligatoria? |
| :--- | :--- | :--- |
| Node.js | 20 o 22 LTS | Sí |
| npm | 10+ | Sí |
| Git | 2.40+ | Sí |
| Vercel CLI | última | Sólo para desplegar |
| VS Code | última | Recomendado |

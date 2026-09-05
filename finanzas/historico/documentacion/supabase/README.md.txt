# 🗄️ TerraSense · Backend Supabase

Base de datos PostgreSQL con PostGIS, políticas de seguridad a nivel de fila y Edge Functions en
Deno. Es la fuente única de verdad del sistema.

> Este documento cubre **sólo la carpeta `supabase/`**. La especificación del producto está en el
> [README raíz](../README.md); la app de campo, en [`App/README.md`](../App/README.md); la consola,
> en [`Web/README.md`](../Web/README.md).

---

## 📑 Contenido

- [1. Proyecto y región](#1-proyecto-y-región)
- [2. Esquema de datos](#2-esquema-de-datos)
- [3. Seguridad: RLS](#3-seguridad-rls)
- [4. Funciones y triggers](#4-funciones-y-triggers)
- [5. Edge Functions](#5-edge-functions)
- [6. Migraciones](#6-migraciones)
- [7. Plantillas de correo](#7-plantillas-de-correo)
- [8. Comandos habituales](#8-comandos-habituales)
- [9. Diagnóstico sin Docker](#9-diagnóstico-sin-docker)
- [10. Pendientes conocidos](#10-pendientes-conocidos)
- [11. 🛠️ Manual de instalación de herramientas](#11-️-manual-de-instalación-de-herramientas)

---

## 1. Proyecto y región

| Campo | Valor |
| :--- | :--- |
| Referencia | `bjmhjatykqccksddgtmo` |
| URL | `https://bjmhjatykqccksddgtmo.supabase.co` |
| Región | **South America (São Paulo)** |
| Extensiones | `postgis`, `uuid-ossp`, `pgcrypto` |

**Por qué São Paulo.** Por latencia —Santiago–São Paulo son ~2.600 km frente a ~9.000 km a
Virginia— y porque ayuda al argumento de transferencia internacional de la **Ley 21.719**: es la
región más cercana disponible, dentro del mismo ámbito latinoamericano. No elimina la transferencia,
pero la vuelve una decisión documentada en vez de una omisión.

---

## 2. Esquema de datos

El esquema **ya estaba desplegado** cuando se vinculó este repositorio. Se adoptó tal cual (inglés,
`snake_case`) y sólo se le añadió lo que faltaba, sin renombrar ni borrar nada.

```text
auth.users
    │ 1:1 (trigger handle_new_user)
    ▼
 profiles ──────┐
                │ N:M vía device_members (user_id, device_id, role, is_authorized)
                ▼
             devices ──1:N──► soil_measurements ──► push_alerts
                │                    │
                │                    ├── geom (PostGIS, generada) + índice GiST
                │                    └──1:N──► device_status_log (histórico de batería/conexión, por trigger)
                └──1:N──► predial_quadrants

 lab_validation_records   (corpus de contraste metrológico, sin dueño)
 admin_support_users      (soporte — ligada a auth.users vía user_id desde 02-09-2026)
 admin_support_invite     (código de invitación para alta de personal de soporte)
 device_join_attempts     (freno de fuerza bruta del RPC de vinculación)
```

### 2.1. Panel de soporte (Web/backend)

Añadido el 02-09-2026: consola interna para buscar un equipo por código o por
el correo de un usuario enlazado, ver su ficha completa y administrar sus
miembros. Detalle completo, con el hallazgo de seguridad que motivó esta
migración, en `20260902120000_panel_soporte_backend.sql`. Resumen:

- `is_support_staff()` — puerta de entrada: exige `admin_support_users.user_id
  = auth.uid()` con `is_active`. La usan todas las funciones `admin_*`.
- Alta de personal por autoservicio (`support_self_register`) con **código de
  invitación** (`admin_support_invite`, hasheado con pgcrypto) como segundo
  secreto — la URL del panel no basta sola porque `auth.users` se comparte
  con la app y la consola de agricultores.
- `admin_search`, `admin_get_device_detail`, `admin_set_member_authorized`,
  `admin_set_member_role`, `admin_push_firmware_update`,
  `admin_factory_reset_device` — nuevas.
- **Reseteo de fábrica** (`admin_factory_reset_device`): para cuando el
  cliente vende o regala su sonda. Desvincula a todos los miembros y borra
  mediciones/cuadrantes/alertas de ese equipo; NO toca `device_code` (grabado
  en la NVS del hardware) ni `firmware_version`/`hardware_version` (el
  firmware real instalado). Exige repetir el `device_code` como confirmación.
  De paso se corrigió `register_paired_device()`: antes rechazaba cualquier
  equipo con `device_code` ya existente aunque no tuviera ningún miembro —
  dejaba un equipo reseteado (o huérfano) igual de atascado que uno con
  dueño; ya había 2 así en el remoto antes de este cambio.
- `admin_approve_device_member`, `admin_unbind_user_device`,
  `admin_toggle_user_status`, `get_admin_dashboard_full_data` — ya existían en
  el esquema base **sin ninguna comprobación de quién las llamaba** y con
  `EXECUTE` concedido a `anon`. Corregido en la misma migración.
- El contrato TypeScript para el frontend vive en `Web/backend/adminApi.ts`
  (funciones tipadas) y `Web/backend/types.ts` (formas de datos); no hace
  falta leer SQL para consumirlo.

### Columnas añadidas por este proyecto

| Tabla | Columna | Para qué |
| :--- | :--- | :--- |
| `soil_measurements` | `phenological_stage` | Las 4 etapas del ciclo. TerraSense no es sólo de siembra |
| `soil_measurements` | `radius_m` | Radio del círculo en el mapa (20 m por defecto) |
| `soil_measurements` | `gps_accuracy_m` | Precisión del punto; la app avisa si supera 15 m |
| `soil_measurements` | `geom` | Punto PostGIS **generado**, con índice GiST |
| `soil_measurements` | `engine_version`, `crop_catalog_version` | Trazabilidad probatoria |
| `soil_measurements` | `client_uuid` | Idempotencia de la cola offline |
| `predial_quadrants` | `phenological_stage`, `radius_m`, `geom` | Íd. |
| `devices` | `device_code` con `DEFAULT` y `CHECK` | 15 dígitos aleatorios |

> [!NOTE]
> `geom` es **columna generada**: se calcula sola a partir de `latitude` y `longitude`. No intentes
> escribirla; Postgres lo rechaza.

---

## 3. Seguridad: RLS

> [!CAUTION]
> ### Hallazgo crítico corregido el 27-08-2026
>
> Las 7 tablas tenían **una única política idéntica**: `FOR ALL TO public USING (true)`. RLS estaba
> activo pero completamente permisivo.
>
> La clave anónima viaja embebida en cada binario de la app y **es pública por diseño**. En la
> práctica cualquiera podía leer, modificar y borrar todas las filas de todas las tablas, incluida
> `profiles` con nombres, correos y teléfonos.
>
> Corregido en `20260827140000_cerrar_rls_abierto.sql`: 7 políticas permisivas eliminadas y **20
> políticas acotadas** por operación, limitadas al rol `authenticated`. Verificado tras aplicar:
> 0 políticas expuestas al rol `public`, 0 políticas `ALL USING(true)`.

### Modelo de acceso

Todo cuelga de la pertenencia a un equipo:

```text
¿Puede el usuario ver esta medición?
   └─► user_id = auth.uid()                 ──► sí
   └─► has_device_access(device_id)         ──► sí
   └─► en cualquier otro caso               ──► no
```

`has_device_access()` es **`SECURITY DEFINER`** a propósito: sin eso, la política de `devices`
consultaría `device_members`, cuya política consultaría `devices`, y Postgres entra en recursión
infinita. Es el error clásico al replicar este patrón.

> [!IMPORTANT]
> Si «faltan datos» en la app o la consola, la causa casi siempre es que **no existe la fila en
> `device_members`**, no que la política esté mal. Nunca relajes una política para hacer aparecer
> datos: revisa primero la membresía.

---

## 4. Funciones y triggers

| Objeto | Qué hace |
| :--- | :--- |
| `handle_new_user()` | Crea el perfil al registrarse un usuario en `auth.users` |
| `generate_device_code()` | 15 dígitos aleatorios con reintento ante colisión. Es el `DEFAULT` de `devices.device_code` |
| `has_device_access(uuid)` | Membresía autorizada. Base de casi toda la RLS |
| `link_device_creator()` | Al dar de alta un equipo, inserta la membresía del creador |
| `join_device_by_code(text)` | Vincula a un operador por código sin exponer `devices` a búsquedas |
| `is_support_staff()` | Puerta de entrada del panel de soporte. Base de toda la RLS/RPC `admin_*` |
| `log_device_status_change()` | Trigger sobre `devices`: cada cambio de batería/`last_seen_at` queda en `device_status_log` |

### Por qué el Device ID lo genera la base

La app tiene `generateDeviceId()`, pero **sólo para previsualizar**. El valor real lo pone Postgres
por `DEFAULT`, de modo que la unicidad la garantiza el índice `UNIQUE` y no un acuerdo de buena fe
entre plataformas.

Son **15 dígitos aleatorios**, no un *hash* de UUID. Un *hash* de 10 dígitos colisiona por la
paradoja del cumpleaños a partir de unos pocos miles de registros.

### Por qué `join_device_by_code` es un RPC y no una consulta

La política `SELECT` de `devices` sólo deja ver los equipos de los que ya se es miembro. Un operador
con el código de un tercero no puede localizarlo desde el cliente — que es justo la situación normal
de una cuadrilla.

Relajar la política habría convertido la tabla en **enumerable**, permitiendo barrer el espacio de
códigos. El RPC valida en el servidor e incluye tres defensas:

1. Formato estricto **antes** de tocar la tabla.
2. **Mensaje de error idéntico** exista o no el equipo, para no filtrar qué códigos son válidos.
3. **Límite de 10 intentos fallidos** por usuario y hora, registrados en `device_join_attempts`.

---

## 5. Edge Functions

| Función | Autenticación | Qué hace |
| :--- | :--- | :--- |
| `device-checkin` | Pública (`--no-verify-jwt`) | Recibe telemetría del equipo, actualiza su estado y genera alerta ante veredicto rojo |
| `send-push-alert` | **Exige JWT** | Despacha por Expo Push las alertas pendientes |

Están **separadas a propósito**: el registro de la alerta no debe depender de que el envío funcione.
Si Expo está caído, la alerta sigue existiendo y aparece en la app al abrirla. `send-push-alert`
sólo marca `is_read` si algo llegó a salir, para que un fallo no silencie la alerta para siempre.

`device-checkin` autentica por `device_code`, que **no es un secreto fuerte**. Por eso exige que el
equipo exista y esté activo, y devuelve el mismo mensaje genérico tanto si el código no existe como
si está inactivo.

```bash
# Comprobación rápida del endpoint público
curl -X POST https://bjmhjatykqccksddgtmo.supabase.co/functions/v1/device-checkin \
  -H "Content-Type: application/json" \
  -d '{"device_code":"481239057416628"}'
# → 404 {"success":false,"message":"Equipo no reconocido"}
```

---

## 6. Migraciones

```text
20260825000000_remote_baseline.sql          Marcador: migración ya aplicada antes de vincular
20260825020000_remote_baseline.sql          Marcador
20260827100000_etapa_fenologica_geo_...     Columnas nuevas, PostGIS e índices
20260827120000_asegurar_rls_defensivo.sql   Comprueba y sólo actúa si falta RLS
20260827130000_auditoria_politicas_rls.sql  Sólo NOTICE: deja constancia del estado previo
20260827140000_cerrar_rls_abierto.sql       ⚠️ Corrección crítica de seguridad
20260827150000_verificacion_rls_final.sql   Sólo NOTICE: constancia del estado posterior
20260827160000_rpc_vincular_equipo_...      RPC de vinculación por código
```

> [!WARNING]
> Los **marcadores de línea base** están vacíos a propósito: corresponden a migraciones aplicadas en
> el proyecto antes de vincular este repositorio, y existen sólo para alinear el historial. **Si
> algún día reconstruyes la base desde cero, no recrearán el esquema.** Exporta antes con
> `supabase db dump`.

Las migraciones `130000` y `150000` **no contienen DDL**: sólo emiten `RAISE NOTICE`. Fueron la única
forma de auditar las políticas sin Docker ni `psql`, y se conservan como constancia.

---

## 7. Plantillas de correo

`templates/recovery.html` y `templates/confirmation.html` están escritas con la marca TerraSense,
pero **desactivadas en `config.toml`**:

```
400: Email template modification is not available for free tier projects
     using the default email provider.
```

Dejarlas activas hace fallar **cualquier** `supabase config push` posterior. Para usarlas:

1. Configurar SMTP propio (Resend o SendGrid tienen plan gratuito) en *Authentication → SMTP
   Settings* y descomentar el bloque de `config.toml`; **o**
2. Pegar el HTML a mano en *Authentication → Email Templates*.

Recomendada la primera: el remitente por defecto de Supabase tiene límite de envíos y baja
entregabilidad, lo que en producción significa correos de recuperación que no le llegan al agricultor.

---

## 8. Comandos habituales

```bash
supabase login
supabase link --project-ref bjmhjatykqccksddgtmo

supabase db push                              # aplica migraciones pendientes
supabase migration list                       # compara historial local y remoto
supabase migration new <nombre>               # crea una migración vacía

supabase functions deploy device-checkin --no-verify-jwt
supabase functions deploy send-push-alert

supabase gen types typescript --linked        # tipos desde el esquema real
supabase config push                          # configuración de auth y storage
```

> [!TIP]
> Tras cambiar el esquema, regenera los tipos y **actualízalos en los dos clientes**:
> `App/src/types/app.ts` y `Web/src/types.ts`.

---

## 9. Diagnóstico sin Docker

`supabase db dump` y `db pull` **exigen Docker**. Si no lo tienes, hay dos vías que sí funcionan
porque el CLI habla directo con la base:

```bash
# Esquema completo: nombres de tabla, columnas y tipos
supabase gen types typescript --linked > /tmp/schema.ts

# Tamaños, número de filas y uso de índices
supabase inspect db table-stats --linked
supabase inspect db index-stats --linked
```

Y para inspeccionar cualquier cosa que las anteriores no cubran, una migración que sólo emita
`RAISE NOTICE` —como `20260827130000`— imprime el resultado por consola al hacer `db push` sin
modificar nada.

---

## 10. Pendientes conocidos

- **SMTP propio**, para activar las plantillas de correo (§7).
- **Firmware físico y publicación OTA**: el catálogo `firmware_releases`, su RPC de consulta y la
  vista web existen; falta publicar un binario validado contra hardware real.
- **Retención activa**: `purge_expired_operational_data()` elimina intentos de vinculación a los 30
  días y auditorías de membresía a los dos años. El respaldo diario la ejecuta después del *dump*,
  conservando las mediciones por su valor agronómico y probatorio.
- **Copias de seguridad**: el flujo diario guarda un respaldo lógico privado durante siete días.
  El plan gratuito sigue sin ofrecer *Point-in-Time Recovery*.

El estado completo está en [`MIGRACION_AKURA.md`](../MIGRACION_AKURA.md).

---

## 11. 🛠️ Manual de Instalación de Herramientas

### 11.1. Supabase CLI

<details>
<summary><b>Windows</b></summary>

```powershell
winget install Supabase.CLI
# o con Scoop:
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```
</details>

<details>
<summary><b>macOS</b></summary>

```bash
brew install supabase/tap/supabase
```
</details>

<details>
<summary><b>Linux</b></summary>

```bash
# Descargar el .deb de la última versión publicada en:
# https://github.com/supabase/cli/releases
sudo dpkg -i supabase_*_linux_amd64.deb
```
</details>

```bash
supabase --version    # 2.90 o superior
```

> [!WARNING]
> **No instales el CLI con `npm install -g supabase`.** No está soportado y da errores confusos al
> desplegar funciones.

### 11.2. Docker Desktop — opcional

Sólo hace falta para desarrollo **local** (`supabase start`, `db dump`, `db pull`). Todo lo de este
proyecto se hizo contra el proyecto remoto **sin Docker**.

```powershell
winget install Docker.DockerDesktop     # Windows
```
```bash
brew install --cask docker              # macOS
```

Si lo instalas en Windows, **debe estar en ejecución** antes de usar el CLI: no basta con tenerlo
instalado.

### 11.3. Cliente PostgreSQL — opcional pero recomendable

`psql` permite inspeccionar sin las vueltas de §9.

```powershell
winget install PostgreSQL.psqlODBC      # Windows: o instalar PostgreSQL completo
```
```bash
brew install libpq && brew link --force libpq    # macOS
sudo apt-get install -y postgresql-client        # Linux
```

Cadena de conexión: panel de Supabase → *Project Settings* → *Database* → *Connection string*.

### 11.4. Deno — opcional

Para editar Edge Functions con autocompletado. El despliegue **no lo necesita**: el CLI empaqueta
por su cuenta.

```powershell
winget install DenoLand.Deno    # Windows
```
```bash
brew install deno               # macOS
curl -fsSL https://deno.land/install.sh | sh    # Linux
```

En VS Code, extensión **Deno** activada sólo para `supabase/functions/`.

### 11.5. Puesta en marcha

```bash
git clone https://github.com/Alvarinhoooo7/TerraSence.git
cd TerraSence

supabase login                                   # abre el navegador
supabase link --project-ref bjmhjatykqccksddgtmo
supabase migration list                          # local y remoto deben coincidir
```

### 11.6. Verificación de que todo quedó bien

```bash
supabase migration list                 # sin huecos entre Local y Remote
supabase inspect db table-stats --linked   # deben aparecer las 8 tablas

curl -s -o /dev/null -w "%{http_code}\n" \
  https://bjmhjatykqccksddgtmo.supabase.co/functions/v1/device-checkin
# → 405 (método no permitido): la función está viva
```

### 11.7. Resumen de versiones

| Herramienta | Versión | ¿Obligatoria? |
| :--- | :--- | :--- |
| Supabase CLI | 2.90+ | Sí |
| Git | 2.40+ | Sí |
| Docker Desktop | última | No — sólo desarrollo local |
| `psql` | 15+ | No — recomendable |
| Deno | 1.40+ | No — sólo para editar funciones |

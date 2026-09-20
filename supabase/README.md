# 🗄️ TerraSense · Backend Supabase

<a id="persistencia-ambiental-y-bateria"></a>
## Persistencia ambiental y batería — verificada el 11-09-2026

El esquema conserva diez variables locales: `vwc_percent`, `ec_us_cm`, `soil_temp_c`, `nitrogen`, `phosphorus`, `potassium`, `ph`, `canopy_temp_c`, `canopy_humidity_pct` y `air_pressure_hpa`. N/P/K son registros informativos sin validación química. La batería se guarda aparte en `battery_percent` y no constituye una undécima variable agronómica del Grid.

La migración [20260911120000_support_environment_readings.sql](migrations/20260911120000_support_environment_readings.sql) quedó **aplicada al proyecto vinculado el 11-09-2026**. Añade `battery_percent` nullable con restricción de 0–100 y amplía `admin_get_device_detail` para devolver ambiente, batería y diagnóstico. Conserva `is_support_staff()`, los permisos del RPC y los roles; no borra registros. La migración ambiental `20260906140000_bme280_presion_y_sin_defaults.sql` ya estaba aplicada.

Los campos ambientales y de batería admiten `NULL`, sin defaults inventados. El ambiente se obtiene del BME280, nunca de la API del pronóstico. `diagnosis.localSource` identifica el nuevo flujo; los registros históricos sin origen verificado no se reclasifican automáticamente. `diagnosis` conserva el pronóstico y la recomendación disponibles al guardar, la fuente y la respuesta BLE en captura. `measured_at` conserva la recepción en el celular incluso si el envío ocurre después. `devices.last_seen_at` es un reporte remoto histórico, no una conexión BLE en vivo.

La proyección móvil de consulta incluye ambiente, batería y diagnóstico, por lo que se mantienen en historial, caché y cola local. El RPC permite exportarlos en el CSV de soporte. La base y el historial conservan las cuatro fases y admiten lecturas sin GPS; las coordenadas se guardan y se consultan como números, sin geometría asociada.

`schema.sql` refleja la nueva columna, restricción y respuesta del RPC. Los tipos de `Web/backend/database.types.ts` se regeneraron desde el esquema remoto y los tipos de dominio de App se alinearon. El tipo de entrada de `device-checkin` admite ambiente, batería y diagnóstico sin cambiar su comportamiento ni desplegar Edge Functions; la ruta normal de App sigue siendo BLE → teléfono → PostgREST.

### Evidencia y verificación repetible

Antes del despliegue se probó la migración en una transacción con rollback. El dry-run mostró una sola migración pendiente; después de aplicarla se verificaron las columnas y permisos con:

```powershell
supabase db query --linked --file supabase/verify_environment_migration.sql
```

[El verificador](verify_environment_migration.sql) no escribe datos: comprueba diez parámetros más batería, nulabilidad, ausencia de defaults ambientales y permisos del RPC. La consulta del historial remoto del 11-09-2026 confirmó también las versiones que el [registro del 05-09-2026](APP_COMPATIBILITY_20260905.md) describía como ausentes o pendientes; aquella observación es histórica y ya no representa el estado actual.

Esta verificación del esquema no acredita ensayos físicos, publicación web/móvil ni una auditoría general de producción. Siguen pendientes SMTP/dominio, recuperación de respaldos, validación completa de RLS y sincronización en teléfono, trazabilidad de calibración y comprobaciones operativas de la sección 10.

---

Base de datos PostgreSQL con políticas de seguridad a nivel de fila y Edge Functions en
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
- [9. Docker y diagnóstico sin Docker](#9-docker-y-diagnóstico-sin-docker)
- [10. Pendientes conocidos](#10-pendientes-conocidos-y-tareas-operativas)
- [11. 🛠️ Manual de instalación de herramientas](#manual-instalacion-herramientas)

---

## Disponibilidad y pausa por inactividad

El [workflow de disponibilidad](../.github/workflows/supabase-health.yml) ejecuta el
[comprobador](scripts/check-health.mjs) diariamente a las 12:23 UTC y permite ejecución
manual. Verifica Auth y consulta `firmware_releases` por PostgREST, con un máximo de una
fila y sin imprimir su contenido. Usa la clave pública y respeta las políticas de
seguridad a nivel de fila (RLS): una respuesta vacía es válida para el rol anónimo.
No crea usuarios ni mediciones, no requiere migraciones y funciona con la app cerrada.
Cada servicio tiene tres intentos y un límite de veinte segundos por solicitud;
si cualquiera falla, la ejecución termina con error.

**Activación pendiente:** tener estos archivos localmente no activa el cron remoto.

1. Publicar el workflow y el script en la rama predeterminada de GitHub.
2. En Settings → Secrets and variables → Actions, crear la variable `SUPABASE_URL`
   con la URL del proyecto indicada abajo y el secreto `SUPABASE_ANON_KEY` con la
   clave pública `anon` o `publishable`. No usar `service_role` ni una clave `secret`.
3. En Actions → Disponibilidad de Supabase → Run workflow, ejecutar y comprobar
   que aparezcan `Auth: OK` y `Base de datos: OK`.
4. Habilitar las notificaciones de fallos de Actions en la cuenta responsable y
   comprobar que aparezcan ejecuciones programadas. Un cron que deja de ejecutarse
   no genera por sí solo una alerta de fallo.

Comprobación local con Node 24, desde la raíz, usando las variables públicas de App:

```bash
node --env-file=App/.env supabase/scripts/check-health.mjs
node --test supabase/scripts/check-health.test.mjs
```

Supabase puede pausar proyectos gratuitos con poca actividad durante siete días.
Esta consulta periódica genera actividad y comprueba disponibilidad, pero Supabase
no garantiza que una frecuencia de pings evite la pausa; la garantía corresponde al
[plan Pro](https://supabase.com/docs/guides/deployment/going-into-prod).
Si el proyecto ya está pausado, hay que restaurarlo desde el panel.
[GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
puede retrasar u omitir ejecuciones programadas y, en repositorios públicos, las
desactiva tras sesenta días sin actividad del repositorio. Este mecanismo requiere
supervisión y no constituye un respaldo de la base de datos.

## 1. Proyecto y región

| Campo | Valor |
| :--- | :--- |
| Referencia | `bjmhjatykqccksddgtmo` |
| URL | `https://bjmhjatykqccksddgtmo.supabase.co` |
| Región | **South America (São Paulo)** |
| Extensiones | `uuid-ossp`, `pgcrypto` |

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
                │                    └──1:N──► device_status_log (histórico de batería/conexión, por trigger)

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
  mediciones/alertas de ese equipo; NO toca `device_code` (grabado
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
| `soil_measurements` | `gps_accuracy_m` | Precisión del punto; la app avisa si supera 15 m |
| `soil_measurements` | `engine_version`, `crop_catalog_version` | Trazabilidad probatoria |
| `soil_measurements` | `client_uuid` | Idempotencia de la cola offline |
| `devices` | `device_code` con `DEFAULT` y `CHECK` | 15 dígitos aleatorios |

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
20260827100000_etapa_fenologica_geo_...     Columnas nuevas, PostGIS e índices (revertido después)
20260827120000_asegurar_rls_defensivo.sql   Comprueba y sólo actúa si falta RLS
20260827130000_auditoria_politicas_rls.sql  Sólo NOTICE: deja constancia del estado previo
20260827140000_cerrar_rls_abierto.sql       ⚠️ Corrección crítica de seguridad
20260827150000_verificacion_rls_final.sql   Sólo NOTICE: constancia del estado posterior
20260827160000_rpc_vincular_equipo_...      RPC de vinculación por código
...
20260920140000_retirar_mapa_y_postgis.sql   Retira geometría, cuadrantes, perímetros y PostGIS
```

> [!WARNING]
> Los **marcadores de línea base** están vacíos a propósito: corresponden a migraciones aplicadas en
> el proyecto antes de vincular este repositorio, y existen sólo para alinear el historial. **Si
> algún día reconstruyes la base desde cero, no recrearán el esquema.** Exporta antes con
> `supabase db dump`.

Las migraciones `130000` y `150000` **no contienen DDL**: sólo emiten `RAISE NOTICE`. Fueron la única
forma de auditar las políticas sin Docker ni `psql`, y se conservan como constancia.

### 6.1. Desfase entre el historial local y el remoto

`supabase migration list --linked`, ejecutado el **6 de septiembre de 2026**, devuelve tres
discrepancias. El resto de versiones coincide:

| Versión | Local | Remoto | Qué implica |
| :--- | :---: | :---: | :--- |
| `20260902180000` | ausente | **aplicada** | Migración `*.local.sql`, excluida de git a propósito |
| `20260902210000` | ausente | **aplicada** | Migración `*.local.sql`, excluida de git a propósito |
| `20260904120000` | presente | **pendiente** | Escrita, sin desplegar. Ver §10.1 |

**Las dos ausentes no son un fallo: están fuera del repositorio a propósito.** El 6 de septiembre se
recuperó su contenido real desde `supabase_migrations.schema_migrations`, la tabla donde Supabase
guarda el SQL de cada migración aplicada. Se leyó **sin escribir nada en remoto**:

```bash
supabase db dump --linked --data-only --schema supabase_migrations -f <fuera-del-repo>.sql
```

| Versión | Nombre en remoto | Qué contiene |
| :--- | :--- | :--- |
| `20260902180000` | `alta_usuario_alvaro.local` | Alta directa de la cuenta de soporte en `auth.users` + `auth.identities` + `admin_support_users` |
| `20260902210000` | `dispositivo_demo.local` | *Fixture* desechable: usuario y equipo de prueba con histórico de batería y una medición |

Ninguna de las dos contiene DDL: son bloques `DO $$ … $$` que insertan **datos**. `.gitignore:71`
excluye `supabase/migrations/*.local.sql`, y el encabezado de ambas lo dice explícitamente —
*"sólo local, NUNCA se sube a git"*—: la primera porque lleva una contraseña en texto plano, la
segunda porque es data de un solo uso.

> [!NOTE]
> **El desfase está explicado y no hay que cerrarlo.** No falta esquema —lo confirma
> [`schema.sql`](schema.sql), §10.2— y volver a añadir esos archivos al repositorio sería
> exactamente lo que su patrón `*.local.sql` existe para impedir. `supabase db pull` tampoco los
> habría recuperado: compara esquemas, y aquí no hay diferencia de esquema que capturar.
> La hipótesis anterior —que eran bloques de auditoría `RAISE NOTICE`— **era incorrecta**.

Lo que sí queda abierto son dos consecuencias de haberlas aplicado, ambas en §10.5: la contraseña en
texto plano que quedó guardada en el historial remoto, y el equipo de prueba que sigue en producción.

La primera constancia de este desfase, junto con el contrato de la app que depende de él, está en
[`APP_COMPATIBILITY_20260905.md`](APP_COMPATIBILITY_20260905.md).

---

## 7. Plantillas de correo

Las plantillas de [confirmación](templates/confirmation.html) y
[recuperación](templates/recovery.html) muestran `{{ .Token }}` sin enlaces de acción.
Supabase genera y valida los códigos; no se crean tablas ni funciones propias.
[config.toml](config.toml), sección `auth.email`, define longitud, vencimiento y
espera entre envíos. El cambio está preparado localmente; **su aplicación remota
no está verificada**. El CLI está vinculado al proyecto, pero el proxy del entorno
rechaza la conexión a la API de administración.

La app y la web verifican con `verifyOtp`: `type: 'email'` para confirmar el registro
y `type: 'recovery'` para recuperar. Esta última emite `PASSWORD_RECOVERY` y muestra
el formulario de nueva contraseña antes de entrar. Reenviar usa `resend` de tipo
`signup` o `resetPasswordForEmail`, respectivamente. El vencimiento y los límites
efectivos los impone Supabase, no el contador del cliente.

Para activar, publicar primero la app y la web compatibles. Después, desde una terminal
con red y Python 3.11+, usar [configurar_codigos.py](scripts/configurar_codigos.py):

```powershell
python supabase/scripts/configurar_codigos.py
python supabase/scripts/configurar_codigos.py --apply
```

El script requiere `SUPABASE_ACCESS_TOKEN` en el entorno, o el archivo de token del CLI
si contiene un token personal legible. Una sesión del CLI almacenada en el gestor de
credenciales del sistema no basta para este script. No usar claves `anon` ni `service_role`.
La primera ejecución solo compara; la segunda aplica un PATCH limitado a plantillas,
asuntos, confirmación obligatoria y parámetros de códigos, y vuelve a leer para verificar.
No envía contraseñas SMTP ni reemplaza la configuración completa. Se detiene si hay
un hook de correo activo o no se detecta SMTP propio. **No ejecutar `supabase config push`
para este cambio**: la variable local de contraseña SMTP puede estar ausente.

Verificar en una cuenta de prueba: registro, código incorrecto, código vencido, reenvío,
código ya usado, recuperación y entrada con la contraseña nueva, tanto en app como en web.
Conservar temporalmente las URLs autorizadas para correos antiguos. Cambiar a códigos
no valida por sí solo entregabilidad ni configuración SMTP.

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

## 9. Docker y diagnóstico sin Docker

> [!NOTE]
> **Docker Desktop quedó instalado y operativo el 6 de septiembre de 2026** en el equipo de
> desarrollo: versión 4.89.0, motor 29.7.2, sobre WSL 2.7.13. Con eso se desbloquearon las dos
> tareas que antes no tenían alternativa: la exportación del esquema (§10.2, ya hecha) y la lectura
> del historial remoto que explicó el desfase de §6.1.
>
> Instalación reproducible, en este orden (ambos pasos piden UAC):
>
> ```powershell
> winget install --id Docker.DockerDesktop -e --accept-package-agreements --accept-source-agreements
> wsl --install --no-distribution        # Docker Desktop no arranca sin el backend WSL2
> ```
>
> Sin el segundo paso el motor muere al arrancar con
> `engine linux/wsl failed to start: checking WSL version: wsl is not installed`. No hace falta
> cuenta de Docker Hub: las imágenes que usa el CLI de Supabase son públicas. El `docker` de línea
> de comandos vive en `C:\Program Files\Docker\Docker\resources\bin`, que no entra en el `PATH`
> de las sesiones ya abiertas.

Aun así conviene saber qué **no** necesita Docker, porque el CLI habla directo con la base y esos
comandos siguen siendo la vía más rápida de diagnóstico:

```bash
# Historial de migraciones: local frente a remoto
supabase migration list --linked
```

Y para el esquema:

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

## 10. Pendientes conocidos y tareas operativas

> Estas tareas requieren credenciales del proyecto Supabase. Se listan aquí, y no en el plan de
> validación, porque es aquí donde están los comandos para ejecutarlas. **Estado al 6 de septiembre
> de 2026:** §10.2 hecha a medias (esquema exportado, restauración sin ensayar); el resto sin hacer.

### 10.1. Aplicar y probar la migración de mediciones sin GPS

`migrations/20260904120000_mediciones_sin_gps_idempotencia.sql` **está escrita pero no desplegada**. Hace dos cosas: admite `latitude`/`longitude` nulas —para que una medición sin señal GPS se guarde igual— y crea un índice único **no parcial** sobre `client_uuid`, necesario porque PostgREST no puede inferir un índice parcial para `ON CONFLICT(client_uuid)`.

**No es una mejora pendiente: son dos fallos activos contra producción.** Verificado el 5 de septiembre de 2026 contra el esquema remoto:

| Fallo | Causa en remoto | Dónde revienta | Desde |
| :--- | :--- | :--- | :--- |
| Upsert idempotente inoperante (`42P10`) | Sólo existe `idx_soil_measurements_client_uuid`, único pero **parcial** (`WHERE client_uuid IS NOT NULL`) | `App/src/services/measurementsService.ts` — `.upsert(row, { onConflict: 'client_uuid' })` | commit `7c65672`, 27-ago-2026 |
| Medición sin GPS rechazada (`23502`) | `latitude` y `longitude` siguen siendo `NOT NULL` | `App/src/screens/MeasureScreen.tsx` — `coords?.latitude ?? null` | commit `9bd4a79`, 04-sep-2026 |

El segundo es especialmente sensible: guardar una lectura sin cobertura GPS es justo lo que el Informe 1 promete, y hoy la base la rechaza.

Ambos fallos **siguen activos el 6 de septiembre de 2026**, verificados contra
[`schema.sql`](schema.sql) recién exportado del remoto: `latitude` y `longitude` siguen declaradas
`NOT NULL` en `soil_measurements`, el único índice sobre `client_uuid` sigue siendo
`idx_soil_measurements_client_uuid … WHERE (client_uuid IS NOT NULL)`, y la restricción
`soil_measurements_coordinates_pair` no existe en remoto.

Volver `latitude`/`longitude` nulas ya no arrastra ninguna columna derivada: la geometría generada
se eliminó junto con el mapa.

**Orden correcto:**

1. ~~Arrancar Docker y recuperar las dos migraciones remotas ausentes~~ — **resuelto el 6-sep**.
   Docker está operativo (§9) y el desfase quedó explicado: las dos ausentes son `*.local.sql`
   intencionales, sin DDL (§6.1). No hay historial que recuperar antes de empujar.
2. **Comprobar qué arrastra el `push`.** `db push` no sabe aplicar una sola migración: aplica todas
   las locales que falten en el historial remoto. El 6-sep el árbol de trabajo tenía además
   `20260906120000_dos_roles_y_aprobacion.sql` y `20260906130000_qr_temporal_y_solicitudes.sql`, en
   desarrollo; un `db push` se las habría llevado a producción junto con ésta. Si hay migraciones a
   medio escribir, sácalas de `supabase/migrations/` mientras dura el `push` y devuélvelas después.
3. Aplicar y verificar.

```bash
supabase migration list --linked          # 0. confirmar qué está pendiente ahora mismo
supabase db push --linked --dry-run       # 1. imprime lo que aplicaría, sin aplicarlo
supabase db push --linked                 # 2. aplicar
supabase inspect db table-stats --linked  # 3. contrastar con las tablas descritas arriba
```

> [!WARNING]
> **No hay proyecto de *staging*.** `--linked` apunta a `terrasense`, que es producción. El ensayo
> previo en un proyecto desechable sigue sin hacerse; mientras no exista, cada `db push` es un
> cambio en vivo.

El `CREATE UNIQUE INDEX` sobre `client_uuid` no puede chocar con datos históricos: el índice parcial
actual ya impide duplicados no nulos, y en un índice único normal los `NULL` son distintos entre sí.
El `CHECK` se crea `NOT VALID`, así que tampoco escanea las filas existentes.

Después de aplicarla hay que **auditar los registros históricos** y validar la restricción por separado (se crea `NOT VALID` a propósito), y comprobar que el upsert de la app resuelve contra el índice nuevo y no contra el parcial antiguo. Conviene además regenerar `Web/backend/database.types.ts` (`supabase gen types typescript --linked`), porque hoy declara `latitude: number` no nulo y quedará desactualizado.

### 10.2. Esquema reproducible desde cero

Las migraciones baseline (`20260825000000`, `20260825020000`) son **marcadores** en el repositorio:
no reconstruyen el esquema original.

**Exportado el 6 de septiembre de 2026** a [`schema.sql`](schema.sql) —2 425 líneas, 96 objetos
`CREATE`, solo esquema `public`, sin datos ni secretos:

```bash
supabase db dump --linked -f supabase/schema.sql --schema public
```

Con eso ya existe un esquema versionado. **Falta todavía la otra mitad**: restaurarlo en un proyecto
limpio y comprobar que reconstruye la base. Hasta ese ensayo no puede afirmarse que el backend sea
reproducible.

### 10.3. Ensayo de recuperación del respaldo

Existe un *workflow* que genera un respaldo lógico privado con retención de siete días. **Que el workflow exista no prueba que se ejecute correctamente ni que el respaldo sea restaurable.** Falta restaurar un *dump* en un proyecto desechable y verificar tablas, políticas RLS, funciones y datos. El plan gratuito no ofrece *Point-in-Time Recovery*.

### 10.4. Estado del despliegue remoto

No se ha auditado. Lo verificado es que el código local compila y pasa sus pruebas; **producción no se revisó**: ni configuración SMTP efectiva, ni políticas RLS activas, ni límites de tasa, ni el estado real de las Edge Functions.

Lo comprobado contra remoto, el 5 y el 6 de septiembre de 2026, es **la existencia de los objetos que el código invoca**, y desde el 6-sep el esquema `public` completo está exportado en [`schema.sql`](schema.sql) (§10.2): 16 RPCs, 8 tablas y las 18 columnas de `soil_measurements` que consulta la app. Eso confirma que las llamadas resuelven; **no** dice nada sobre si las políticas RLS se comportan como se documenta, que sigue siendo una auditoría pendiente y distinta.

### 10.5. Otros pendientes


- ⚠️ **Contraseña en texto plano en el historial remoto.** La migración `20260902180000`
  (`alta_usuario_alvaro.local`, §6.1) creó la cuenta de soporte con la contraseña escrita literal en
  el SQL. Supabase guarda el cuerpo de cada migración en `supabase_migrations.schema_migrations`, así
  que esa contraseña **sigue legible en producción** para cualquiera con acceso a la base: se leyó
  tal cual el 6-sep-2026 durante el diagnóstico de §6.1. Dos acciones, en este orden: cambiar la
  contraseña de esa cuenta, y sólo después limpiar la columna `statements` de esa fila. El patrón a
  evitar en adelante es crear cuentas desde SQL con la contraseña incrustada, aunque el archivo esté
  en `.gitignore`: el archivo no se sube, pero su contenido viaja igual al historial remoto.
- ⚠️ **Datos de prueba en producción.** La migración `20260902210000` (`dispositivo_demo.local`,
  §6.1) sembró un usuario `demo.agricultor@terrasense.cl` y un equipo `🧪 Sonda DEMO` con histórico
  de batería y una medición en la Región de O'Higgins. Su propio encabezado pide borrarlo al terminar
  las pruebas. **Comprobado el 6-sep-2026: sigue en producción** —`device_id`
  `fd3668be-f527-4766-8d50-f6eb8f938d05`, `device_code` `465719423880094`, `is_active = true`— con
  4 filas en `device_status_log`, 1 en `device_members` y 1 en `soil_measurements`. Y ahí está el
  problema de fondo: esa **es la única fila de `soil_measurements` de toda la base**. De 3 equipos
  registrados, uno es este. Cualquier cifra de uso que se cite hoy está midiendo el *fixture*, no el
  producto. Eliminarlo en cascada por su `device_id` cuando ya no haga falta para probar el panel.
- ⚠️ **Endurecimiento de Auth, pendiente en el panel.** La revisión de seguridad del 9-sep-2026
  dejó los advisors sin hallazgos de nivel ERROR, pero siguen abiertos dos avisos que **no se
  aplicaron a propósito**: `auth_leaked_password_protection` y `auth_insufficient_mfa_options`. La
  vía por CLI sería `supabase config push`, y ahí está el problema: empuja la sección `[auth]`
  completa de `config.toml`, donde `pass = "env(GMAIL_APP_PASSWORD)"` apunta a una variable que no
  está definida en el entorno — le habría borrado la contraseña SMTP al proyecto (§7). De paso
  arrastraría `minimum_password_length = 6` al remoto. Son dos interruptores en el panel:
    - Authentication → Sign In / Up → Password security → *Prevent use of leaked passwords*
    - Authentication → Multi-Factor Authentication → habilitar TOTP

  Si se prefiere el CLI, antes hay que exportar `GMAIL_APP_PASSWORD` con el valor real y comprobar
  que el resto de `[auth]` en `config.toml` coincide con lo que hay en producción.
- **Ensayo de restauración del esquema exportado** (§10.2): `schema.sql` ya existe, falta probarlo
  en un proyecto limpio.
- **SMTP propio**, para activar las plantillas de correo (§7).
- **Firmware físico y publicación OTA**: el catálogo `firmware_releases`, su RPC de consulta y la
  vista web existen; falta publicar un binario validado contra hardware real.
- **Retención activa**: `purge_expired_operational_data()` elimina intentos de vinculación a los 30
  días y auditorías de membresía a los dos años. El respaldo diario la ejecuta después del *dump*,
  conservando las mediciones por su valor agronómico y probatorio.
- **Copias de seguridad**: existe un *workflow* que genera un respaldo lógico privado con retención de siete días. **Que el workflow exista no prueba que se ejecute correctamente ni que el respaldo sea restaurable**: falta un ensayo de recuperación documentado.
  El plan gratuito sigue sin ofrecer *Point-in-Time Recovery*.

*(El documento `MIGRACION_AKURA.md` referenciado aquí **no existe en el repositorio**; el enlace se retira hasta que se agregue o se elimine la referencia.)*

---

<a id="manual-instalacion-herramientas"></a>
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

### 11.2. Docker Desktop

Hace falta para desarrollo **local** (`supabase start`) y para `db dump` / `db pull`, que ejecutan
`pg_dump` dentro de un contenedor. **Instalado y verificado en el equipo de desarrollo el 6 de
septiembre de 2026**: Docker Desktop 4.89.0, motor 29.7.2, backend WSL 2.7.13.

En Windows son **dos pasos**, y ambos piden UAC:

```powershell
winget install --id Docker.DockerDesktop -e --accept-package-agreements --accept-source-agreements
wsl --install --no-distribution         # sin el backend WSL2, el motor no arranca
```
```bash
brew install --cask docker              # macOS
```

Detalles que cuestan tiempo si no se saben:

* **No hace falta cuenta de Docker Hub.** Las imágenes que baja el CLI de Supabase son públicas; el
  diálogo de inicio de sesión se puede cerrar.
* Sin `wsl --install`, Docker Desktop arranca y se cierra solo con
  `engine linux/wsl failed to start: checking WSL version: wsl is not installed` en
  `%LOCALAPPDATA%\Docker\log\host\com.docker.backend.exe.log`.
* El ejecutable `docker` queda en `C:\Program Files\Docker\Docker\resources\bin`, que **no**
  entra en el `PATH` de las terminales ya abiertas: hay que abrir una nueva o añadirlo a mano.
* **Debe estar en ejecución** antes de usar el CLI: no basta con tenerlo instalado.

### 11.3. Cliente PostgreSQL — opcional pero recomendable

`psql` permite inspeccionar sin las vueltas de §9.

```powershell
winget install PostgreSQL.PostgreSQL     # Windows: instala psql. NO usar psqlODBC: es un driver ODBC, no el cliente de consola
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
git clone https://github.com/Alvarinhoooo7/TerraSense.git
cd TerraSense

supabase login                                   # abre el navegador
supabase link --project-ref bjmhjatykqccksddgtmo
supabase migration list                          # local y remoto deben coincidir
```

### 11.6. Verificación de que todo quedó bien

```bash
supabase migration list                 # sin huecos entre Local y Remote
supabase inspect db table-stats --linked   # contrastar con las tablas descritas en este README

curl -s -o /dev/null -w "%{http_code}\n" \
  https://bjmhjatykqccksddgtmo.supabase.co/functions/v1/device-checkin
# → 405 (método no permitido): la función está viva
```

### 11.7. Resumen de versiones

| Herramienta | Versión | ¿Obligatoria? |
| :--- | :--- | :--- |
| Supabase CLI | 2.90+ (instalada: 2.101.0) | Sí |
| Git | 2.40+ | Sí |
| Docker Desktop | 4.89.0, motor 29.7.2 | Sí para `db dump` / `db pull` / `supabase start` |
| WSL2 (Windows) | 2.7.13 | Sí — es el backend de Docker Desktop |
| `psql` | 15+ | No — recomendable |
| Deno | 1.40+ | No — sólo para editar funciones |

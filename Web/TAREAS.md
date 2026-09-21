# Auditoría de la consola web — plan de implementación y estado

Registro de la auditoría completa del backoffice (21 de septiembre de 2026): qué se
encontró, qué se corrigió y qué queda pendiente. Describe el estado vigente de este
trabajo, no su historia; cuando todo lo pendiente esté cerrado, este archivo se borra.

Lo que cada casilla significa: `[x]` hecho y verificado con un comando que pasa;
`[ ]` pendiente, con el motivo escrito al lado. Nada se marca hecho por haber
escrito el código.

---

## 0. Cómo se auditó

Se contrastó **lo que la consola pide** contra **lo que la base de datos
entrega**: las 46 funciones y 15 tablas del esquema desplegado frente a las 5
tablas y 11 RPC que invoca `Web/`, y las políticas RLS de cada tabla frente al
rol con el que entra un operador de soporte.

Resultado corto: **ninguna llamada apuntaba a una tabla inexistente**. El
problema era peor y menos visible — varias apuntaban a tablas que existen pero
que RLS deja *siempre vacías* para una cuenta de soporte, y una RPC había dejado
de hacer lo que la interfaz seguía anunciando.

---

## 1. Capa de datos

### 1.1 Lo que se corrigió

- [x] **`admin_push_firmware_update` no envía nada, pero la consola decía que sí.**
      La RPC dejó de encolar alertas push en
      `20260920120000_preparar_equipo_propietario.sql` y su respuesta dice
      literalmente «No se envió un aviso push». La ficha mostraba un botón
      «Enviar aviso» y, al terminar, «Aviso enviado a los usuarios del equipo».
      Ahora la acción se llama *Comprobar disponibilidad*, y el texto de
      resultado es el `message` del propio servidor, no uno escrito en el
      cliente. → `backend/adminApi.ts::checkFirmwareAvailability`,
      `src/components/device/DeviceCommands.tsx`.

- [x] **El aviso de «firmware desactualizado» no podía aparecer jamás.**
      `devices.hardware_version` venía por defecto como `v2.0-nRF52840` y
      `firmware_releases.hardware_target` como `ESP32-WROOM-32`; las dos
      consultas que las contrastan usan igualdad exacta, así que nunca había
      candidata. Corregido en la migración con normalización de datos, valores
      por defecto y un trigger.

- [x] **`check_firmware_update` podía reventar en la app móvil.**
      Hacía `string_to_array('v2.1.0-BLE', '.')::int[]`, que lanza
      «invalid input syntax for type integer: "v2"». Hoy no estalla sólo porque
      el desajuste anterior descarta la fila antes; corregido uno sin el otro,
      la pantalla de actualizaciones habría empezado a dar error. Se reescribió
      con `semver_parts()`, que devuelve NULL en vez de abortar.

- [x] **«Al día» y «sin ninguna versión publicada» eran indistinguibles.**
      `is_up_to_date` valía `true` en ambos casos. `admin_get_device_detail`
      devuelve ahora `firmware_status` con cuatro valores reales
      (`al_dia`, `desactualizado`, `sin_catalogo`, `version_ilegible`).

- [x] **La ficha podía enlazar a `maps?q=null,null`.** `latitude` y `longitude`
      son nulables desde la idempotencia sin GPS, pero `last_location` se
      construía con la última medición *cualquiera*. Ahora la RPC sólo devuelve
      la última medición **con** coordenadas, y añade `gps_accuracy_m`.

- [x] **Fila «Pushy token: No disponible» escrita a mano.** Ninguna RPC devolvía
      ese dato. `profiles.push_token` existe desde `20260920160000`: la RPC
      devuelve ahora `has_push_token` por miembro y la ficha lo marca en la
      fila de quien no recibiría avisos.

- [x] **`FactoryResetResult.quadrants_deleted` era un campo fantasma.**
      `predial_quadrants` se eliminó con el mapa en `20260920140000`. Retirado
      del tipo; el texto del modal dejó de hablar de «cuadrantes» y sí menciona
      lo que de verdad se borra y no se decía: el registro de batería
      (`device_status_log`) y las invitaciones de acceso.

- [x] **`database.types.ts` desactualizado**: le faltaba `profiles.push_token`.
      Añadido junto a las tres funciones nuevas.

### 1.2 Migración añadida

`supabase/migrations/20260921120000_flota_soporte_y_versiones_normalizadas.sql`

| Objeto | Qué resuelve |
| --- | --- |
| `semver_parts(text) → int[]` | Compara versiones por componente y tolera prefijos/sufijos sin reventar. |
| `normalize_device_versions()` + trigger | La Edge Function `device-checkin` escribe lo que reporte el equipo, sin validar formato: el trigger evita que el desajuste vuelva. |
| `check_firmware_update` | Reescrita sobre `semver_parts`. |
| `admin_get_device_detail` | `firmware_status`, `last_location` sólo con GPS, `has_push_token` por miembro. |
| `admin_list_fleet()` | Inventario de flota para soporte, con recuentos y estado de firmware. |
| `admin_list_recent_measurements(limit)` | Últimas mediciones de toda la flota, con el equipo resuelto. Tope de 500. |

### 1.3 Aplicada y verificada el 21-09-2026

- [x] **Validada contra un Postgres real antes de tocar producción.**
      `supabase db reset` no sirve aquí: los dos marcadores de línea base están
      vacíos a propósito y no recrean el esquema (lo advierte
      `supabase/README.md`). Se montó un proyecto local aparte con
      `supabase/schema.sql` como línea base y la migración encima, que es la
      validación que de verdad importa: ¿aplica limpiamente sobre el estado
      real?

- [x] **Comprobado el comportamiento, no sólo que los objetos existan.** Con
      datos de prueba y sesiones simuladas (`SET LOCAL ROLE authenticated` más
      `request.jwt.claims`):

      | Prueba | Resultado |
      | --- | --- |
      | `semver_parts('v2.1.0-BLE')` | `{2,1,0}` |
      | `semver_parts('1.10.0') > semver_parts('1.9.0')` | `true` — la comparación de texto da `false` |
      | El cast antiguo sobre `'v2.1.0-BLE'` | **falla de verdad**: `invalid input syntax for type integer: "v2"` |
      | Equipo insertado con `v2.0-nRF52840` / `v2.1.0-BLE` | el trigger lo deja en `ESP32-WROOM-32` / `2.1.0` |
      | `admin_list_fleet()` con catálogo 2.2.0 y 2.10.0 | elige `2.10.0`, estado `desactualizado` |
      | `last_location` con la última medición **sin** GPS | devuelve la anterior **con** GPS, no un punto nulo |
      | `check_firmware_update()` como agricultor | devuelve `2.10.0` en vez de reventar |
      | Las tres RPC `admin_*` como agricultor | `No tienes acceso al panel de soporte.` |

- [x] **Aplicada al proyecto enlazado** con `supabase db push`.
- [x] **Volcado regenerado**: `supabase db dump --linked -f supabase/schema.sql`.
- [x] **Tipos regenerados**: `supabase gen types typescript --linked`. Se
      descartó la edición a mano en favor del generado.
- [x] **Verificada contra producción** por la API REST: `admin_list_fleet`
      existe y responde; `anon` recibe `permission denied for function`, y
      hasta `service_role` recibe `No tienes acceso al panel de soporte.`
      porque no tiene `auth.uid()`. El perímetro aguanta.

### 1.4 Lo que la migración destapó en producción

El primer intento de aplicarla **falló y revirtió entero**, y el motivo es un
dato real que conviene no perder de vista.

`devices_device_code_15_digits` se añadió `NOT VALID` en `20260827100000`: eso
exime a las filas que ya existían de la comprobación inicial, **pero no a las
actualizaciones**. De los tres equipos en producción, dos arrastran un
`device_code` de 20 dígitos:

| Código | Equipo | hw / fw | Último reporte |
| --- | --- | --- | --- |
| `89540029184719283746` | Fundo San Pedro - Cuartel 4 | `v2.0-nRF52840` / `v2.1.0-BLE` | 25-08-2026 |
| `89540029184719283747` | Huerto Paltos Norte | `v2.0-nRF52840` / `v2.1.0-BLE` | 25-08-2026 |
| `465719423880094` | Parcela de prueba | `ESP32-WROOM-32` / `1.0.0` | 02-09-2026 |

**Esas dos filas están congeladas.** No es cosa de esta migración: *cualquier*
escritura sobre ellas revalida la restricción y falla, incluida la de la Edge
Function `device-checkin`. Su `last_seen_at`, su batería y su firmware no
pueden volver a actualizarse mientras conserven ese código — de ahí que lleven
sin reportar desde el 25 de agosto.

La migración se rehízo para normalizar fila a fila, saltar las que la
restricción bloquea y avisar por código en vez de abortar. Al aplicarse emitió:

> `WARNING: Sin normalizar, 2 equipo(s) con device_code fuera del formato de 15
> dígitos: 89540029184719283746, 89540029184719283747.`

- [ ] **Decidir qué hacer con esos dos equipos.** No lo toqué: cambiar un
      `device_code` es reescribir la identidad del hardware, que es justo lo
      que la restricción protege, y no es una decisión que deba tomar una
      migración. Las dos salidas razonables:
      - **Si son datos de demostración** (lo parecen: códigos consecutivos,
        creados el mismo segundo, sin reportar desde entonces), borrarlos.
      - **Si corresponden a sondas reales**, migrar su código a 15 dígitos
        —coordinado con lo grabado en la NVS del equipo— y después
        `ALTER TABLE public.devices VALIDATE CONSTRAINT devices_device_code_15_digits;`
        para que el problema no pueda repetirse.

- [ ] **Confirmar el efecto del trigger sobre `device-checkin`** en el primer
      check-in real de un equipo con código válido.

---

## 2. Pantallas que RLS condenaba a salir vacías

`devices` está acotada por `ts_devices_select_member` a los equipos donde la
sesión es **miembro**; `soil_measurements`, por `ts_measurements_select`, a las
mediciones propias o de esos mismos equipos. Una cuenta de soporte no es miembro
de ningún equipo: las dos pantallas que leían esas tablas desde el navegador
—«Mis equipos» y «Mis mediciones», 2 de las 5 entradas del menú— estaban
condenadas a mostrar cero filas, y con ellas el contador de batería baja, el
contraste de firmware y el semáforo agronómico.

- [x] `/devices` → **`/fleet`** (`src/pages/FleetPage.tsx`), alimentada por
      `admin_list_fleet()`. Añade recuento de miembros, solicitudes pendientes,
      mediciones y estado de firmware por equipo, más filtros y export CSV.
      `/devices` redirige a `/fleet` para no romper enlaces guardados.
- [x] `/measurements` → **`MeasurementsPage`**, alimentada por
      `admin_list_recent_measurements()`.
- [x] `/validation` **enrutada por fin**: la pantalla existía sin ruta que la
      alcanzara. Es, además, la única tabla que un operador de soporte puede
      leer entera sin ser miembro de nada (`ts_lab_select_auth` autoriza a
      cualquier sesión autenticada).

---

## 3. Defectos de funcionamiento en la interfaz

- [x] **No se podía suspender a un miembro ya aprobado.** El botón estaba
      `disabled` en cuanto `is_authorized` era `true`, aunque
      `admin_set_member_authorized` acepta `false` desde el primer día. Encima
      el botón inerte se pintaba en ámbar, el color de «pendiente», así que
      parecía accionable. Ahora hay *Aprobar*, *Suspender* y *Desvincular* como
      tres acciones distintas, cada una con su confirmación en la propia fila.
- [x] **`code.length < 10`** habilitaba el reseteo de fábrica cuando el código
      tiene 15 dígitos; y la comparación exigía el código *sin* guiones, pero la
      consola lo muestra *con* guiones en el buscador y en la flota, así que
      copiarlo y pegarlo fallaba. Ambos corregidos (`digitsOnly`).
- [x] **`tsconfig.app.json` compilaba todo `src/` sin `strict`.** Por eso
      pasaban desapercibidos `h.battery_level > 20` sobre un `number | null` y
      las coordenadas nulables. Activados `strict`, `noUncheckedIndexedAccess`,
      `noUnusedLocals` y `noUnusedParameters`.
- [x] **`backend/` no se verificaba en el build.** Tenía su propio `tsconfig`
      estricto, pero `tsc -b` no lo referenciaba: nunca se ejecutaba. Ahora
      `tsconfig.app.json` incluye `backend`.
- [x] **Promesas flotantes** (`handleAuthChange` sin `void`) y estado muerto
      (`notice` en `AuthScreen`, que nunca recibía texto).
- [x] **Código muerto retirado**: `src/components/Dashboard.tsx` (monolito
      legado de 283 líneas, sin importar desde ninguna parte) y
      `src/pages/DashboardHome.tsx`, sustituido por `MeasurementsPage`.

---

## 4. Diseño

La paleta anterior (`#12d271`, verde neón) no aparece en ningún archivo de
`Logo/`. La oficial es la del logotipo: tinta `#0f2e22`, verde de marca
`#16a34a`, verde de sonda `#047857`, hojas `#15803d` y `#22c55e`, bandas
`#10b981`, grises pizarra `#94a3b8`/`#cbd5e1`/`#e2e8f0`.

- [x] **138 clases de color no generaban ni un byte de CSS.** Tailwind v4 sólo
      crea utilidades para lo declarado en `@theme`, y los colores del semáforo
      estaban definidos en `:root` pero fuera de `@theme`. Verificado en el CSS
      compilado: `text-verdict-amber`, `bg-verdict-red`, `text-verdict-green`,
      `border-verdict-amber` → **0 ocurrencias**. El semáforo agronómico, los
      avisos de error, el botón de reseteo y el acento del panel de soporte se
      pintaban sin color.
- [x] **`@theme` era circular**: `--color-terra-bg: var(--color-terra-bg)`.
      Funcionaba por accidente de capas. Reescrito en dos capas: `--ts-*` con
      los valores crudos y `@theme inline` traduciéndolos a tokens — `inline`
      es obligatorio o el conmutador de tema deja de tener efecto.
- [x] **Contraste WCAG AA verificado por cálculo** en los dos temas, para cada
      par de texto y fondo del sistema. Mínimo obtenido: 4.56:1 (verde de
      veredicto sobre su fondo tenue); el resto por encima de 5:1.
- [x] **`bg-terra-card`** (token inexistente) y **`text-white`** (que dejaba el
      nombre del equipo ilegible en tema claro) eliminados.
- [x] **Foco visible** en toda la consola. Casi todos los controles llevaban
      `outline-none` confiando el foco a un cambio de color de borde —
      insuficiente con teclado, e invisible en los botones.
- [x] **Etiquetas asociadas**: los campos llevaban su etiqueta en un `<span>`
      suelto, así que un lector de pantalla anunciaba «editar texto» sin decir
      de qué. `src/ui/Form.tsx` vincula cada control con `useId`.
- [x] **Un `<h1>` por pantalla**, enlace *Saltar al contenido*, `role="region"`
      enfocable en las tablas que scrollean, `aria-pressed` en los filtros,
      `aria-busy` en los esqueletos de carga.
- [x] **Modal de reseteo con foco atrapado**, devolución del foco al cerrar y
      cierre con Escape.
- [x] **Los cuatro estados de cada pantalla** —cargando, vacía, con error y con
      datos— existen y se distinguen. La carga usa esqueletos, no spinners: un
      esqueleto mantiene la altura y evita el salto al llegar los datos.
- [x] **Tipografía del sistema** en lugar de Outfit desde Google Fonts. Es la
      pila que el propio logotipo usa para su wordmark, y ahorra una descarga
      bloqueante en cada carga del backoffice.
- [x] **Paneles opacos** en lugar de `backdrop-filter: blur(12px)`: sobre tablas
      densas el desenfoque degrada el texto pequeño y obliga a repintar una capa
      entera en cada scroll.
- [x] **`index.html`**: el `<link>` del favicon estaba corrupto, con un
      fragmento de SVG suelto dentro del `<head>`. Reescrito, más un script que
      fija el tema antes del primer pintado para que una sesión en claro no vea
      un destello oscuro en cada carga.
- [x] **`framer-motion` y `clsx` retirados**: sin uso tras el rediseño. Las
      transiciones se resolvieron con CSS, que respeta `prefers-reduced-motion`
      sin código. El chunk `ui` pasó de 148,9 kB a 19,5 kB y el CSS de 42,8 kB a
      27,6 kB.
- [x] **Sistema de componentes** en `src/ui/` (`Panel`, `Button`, `Form`,
      `Data`, `Feedback`, `PageHeader`) para que cada pantalla deje de inventar
      su propia combinación de clases. La ficha de equipo pasó de 717 líneas a
      200, repartida en cinco componentes.

### 4.1 Pendiente de diseño

- [ ] **Verificación visual en navegador.** No se pudo hacer: la extensión de
      Chrome no estaba conectada en esta sesión. Lo verificado es el CSS
      compilado y el contraste calculado, **no el aspecto real en pantalla**.
      Queda por mirar: los dos temas, el cajón lateral en móvil, las tablas con
      scroll horizontal y la cabecera fija.
- [ ] **Comprobar a 320, 768, 1024 y 1440 px.** El layout es responsive por
      construcción (el panel lateral se convierte en cajón por debajo de `lg`,
      las tablas scrollean en su propio contenedor), pero no se ha medido.
- [ ] **Pasar axe-core o Lighthouse.** El repaso de accesibilidad se hizo a mano
      y por cálculo; falta una herramienta que lo confirme.

---

## 5. Documentación

- [x] `Web/README.md` actualizado: describía una alerta push que ya no se envía
      (§2.2.5 y §5), documentaba tokens de color que no existen en `index.css`
      (§3) y omitía siete archivos reales del árbol de carpetas (§4).
- [ ] **`CLAUDE.md` §5 cita `predial_quadrants`** como «tabla real de la base de
      datos que no se renombra». Ya no existe: se eliminó en
      `20260920140000_retirar_mapa_y_postgis.sql`. No se tocó porque es el
      archivo de contexto del proyecto y la corrección es decisión del autor.

---

## 6. Fuera de alcance, pero sigue abierto

- [x] **Contraseña de soporte en texto plano — resuelta al borrar la cuenta.**
      `Web/README.md` §6.1 la documentaba desde el 6 de septiembre. La cuenta
      `alvarovillena8@gmail.com` ya no existe (el 21-09 sólo quedan los perfiles
      `demo.agricultor@terrasense.cl` y `alvarovillena7@gmail.com`), así que la
      contraseña filtrada no autentica nada.

- [ ] **Queda el secreto en el historial, por si se reutilizó.** El texto sigue
      legible dentro de `supabase_migrations.schema_migrations`. Ya no abre esta
      base, pero si esa misma contraseña se usó en otro sitio conviene vaciar la
      columna `statements` de esa fila, conservando el registro de que la
      migración se aplicó. Es limpieza, ya no una brecha.

- [ ] **Nadie tiene acceso al panel ahora mismo, y el código de invitación no se
      puede rotar.** Comprobado contra producción el 21-09:

      | Tabla | Estado |
      | --- | --- |
      | `admin_support_users` | una fila, `admin@terrasense.cl`, `is_active = true`, **`user_id` nulo** |
      | `admin_support_invite` | hash vigente, sin tocar desde el 02-09-2026 |

      Un `user_id` nulo significa «invitado, sin registrar»: `is_support_staff()`
      exige `user_id = auth.uid()`, así que **hoy no hay ninguna cuenta con
      acceso**. Y crear una cuenta no basta: `support_self_register` valida el
      código de invitación contra ese hash bcrypt y rechaza con `28000` sin él,
      con bloqueo a los cinco fallos por hora.

      El nudo es que `admin_rotate_invite_code` exige `is_support_staff()`. Sin
      nadie dentro, **el código no se puede cambiar desde la consola**: si no
      recuerdas el del 2 de septiembre, la única salida es fijar uno nuevo con
      la clave de servicio.

      ```sql
      -- En el editor SQL del dashboard de Supabase.
      update public.admin_support_invite
         set code_hash = extensions.crypt('<el codigo nuevo>', extensions.gen_salt('bf')),
             updated_at = now()
       where id = 1;
      ```

      Después basta con registrarse en la web con `admin@terrasense.cl` e
      introducir ese código: `support_self_register` enlaza la fila existente
      (busca por correo con `user_id IS NULL`) en vez de crear una nueva.
- [ ] **`.oxlintrc.json` sin linter.** El archivo de configuración existe, pero
      `oxlint` no está en `package.json` ni hay script `lint`. O se instala y se
      añade el script, o se borra la configuración.
- [ ] **No hay firmware del ESP32 en este repositorio.** Todo lo que la consola
      dice sobre OTA describe el contrato con un firmware que aún no existe.

---

## 7. Verificación

Estado a fecha de esta entrega:

```bash
cd Web && npm run type-check      # ✅ 0 errores, ahora con strict activado
cd Web && npm test                # ✅ 16/16 (4 de CSV + 12 nuevas de formato)
cd Web && npm run build           # ✅ build limpio
cd Web && npm run check-classes   # ✅ 305 utilidades de color, 305 con CSS
python docs/verificar_documentacion.py   # ✅ 0 errores
```

`check-classes` (`Web/scripts/verificar-clases.mjs`) es la comprobación propia de
esta auditoría, y la única que detecta lo de las 138 clases muertas: recorre
`src/`, extrae toda utilidad `(bg|text|border|…)-(terra|verdict|support)-*` y
verifica que aparezca en el CSS compilado. Ni el compilador, ni los tipos, ni las
pruebas fallan cuando una clase no genera nada — sólo se ve mirando la pantalla.

Base de datos, el 21-09-2026:

```bash
supabase db push                                  # ✅ migración aplicada
supabase db dump --linked -f supabase/schema.sql  # ✅ volcado regenerado
supabase gen types typescript --linked            # ✅ tipos regenerados
```

**Sin verificar todavía:** el aspecto en pantalla (§4.1). Todo lo demás de esta
auditoría está comprobado con un comando que pasa.

### 7.1. Un aviso sobre el Postgres local

Durante la validación, llamar a **cualquier** función con `EXECUTE` revocado
usando el rol `anon` provoca un `signal 11: Segmentation fault` que reinicia el
Postgres local. Se aisló hasta descartarlo como problema del repositorio: una
función trivial de dos líneas, sin ninguna relación con este esquema, lo
reproduce igual; y con el rol `authenticated` no ocurre.

Es del contenedor local (`supabase/postgres` 17.6, CLI 2.101.0), no de estas
migraciones. En producción el mismo caso devuelve `permission denied for
function` con normalidad — se comprobó por la API REST, y de hecho es lo que
ocurre en cada petición anónima a una RPC restringida, así que si afectase a
producción ya se habría notado. No se investigó más allá de descartarlo.

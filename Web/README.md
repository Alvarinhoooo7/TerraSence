# 🖥️ TerraSense · Backoffice web

Backoffice de soporte de TerraSense: buscar un equipo, ver su estado, administrar sus usuarios, revisar sus últimas mediciones y enviarle actualizaciones de firmware. **Una sola cuenta entra: `akurasoporte@gmail.com`.** Para cualquier otra, la web no existe: no hay alta de cuentas ni pantalla de acceso denegado.

React 19 · Vite 6 · Tailwind CSS v4 · TypeScript estricto · React Router 7 · Supabase. Desplegado en Vercel.

El plan del rediseño y lo que falta están en [TAREAS.md](TAREAS.md).

## Contenido

- [1. Acceso](#1-acceso)
- [2. Pantallas](#2-pantallas)
- [3. Datos y seguridad](#3-datos-y-seguridad)
- [4. Sistema visual](#4-sistema-visual)
- [5. Estructura](#5-estructura)
- [6. Desarrollo y comprobaciones](#6-desarrollo-y-comprobaciones)
- [7. Pendiente: contraseña de la cuenta anterior](#7-pendiente-contraseña-de-la-cuenta-anterior)

## 1. Acceso

| Ruta | Qué hace |
| --- | --- |
| `/ingresar` | Correo y contraseña. Un error, venga de donde venga (correo inexistente, contraseña mala o cuenta que no es la de soporte), dice lo mismo: «Correo o contraseña incorrectos.» Una cuenta válida que no es la de soporte se cierra en el acto. |
| `/recuperar-acceso` | Correo → código de 6 dígitos → contraseña nueva → vuelta a `/ingresar`. Sirve para olvidar, cambiar y **para el primer ingreso**: la cuenta se crea en la base sin contraseña. |

Sin sesión, cualquier otra URL lleva a `/ingresar`. Los textos antes de entrar son neutros: nada dice «backoffice» ni «soporte».

**La decisión no está en la web.** `is_support_staff()` exige la fila activa en `admin_support_users` **y** el correo `akurasoporte@gmail.com` confirmado ([migración](../supabase/migrations/20260927120000_backoffice_cuenta_unica.sql)); cada función del backoffice la comprueba. El código de la web no contiene ese correo.

**La recuperación tampoco delata la cuenta.** La Edge Function [`backoffice-recover`](../supabase/functions/backoffice-recover/index.ts) envía el código solo si el correo es el de soporte, responde `{ ok: true }` a cualquier correo y lo hace antes de enviar, para que el tiempo de respuesta no revele cuál sirve. Si otra cuenta llegara a verificar un código aquí, su sesión se cierra y la pantalla responde como a un código inválido.

## 2. Pantallas

Barra lateral con tres opciones: **Buscar**, **Update** y **Cerrar sesión**. Al entrar se abre Buscar.

### Buscar (`/buscar?q=`)

Busca por el ID del equipo (15 dígitos, con o sin guiones) o por el correo de cualquier usuario enlazado. Devuelve una fila por cada par equipo–cliente: ID, cliente, correo y rol (Admin, Usuario o Pendiente). La búsqueda queda en la URL, así «Resultados» desde un equipo vuelve a la misma lista.

### Equipo (`/equipo/:id`)

Arriba, la búsqueda para saltar a otro equipo. Debajo, una tarjeta por tema; cada una carga y refresca por su cuenta.

| Tarjeta | Contenido | Acciones |
| --- | --- | --- |
| Estado | ID, Online/Offline, batería («No disponible» si está Offline), primera y última conexión | Refrescar · Reset |
| Usuarios | Usuario, correo, Admin (Sí/No), Hacer admin, Aprobado | Refrescar · Hacer administrador (con confirmación; el admin anterior pasa a usuario) · Aceptar / Rechazar solicitudes pendientes |
| Mediciones | Últimas 5. Recogida: registro, fase, humedad, temperatura del suelo, CE y pH. Desplegada: N, P, K, ambiente, presión, batería, resumen del pronóstico, consejo del motor y coordenada en texto plano | Refrescar · desplegar cada fila |
| Actualización | Versión instalada, último envío y su estado | Refrescar · Enviar actualización · Cancelar envío |

**Online** significa que un teléfono habló con la sonda hace menos de 15 minutos: la sonda no tiene internet. Lo decide el servidor con `devices.last_seen_at`, que la app actualiza en cada contacto BLE ([`contactService.ts`](../App/src/services/contactService.ts)).

**Reset** abre un diálogo con la lista de lo que se borra (usuarios, solicitudes, mediciones, alertas, invitaciones, historial, actualizaciones) y dos botones: Cancelar y Resetear. El ID no cambia porque sale de la MAC de la sonda; quien la vuelva a vincular con la ventana PAIR abierta queda como administrador, sea un antiguo miembro o alguien nuevo. **Es el único reset que existe**: ni la sonda ni la app tienen reset.

### Update (`/update`)

1. **Cargar versión:** el `.bin` de la aplicación que exporta Arduino IDE, su versión X.Y.Z y notas. El navegador comprueba que sea una imagen del ESP32 (primer byte `0xE9`), calcula el SHA-256 y sube el archivo al bucket privado `firmware`. Queda como borrador.
2. **Publicar.** Conviene probar antes la versión en un equipo desde su tarjeta Actualización.
3. **Enviar a todos:** a cada equipo con administrador y versión anterior o desconocida. Se omiten los que ya la tienen, los que tienen una más nueva y los que no tienen administrador.
4. **Seguimiento** por versión: pendientes, instalando, instaladas y fallidas, con la lista de equipos.

Cada envío crea un aviso push para el **administrador** del equipo ([`backoffice-send-update`](../supabase/functions/backoffice-send-update/index.ts)). La ventana Actualizar/Cancelar de la app y la instalación por BLE son las fases 7 y 8 de [TAREAS.md](TAREAS.md).

## 3. Datos y seguridad

- Todo pasa por funciones `SECURITY DEFINER` que comprueban `is_support_staff()` ([funciones del backoffice](../supabase/migrations/20260927120200_funciones_backoffice.sql), [actualizaciones](../supabase/migrations/20260927120300_actualizaciones_firmware.sql)). La web usa solo la clave pública; **nunca** la `service_role`.
- Los tipos generados están en [`backend/database.types.ts`](backend/database.types.ts) (`supabase gen types typescript`); los de dominio, con la nulabilidad real, en [`backend/types.ts`](backend/types.ts).
- El binario de firmware solo lo descarga la cuenta de soporte o el administrador de un equipo con esa actualización activa (políticas de `storage.objects`).
- `index.html` pide no indexar ni archivar la página y no enviar el referente.

## 4. Sistema visual

Un instrumento de campo, no un panel de marketing: superficies sobrias, un solo acento (el verde del logotipo), datos en IBM Plex Mono con cifras tabulares, bordes en vez de sombras y el color reservado para estados (online, pendiente, error). Los tokens viven en [`src/index.css`](src/index.css) y siguen el tema claro u oscuro del sistema operativo. La barra lateral usa la tinta del logotipo en ambos temas.

Componentes base en [`src/ui/`](src/ui/): botón (principal, secundario, discreto y peligro en rojo suave), campos, tarjeta, diálogo de confirmación (`<dialog>` nativo: atrapa el foco y cierra con Escape; Cancelar a la izquierda y la acción a la derecha), avisos, insignias y esqueletos de carga.

## 5. Estructura

```text
Web/
├── backend/            adminApi.ts (RPC), types.ts, database.types.ts, supabaseAdmin.ts
├── src/
│   ├── main.tsx        punto de entrada
│   ├── App.tsx         rutas según la sesión
│   ├── services/       supabase.ts (único cliente, clave pública)
│   ├── auth/           session.tsx, LoginPage, RecoverPage, AuthLayout, PasswordChecklist, mensajes
│   ├── layout/         Shell.tsx (barra lateral)
│   ├── pages/          SearchPage, DevicePage, UpdatePage
│   ├── components/     SearchBar, RoleBadge, device/ (tarjetas y diálogo de reset)
│   ├── hooks/          useCardData (carga y refresco por tarjeta)
│   ├── ui/             componentes base y logotipo
│   └── utils/          formato, veredicto y resumen del pronóstico
├── tests/              format.test.mjs
└── scripts/            verificar-clases.mjs
```

## 6. Desarrollo y comprobaciones

`Web/.env` a partir de `Web/.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

```bash
cd Web
npm run dev           # http://localhost:5173
npm run type-check    # tsc -b, estricto
npm test              # utilidades de formato, veredicto y pronóstico
npm run build
npm run check-classes # toda clase de color del tema genera CSS (requiere build)
```

`check-classes` existe porque Tailwind v4 solo genera utilidades para los tokens declarados en `@theme`: una clase de color mal declarada no rompe la compilación ni las pruebas, simplemente no pinta.

Despliegue: `vercel --prod --yes` desde `Web/`. `vercel.json` reescribe cualquier ruta a `index.html`.

## 7. Pendiente: contraseña de la cuenta anterior

La cuenta que antes entraba al backoffice (`alvarovillena8@gmail.com`) se creó desde SQL con la contraseña escrita en `20260902180000_alta_usuario_alvaro.local.sql`. El archivo no está en git, pero Supabase guarda el cuerpo de cada migración aplicada en `supabase_migrations.schema_migrations`, así que la contraseña sigue legible en la base de producción. Desde [`20260927120000`](../supabase/migrations/20260927120000_backoffice_cuenta_unica.sql) esa cuenta ya no entra al backoffice, pero sigue siendo una cuenta de la app.

Corrección, en este orden: cambiar su contraseña (*Authentication → Users* o recuperación) y luego vaciar la columna `statements` de esa fila en `schema_migrations`. La cuenta de soporte nueva no repite el error: se creó sin contraseña.

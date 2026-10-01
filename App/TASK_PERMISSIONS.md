# Plan de implementación: permisos del teléfono

Este documento contiene **sólo trabajo pendiente**. Lo terminado se retiró: su evidencia
está en el código, en las pruebas y en git. Las decisiones que siguen vigentes están en
[Decisiones que no se reabren](#decisiones-que-no-se-reabren).

Todo lo que podía cerrarse sin teléfonos ni sonda quedó cerrado el 01-10-2026. Lo que sigue
depende de teléfonos, del hardware, de credenciales externas o de una decisión del usuario.

## Estado comprobado el 01-10-2026

| Comprobación | Resultado |
| --- | --- |
| App: `npm test` · `npm run type-check` · introspección nativa | 239 aprobadas · sin errores · permisos conformes |
| Web: `npm test` · `npm run type-check` | 8 aprobadas · sin errores |
| Despachador: `node --test supabase/functions/send-push-alert/dispatch.test.mjs` | 29 aprobadas |
| `supabase db reset` (réplica local con Docker) | Reconstruye la línea base y las 4 migraciones posteriores sin errores |
| [test_notificaciones.sql](../supabase/scripts/test_notificaciones.sql) | Correcto, con rollback |
| [test_recuperacion_auth.mjs](../supabase/scripts/test_recuperacion_auth.mjs) | Correcto: cierre global, cierre local y otra cuenta intacta |
| [test_concurrencia_push.sh](../supabase/scripts/test_concurrencia_push.sh), también con `ESPERA_REAL_LEASE=1` | Correcto, incluido el cierre global con envíos en vuelo; base limpia |
| `npm run test:supabase-onboarding` contra la réplica local (con `supabase functions serve`) | Correcto |
| `python docs/verificar_documentacion.py` | 0 errores |
| Producción: migraciones | Las 5 aplicadas; no hace falta una migración nueva |
| Producción: Edge Functions y cron | Las 6 funciones activas; `terrasense-push-dispatch` responde 200 cada minuto con Vault cargado |
| Proyecto EAS | `@alvarinhoo2001/terrasense` (`ac4799ff-9c98-4037-832f-0e62e0cfbe64`), fijado en `app.config.js` |
| Teléfonos, sonda, correo real, FCM/APNs | No comprobados: ver abajo |

## Pendiente

### Opcional, desde tu cuenta Expo

- [ ] Sólo si se activa «Enhanced Security for Push Notifications» en expo.dev: crear un token
  de acceso y cargarlo con `supabase secrets set EXPO_ACCESS_TOKEN=...`. Sin esa opción activa,
  el despachador funciona sin token.

### D01. Cierre de sesión entre teléfonos

- [ ] Recorrido en dos teléfonos: recuperación que cierra todas las sesiones, fallos de red,
  reinicio y aviso tardío ya enviado a Expo.

### D09. Auth y correo reales

- [ ] Desde la app compilada: registro, confirmación, reenvío, código incorrecto o vencido,
  límites, recuperación y correo de cambio de contraseña.

### Otros pendientes

| ID | Pendiente | Bloqueo |
| --- | --- | --- |
| D03 | Panel o alertas sobre `push_dispatch_health()` en producción | Elegir herramienta de monitoreo |
| D05 | Credenciales FCM V1 (`eas credentials`) y APNs del proyecto EAS; ensayo de solicitud, aprobación, rechazo y transferencia con ticket, receipt, recepción y apertura | Postergado por el usuario; requiere teléfonos |
| D06 | Compilación `production` en TestFlight y lectura del permiso Bluetooth en un iPhone físico | Postergado por el usuario |
| D07 | Cancelación BLE nativa con teléfono y sonda | Teléfono y sonda |
| D10 | Bandeja renderizada (carga, vacío, sin red, paginación, otra cuenta, tap con la app cerrada), acceso «Avisos» con texto grande, accesibilidad | Teléfono |
| D12 | Lectura RS-485/Modbus de suelo, BME280, batería, PAIR y rangos: fuente [Firmware/TASK.md](../Firmware/TASK.md) | Hardware |
| D11 | Aviso de batería baja (15 %, rearme sobre 20 %) con sonda real; ajustar el umbral cuando el firmware calibre su curva (F2) | Sonda |
| D13 | Auditoría agronómica de umbrales; respuesta meteorológica real con coordenadas y zona horaria; permiso de ubicación revocado con la pantalla abierta | Revisión experta y teléfono |
| D14 | Modo avión, reset de soporte durante la sincronización, pérdida de membresía con cola pendiente | Varios teléfonos |
| D15 | Instalación de firmware por BLE: protocolo, integridad, progreso real y aviso: [Firmware/PLAN.md](../Firmware/PLAN.md), [Web/TAREAS.md](../Web/TAREAS.md) | Condicionado al ESP32 |
| D16 | Proveedor de recomendación remota | Condicionado: sólo si se habilita |
| D08 | Declaraciones de privacidad de las tiendas, coherentes con el texto legal `2026-10-01-1` | Publicación |
| D17 | Revisión del binario de publicación (identificadores, iconos, splash, manifest/plist, Firebase); pendientes de [PLAN_VALIDACION](../docs/PLAN_VALIDACION.md) | Compilación de tienda |

### P7. Matriz nativa

Abierta en su totalidad. Registrar plataforma, versión y compilación de cada prueba: Motorola G55;
Android compacto (360 × 640) e iPhone compacto (375 × 667) con texto grande; temas e idiomas;
splash y actualización de una instalación anterior; teclado y autorrelleno; TalkBack/VoiceOver y
movimiento reducido; Android 12+ y anterior a 12; iPhone físico; revocación y cambio de cuenta;
ubicación aproximada o sin señal; QR y código con dos cuentas; sonda física; medición completa;
sin conexión y recuperación; reset con varios teléfonos; cuenta y correo; push en primer plano,
segundo plano y arranque frío; binario de distribución.

## Decisiones que no se reabren

- Push sólo para los cuatro eventos de acceso (`access_request`, `access_approved`,
  `access_rejected`, `admin_transferred`), categoría `device`. Retirados: push por medición
  crítica (propia o ajena), recordatorio de medir, alertas meteorológicas y preferencias de
  avisos agronómicos, clima o sincronización.
- El diagnóstico dentro de la lectura se conserva; el pronóstico al medir sólo se consulta si
  la persona incluye ubicación.
- Sin push de firmware mientras no exista instalación funcional por BLE.
- Reset sólo desde el backoffice; revincular por Bluetooth y ventana PAIR.
- Mapas, perímetros y PostGIS retirados; se conservan `latitude`, `longitude` y `gps_accuracy_m`.
- Los permisos se piden desde cada función, nunca todos al entrar. El salto de vinculación
  existe sólo como gesto de desarrollo (`__DEV__`).
- El firmware no inventa lecturas; la demo de la app se identifica y no se guarda como medición.
- Cierre y borrado de cuenta fuera del alcance actual. No se migra a otro proveedor push.
- El pronóstico usa la API gratuita de Open-Meteo, por decisión del usuario; no se contrata
  plan pagado ni se cambia de proveedor.

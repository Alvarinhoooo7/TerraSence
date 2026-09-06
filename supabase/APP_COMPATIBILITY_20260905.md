# Compatibilidad de la app · 2026-09-05

La mejora de inicio e historial usa el esquema existente de `soil_measurements`. Se agrega `client_uuid` a la proyección de lectura del cliente móvil para reconciliar la cola local con el ID generado por PostgreSQL. No cambia el payload compartido con la web ni las políticas RLS.

La caché local se separa por usuario autenticado, nombre de predio y equipo; contiene la última consulta de hasta 200 registros y conserva el indicador de lectura pendiente al combinarse con la cola.

## Comprobación remota

`supabase migration list --linked` ejecutado el 5 de septiembre:

| Versión | Local | Remoto |
| --- | --- | --- |
| 20260902180000 | Ausente | Aplicada |
| 20260902210000 | Ausente | Aplicada |
| 20260904120000 | Presente | Pendiente |

El resto de versiones listadas coincide. Esta inspección verifica el historial de migraciones, no constituye una auditoría completa del esquema o de RLS.

La migración `20260904120000_mediciones_sin_gps_idempotencia.sql` continúa pendiente: permite coordenadas nulas y crea el índice único no parcial que necesita el upsert por `client_uuid`. Recuperar primero las migraciones remotas originales, probar en staging y después desplegar. No sustituir las versiones faltantes con marcadores vacíos ni cambiar su estado remoto para forzar el push.

No se ejecutó DDL remoto durante esta entrega. Un intento posterior de consultar ayuda del CLI falló por escritura de telemetría fuera del workspace (`C:\Users\alvar\.supabase\telemetry.json`); la consulta de historial anterior sí terminó correctamente.

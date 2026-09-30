#!/usr/bin/env bash
# Prueba de concurrencia real del despacho de avisos contra la base LOCAL de Supabase.
#
#   bash supabase/scripts/test_concurrencia_push.sh
#
# A diferencia de test_notificaciones.sql (una sola transacción), aquí se abren sesiones psql
# simultáneas y con transacciones que se confirman de verdad. Demuestra:
#   1. Dos sesiones que reservan a la vez no reciben nunca la misma entrega (for update skip
#      locked): la segunda no espera a la primera y toma sólo lo que la primera no tiene.
#   2. Un trabajador que muere tras reservar y antes de confirmar no deja nada colgado: la
#      transacción se revierte y las entregas quedan disponibles al instante.
#   3. Un trabajador que confirma la reserva, «llama a Expo» y muere sin guardar el ticket:
#      la reserva sigue vigente (nadie más la toma) hasta que vence su lease; entonces otra
#      sesión la recupera con un intento más (puede duplicar el aviso, jamás lo pierde), y el
#      ticket tardío del primer trabajador se ignora.
#   4. Dos informes simultáneos del mismo ticket dejan un solo ticket, sin errores.
#   5. Una entrega con ticket aceptado no vuelve a reservarse.
#   6. Preferencia, permiso y membresía que cambian desde otra conexión con envíos en vuelo cancelan
#      lo que corresponde, dejan las demás y los tickets tardíos no reviven nada.
#
# Deja la base como la encontró: sus filas de prueba se borran siempre, aun si algo falla. Se
# niega a correr si ya hay entregas en la base (usa una réplica recién creada con
# `supabase db reset`). Nunca apunta al proyecto remoto: sólo habla con el contenedor local.
#
# Para esperar de verdad los dos minutos del lease en vez de simular su vencimiento:
#   ESPERA_REAL_LEASE=1 bash supabase/scripts/test_concurrencia_push.sh

set -u
set -o pipefail
CONTENEDOR="${SUPABASE_DB_CONTAINER:-supabase_db_TerraSense}"
ADMIN='c0c0c0c0-0000-4000-8000-000000000001'
SOLICITANTE='c0c0c0c0-0000-4000-8000-000000000002'
EQUIPO='c0c0c0c0-0000-4000-8000-0000000000d1'
SERVICIO="select set_config('request.jwt.claims', '{\"role\":\"service_role\"}', false);"
TMP="$(mktemp -d)"
FALLAS=0

# psql contra el contenedor local. -X ignora ~/.psqlrc; -At deja la salida sin formato.
psql_() { docker exec -i "$CONTENEDOR" psql -U postgres -d postgres -X -q -At -v ON_ERROR_STOP=1 "$@"; }
consulta() { psql_ -c "$1" 2>&1 | tr -d '\r'; }
sesion() { local app="$1"; shift; docker exec -i -e PGAPPNAME="$app" "$CONTENEDOR" psql -U postgres -d postgres -X -q -At -v ON_ERROR_STOP=1 "$@"; }

falla() { echo "FALLA: $1"; FALLAS=$((FALLAS + 1)); }
verifica() { if [ "$1" = "$2" ]; then echo "  ok: $3"; else falla "$3 (esperado '$2', obtenido '$1')"; fi; }

limpiar() {
  # Sin registrar rechazos espurios y sin dejar rastro: el equipo, sus avisos y las cuentas de prueba.
  psql_ >/dev/null 2>&1 <<SQL
begin;
select set_config('terrasense.factory_reset', 'on', true);
delete from public.push_alerts where device_id = '$EQUIPO';
delete from public.device_members where device_id = '$EQUIPO';
delete from public.devices where id = '$EQUIPO';
delete from auth.users where id in ('$ADMIN', '$SOLICITANTE');
commit;
SQL
  local restos
  restos="$(consulta "select (select count(*) from auth.users where id in ('$ADMIN','$SOLICITANTE'))
    + (select count(*) from public.devices where id = '$EQUIPO')
    + (select count(*) from public.push_alerts where device_id = '$EQUIPO')
    + (select count(*) from public.push_installations where expo_push_token like 'ExpoPushToken[conc%')")"
  if [ "$restos" != "0" ]; then echo "AVISO: quedaron $restos filas de prueba"; FALLAS=$((FALLAS + 1)); else echo "Base limpia: sin filas de prueba."; fi
  rm -rf "$TMP"
  if [ "$FALLAS" -eq 0 ]; then echo "test_concurrencia_push.sh: TODO CORRECTO"; else echo "test_concurrencia_push.sh: $FALLAS FALLAS"; fi
  [ "$FALLAS" -eq 0 ] || exit 1
}
trap limpiar EXIT

reiniciar_entregas() {
  psql_ -c "update public.push_deliveries set state = 'pending', lease_id = null, leased_until = null,
    attempts = 0, next_attempt_at = now(), ticket_id = null, ticket_at = null, last_error = null
    where alert_id in (select id from public.push_alerts where device_id = '$EQUIPO')" >/dev/null
}
# Espera a que la sesión (por su application_name) esté dormida dentro de su transacción, es decir,
# que ya reservó y sigue sosteniendo sus bloqueos. Se mira la base, no la salida del proceso,
# porque ésta llega con retraso.
esperar_sesion_dormida() { # application_name segundos
  local i=0
  while [ "$(consulta "select count(*) from pg_stat_activity where application_name = '$1' and query like 'select pg_sleep%'")" != "1" ]; do
    sleep 0.2; i=$((i + 1)); if [ "$i" -gt $(($2 * 5)) ]; then return 1; fi
  done
}
# Los archivos de salida pueden traer CRLF (docker en Windows): se quita al leerlos.
uuids() { tr -d '\r' < "$1" | grep -E '^[0-9a-f]{8}-[0-9a-f]{4}-' | sort; }

# ---------------------------------------------------------------------------
echo "== Preparación =="
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTENEDOR"; then
  echo "No hay un contenedor local $CONTENEDOR. Levanta Supabase local (supabase start)."; trap - EXIT; rm -rf "$TMP"; exit 2
fi
previas="$(consulta 'select count(*) from public.push_deliveries')"
if [ "$previas" != "0" ]; then
  echo "La base tiene $previas entregas ajenas a la prueba; usa una réplica limpia (supabase db reset)."
  trap - EXIT; rm -rf "$TMP"; exit 2
fi
if ! psql_ >/dev/null <<SQL
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at) values
  ('$ADMIN', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'concurrencia-admin@example.test', 'x', now()),
  ('$SOLICITANTE', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'concurrencia-solicitante@example.test', 'x', now());
insert into public.devices(id, device_code, name) values ('$EQUIPO', '990000000000001', 'Prueba de concurrencia');
insert into public.device_members(device_id, user_id, role, is_authorized) values ('$EQUIPO', '$ADMIN', 'admin', true);
insert into public.push_installations(id, user_id, secret_hash, platform, permission, expo_push_token)
  select gen_random_uuid(), '$ADMIN', repeat('a', 64), 'android', 'granted', 'ExpoPushToken[conc' || n || ']'
  from generate_series(1, 10) n;
-- La solicitud crea el evento y su destinatario (el administrador); 10 teléfonos = 10 entregas.
insert into public.device_members(device_id, user_id, role, is_authorized) values ('$EQUIPO', '$SOLICITANTE', 'user', false);
insert into public.push_deliveries(alert_id, user_id, installation_id, token_generation)
  select a.id, r.user_id, i.id, i.token_generation
  from public.push_alerts a join public.notification_recipients r on r.alert_id = a.id
    join public.push_installations i on i.user_id = r.user_id
  where a.device_id = '$EQUIPO';
SQL
then
  falla "no se pudieron crear los datos de prueba"; exit 1
fi
verifica "$(consulta "select count(*) from public.push_deliveries")" 10 "diez entregas pendientes de prueba"

# ---------------------------------------------------------------------------
echo "== 1. Dos sesiones reservan a la vez (skip locked) =="
sesion concurrencia_a > "$TMP/a.txt" <<SQL &
$SERVICIO
begin;
create temp table r on commit drop as select delivery_id from public.reserve_push_deliveries(6);
select 'A_RESERVADO';
select delivery_id from r;
select pg_sleep(4);
select 'A_CONFIRMA ' || extract(epoch from clock_timestamp());
commit;
SQL
PID_A=$!
esperar_sesion_dormida concurrencia_a 20 || falla "la sesión A no llegó a reservar"
sesion concurrencia_b > "$TMP/b.txt" <<SQL
$SERVICIO
begin;
create temp table r on commit drop as select delivery_id from public.reserve_push_deliveries(6);
select 'B_TERMINA ' || extract(epoch from clock_timestamp());
select delivery_id from r;
commit;
SQL
wait "$PID_A"
uuids "$TMP/a.txt" > "$TMP/a.ids"; uuids "$TMP/b.txt" > "$TMP/b.ids"
verifica "$(wc -l < "$TMP/a.ids" | tr -d ' ')" 6 "la sesión A reservó seis"
verifica "$(wc -l < "$TMP/b.ids" | tr -d ' ')" 4 "la sesión B tomó sólo las cuatro que A no tenía"
verifica "$(comm -12 "$TMP/a.ids" "$TMP/b.ids" | wc -l | tr -d ' ')" 0 "ninguna entrega llegó a las dos sesiones"
verifica "$(sort -u "$TMP/a.ids" "$TMP/b.ids" | wc -l | tr -d ' ')" 10 "entre las dos cubren las diez"
b_fin="$(tr -d '\r' < "$TMP/b.txt" | grep '^B_TERMINA' | cut -d' ' -f2)"; a_fin="$(tr -d '\r' < "$TMP/a.txt" | grep '^A_CONFIRMA' | cut -d' ' -f2)"
verifica "$(awk -v b="$b_fin" -v a="$a_fin" 'BEGIN { print (b < a) ? "si" : "no" }')" si "B terminó antes de que A confirmara: no esperó por sus bloqueos"
verifica "$(consulta "select count(*) || '/' || count(distinct lease_id) || '/' || max(attempts) from public.push_deliveries where state = 'leased'")" "10/10/1" "diez reservas con lease propio y un intento cada una"
verifica "$(consulta "$SERVICIO select count(*) from public.reserve_push_deliveries(100)" | tail -1)" 0 "una tercera sesión no recibe nada mientras los leases estén vigentes"

# ---------------------------------------------------------------------------
echo "== 2. Trabajador que muere tras reservar y antes de confirmar =="
reiniciar_entregas
sesion concurrencia_muere > "$TMP/k.txt" 2>/dev/null <<SQL &
$SERVICIO
begin;
create temp table r as select delivery_id from public.reserve_push_deliveries(3);
select 'K_RESERVADO';
select pg_sleep(60);
commit;
SQL
PID_K=$!
esperar_sesion_dormida concurrencia_muere 20 || falla "el trabajador no llegó a reservar"
verifica "$(consulta "select count(*) from pg_stat_activity where application_name = 'concurrencia_muere' and state <> 'idle'")" 1 "el trabajador tiene su transacción abierta"
consulta "select pg_terminate_backend(pid) from pg_stat_activity where application_name = 'concurrencia_muere'" > /dev/null
wait "$PID_K" 2>/dev/null
verifica "$(consulta "select count(*) || '/' || count(lease_id) || '/' || coalesce(max(attempts), 0) from public.push_deliveries where state = 'pending'")" "10/0/0" "la reserva se revirtió: diez pendientes, sin lease y sin intentos consumidos"
verifica "$(consulta "$SERVICIO select count(*) from public.reserve_push_deliveries(100)" | tail -1)" 10 "otra sesión recupera las diez de inmediato"

# ---------------------------------------------------------------------------
echo "== 3. Reserva confirmada, «llamada a Expo» y muerte sin guardar el ticket =="
reiniciar_entregas
consulta "$SERVICIO select delivery_id || ' ' || lease_id from public.reserve_push_deliveries(2)" | grep -E '^[0-9a-f]{8}-' > "$TMP/w1.txt"
verifica "$(wc -l < "$TMP/w1.txt" | tr -d ' ')" 2 "el primer trabajador reservó dos y murió antes de informar (su ticket nunca se guarda)"
IDS_W="$(awk '{printf "%s'"'"'%s'"'"'", (NR > 1 ? "," : ""), $1}' "$TMP/w1.txt")"
verifica "$(consulta "$SERVICIO select count(*) from public.reserve_push_deliveries(100) where delivery_id in ($IDS_W)" | tail -1)" 0 "mientras el lease sigue vigente nadie más las toma"
if [ "${ESPERA_REAL_LEASE:-0}" = "1" ]; then
  echo "  (esperando 125 s a que venza el lease de verdad)"; sleep 125
else
  psql_ -c "update public.push_deliveries set leased_until = now() - interval '1 second' where id in ($IDS_W)" > /dev/null
fi
consulta "$SERVICIO select delivery_id || ' ' || lease_id from public.reserve_push_deliveries(100) where delivery_id in ($IDS_W)" | grep -E '^[0-9a-f]{8}-' > "$TMP/w2.txt"
verifica "$(wc -l < "$TMP/w2.txt" | tr -d ' ')" 2 "vencido el lease, otra sesión recupera las mismas dos entregas"
verifica "$(cut -d' ' -f1 "$TMP/w1.txt" | sort | tr '\n' ' ')" "$(cut -d' ' -f1 "$TMP/w2.txt" | sort | tr '\n' ' ')" "son las mismas entregas"
verifica "$(comm -12 <(cut -d' ' -f2 "$TMP/w1.txt" | sort) <(cut -d' ' -f2 "$TMP/w2.txt" | sort) | wc -l | tr -d ' ')" 0 "con leases nuevos"
verifica "$(consulta "select min(attempts) || '/' || max(attempts) from public.push_deliveries where id in ($IDS_W)")" "2/2" "el intento se cuenta: un segundo envío pudo duplicar el aviso (nunca se pierde)"
D1="$(head -1 "$TMP/w1.txt" | cut -d' ' -f1)"; L_VIEJO="$(head -1 "$TMP/w1.txt" | cut -d' ' -f2)"
L_NUEVO="$(grep "^$D1" "$TMP/w2.txt" | cut -d' ' -f2)"
consulta "$SERVICIO select public.report_push_ticket('$D1', '$L_VIEJO', 'TICKET-TARDIO')" > /dev/null
verifica "$(consulta "select state || '/' || coalesce(ticket_id, 'sin ticket') from public.push_deliveries where id = '$D1'")" "leased/sin ticket" "el ticket tardío del primer trabajador se ignora"

echo "== 4. Dos informes simultáneos del mismo ticket =="
sesion concurrencia_x > "$TMP/x.txt" <<SQL &
$SERVICIO
begin;
select public.report_push_ticket('$D1', '$L_NUEVO', 'TICKET-X');
select pg_sleep(2);
commit;
SQL
PID_X=$!
sleep 0.7
sesion concurrencia_y > "$TMP/y.txt" <<SQL
$SERVICIO
begin;
select public.report_push_ticket('$D1', '$L_NUEVO', 'TICKET-Y');
commit;
SQL
RC_Y=$?
wait "$PID_X"; RC_X=$?
verifica "$RC_X/$RC_Y" "0/0" "ninguno de los dos informes da error"
verifica "$(consulta "select state || '/' || ticket_id from public.push_deliveries where id = '$D1'")" "ticket_ok/TICKET-X" "gana el primero y el segundo se ignora"

echo "== 5. Una entrega con ticket aceptado no vuelve a reservarse =="
psql_ -c "update public.push_deliveries set next_attempt_at = now() - interval '1 hour', leased_until = now() - interval '1 hour' where id = '$D1'" > /dev/null
verifica "$(consulta "$SERVICIO select count(*) from public.reserve_push_deliveries(100) where delivery_id = '$D1'" | tail -1)" 0 "ni con la espera y el lease vencidos"

echo "== 6. Preferencia, permiso y membresía cambian con envíos en curso (otras conexiones, confirmadas) =="
PREF_APAGADA="update public.profiles set app_preferences = jsonb_set(coalesce(app_preferences, '{}'::jsonb), '{notifications,device}', 'false') where id = '$ADMIN'"
PREF_ACTIVA="update public.profiles set app_preferences = jsonb_set(coalesce(app_preferences, '{}'::jsonb), '{notifications,device}', 'true') where id = '$ADMIN'"
reservar_a_archivo() { # cantidad archivo: reserva confirmada (el trabajador ya «llama a Expo»)
  consulta "$SERVICIO select delivery_id || ' ' || lease_id from public.reserve_push_deliveries($1)" | grep -E '^[0-9a-f]{8}-' > "$2"
}
ticket_tardio() { # archivo etiqueta: el trabajador informa sus tickets cuando ya cambió algo (docker -i no debe leer el archivo)
  local n=0 d l
  while read -r d l; do n=$((n + 1)); consulta "$SERVICIO select public.report_push_ticket('$d', '$l', '$2-$n')" > /dev/null < /dev/null; done < "$1"
}
estados() { consulta "select string_agg(state || ':' || coalesce(last_error, '-') || ':' || (ticket_id is not null), ',' order by id) from public.push_deliveries where id in ($1)"; }
ids_de() { awk '{printf "%s'"'"'%s'"'"'", (NR > 1 ? "," : ""), $1}' "$1"; }

# 6a. La preferencia se apaga mientras otro despachador aún no confirma su reserva.
reiniciar_entregas
sesion concurrencia_pref > "$TMP/p.txt" <<SQL &
$SERVICIO
begin;
create temp table r on commit drop as select delivery_id, lease_id from public.reserve_push_deliveries(4);
select 'P_RESERVADO';
select delivery_id || ' ' || lease_id from r;
select pg_sleep(3);
commit;
SQL
PID_P=$!
esperar_sesion_dormida concurrencia_pref 20 || falla "el despachador de la prueba de preferencia no llegó a reservar"
psql_ -c "$PREF_APAGADA" > /dev/null
wait "$PID_P"
tr -d '\r' < "$TMP/p.txt" | grep -E '^[0-9a-f]{8}-' > "$TMP/p.ids"
verifica "$(wc -l < "$TMP/p.ids" | tr -d ' ')" 4 "el despachador ya había decidido enviar cuatro cuando se apagó la preferencia"
verifica "$(consulta "$SERVICIO select count(*) from public.reserve_push_deliveries(100)" | tail -1)" 0 "con la preferencia apagada el siguiente despachador no reserva nada"
verifica "$(consulta "select count(*) from public.push_deliveries where state = 'cancelled' and last_error = 'preference_disabled'")" 10 "las diez entregas abiertas (en vuelo o pendientes) quedaron canceladas por preferencia"
ticket_tardio "$TMP/p.ids" TICKET-PREF
verifica "$(consulta "select count(*) from public.push_deliveries where id in ($(ids_de "$TMP/p.ids")) and (state <> 'cancelled' or ticket_id is not null)")" 0 "los tickets que llegan tarde no reviven las entregas canceladas"
psql_ -c "$PREF_ACTIVA" > /dev/null

# 6b. Se retira el permiso de tres teléfonos con las diez entregas reservadas.
reiniciar_entregas
reservar_a_archivo 10 "$TMP/m.txt"
verifica "$(wc -l < "$TMP/m.txt" | tr -d ' ')" 10 "diez entregas en vuelo"
psql_ -c "update public.push_installations set permission = 'denied' where expo_push_token in ('ExpoPushToken[conc1]', 'ExpoPushToken[conc2]', 'ExpoPushToken[conc3]')" > /dev/null
verifica "$(consulta "$SERVICIO select count(*) from public.reserve_push_deliveries(100)" | tail -1)" 0 "otro despachador no reserva nada y aplica el mantenimiento"
verifica "$(consulta "select count(*) filter (where state = 'cancelled') || '/' || count(*) filter (where state = 'leased') from public.push_deliveries where id in ($(ids_de "$TMP/m.txt"))")" "3/7" "sólo las tres entregas de los teléfonos sin permiso se cancelan"
ticket_tardio "$TMP/m.txt" TICKET-PERM
verifica "$(consulta "select count(*) filter (where state = 'cancelled' and ticket_id is null) || '/' || count(*) filter (where state = 'ticket_ok') from public.push_deliveries where id in ($(ids_de "$TMP/m.txt"))")" "3/7" "las siete vigentes guardan su ticket y las tres canceladas lo ignoran"
psql_ -c "update public.push_installations set permission = 'granted' where expo_push_token like 'ExpoPushToken[conc%'" > /dev/null

# 6c. La solicitud se aprueba (desde otra conexión) con los envíos reservados.
reiniciar_entregas
reservar_a_archivo 10 "$TMP/n.txt"
psql_ -c "update public.device_members set is_authorized = true where device_id = '$EQUIPO' and user_id = '$SOLICITANTE'" > /dev/null
verifica "$(consulta "$SERVICIO select count(*) from public.reserve_push_deliveries(100)" | tail -1)" 0 "resuelta la solicitud, nadie reserva de nuevo sus avisos"
verifica "$(consulta "select count(*) from public.push_deliveries where id in ($(ids_de "$TMP/n.txt")) and state = 'cancelled'")" 10 "aprobar la solicitud cancela los diez envíos en vuelo"
ticket_tardio "$TMP/n.txt" TICKET-MEMB
verifica "$(consulta "select count(*) from public.push_deliveries where id in ($(ids_de "$TMP/n.txt")) and ticket_id is not null")" 0 "ningún ticket tardío revive un envío de una solicitud resuelta"

echo
echo "== Limpieza =="
# limpiar corre al salir (también si algo falla a medias) y decide el código de salida.
exit 0

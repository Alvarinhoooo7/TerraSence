-- =============================================================================
-- QR DE ACCESO: 5 MINUTOS COMPLETOS DESDE QUE SE GENERA
-- =============================================================================
-- Hasta aquí el token vencía en el siguiente cuarto de hora del reloj del
-- servidor (:00, :15, :30, :45): un QR generado a las 10:14:50 duraba 10 s.
-- Ahora cada token nuevo dura 5 minutos contados desde que se genera, sin
-- alinearse al reloj.
--
-- Mientras un token está vigente, todos los miembros del equipo ven el mismo
-- (una fila por equipo en device_access_invites); al vencer, la siguiente
-- consulta genera otro con 5 minutos completos. El código que la app muestra
-- debajo del QR es ese mismo token y vence con él.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_device_access_qr(p_device_id uuid)
 RETURNS TABLE(token uuid, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM 1 FROM public.devices WHERE id = p_device_id FOR UPDATE;
  IF NOT public.has_device_access(p_device_id) THEN
    RAISE EXCEPTION 'Debes ser un miembro aprobado del equipo.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.device_access_invites AS invitation(device_id, expires_at)
    VALUES(p_device_id, clock_timestamp() + interval '5 minutes')
    ON CONFLICT (device_id) DO UPDATE SET token = gen_random_uuid(), expires_at = EXCLUDED.expires_at
    WHERE invitation.expires_at <= clock_timestamp();
  RETURN QUERY SELECT i.token, i.expires_at FROM public.device_access_invites i WHERE i.device_id = p_device_id;
END $function$;

DO $$
DECLARE v_src text := (SELECT prosrc FROM pg_proc WHERE oid = 'public.get_device_access_qr(uuid)'::regprocedure);
BEGIN
  IF v_src LIKE '%/ 900%' OR v_src NOT LIKE '%interval ''5 minutes''%' THEN
    RAISE EXCEPTION 'get_device_access_qr no quedó con 5 minutos desde la generación.';
  END IF;
  IF has_function_privilege('anon', 'public.get_device_access_qr(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.get_device_access_qr(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Permisos de get_device_access_qr alterados.';
  END IF;
END $$;

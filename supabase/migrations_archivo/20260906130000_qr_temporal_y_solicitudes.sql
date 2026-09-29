BEGIN;
ALTER TABLE public.push_alerts ADD COLUMN event_type TEXT;
ALTER TABLE public.push_alerts ADD COLUMN requester_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE TABLE public.device_access_invites (
  device_id UUID PRIMARY KEY REFERENCES public.devices(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.device_access_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.device_access_invites FROM anon, authenticated;

CREATE FUNCTION public.get_device_access_qr(p_device_id UUID)
RETURNS TABLE(token UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_expiry TIMESTAMPTZ;
BEGIN
  PERFORM 1 FROM public.devices WHERE id = p_device_id FOR UPDATE;
  IF NOT public.has_device_access(p_device_id) THEN
    RAISE EXCEPTION 'Debes ser un miembro aprobado del equipo.' USING ERRCODE = '42501';
  END IF;
  v_expiry := to_timestamp((floor(extract(epoch FROM clock_timestamp()) / 900) + 1) * 900);
  INSERT INTO public.device_access_invites AS invitation(device_id, expires_at) VALUES(p_device_id, v_expiry)
    ON CONFLICT (device_id) DO UPDATE SET token = gen_random_uuid(), expires_at = EXCLUDED.expires_at
    WHERE invitation.expires_at <= clock_timestamp();
  RETURN QUERY SELECT i.token, i.expires_at FROM public.device_access_invites i WHERE i.device_id = p_device_id;
END $$;
REVOKE ALL ON FUNCTION public.get_device_access_qr(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_device_access_qr(UUID) TO authenticated;

-- El ID estable identifica al hardware y sirve al buscador del backoffice.
-- No es una invitación: se cierra la entrada antigua para evitar saltar el QR.
REVOKE ALL ON FUNCTION public.join_device_by_code(TEXT) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.join_device_by_invite(p_token UUID)
RETURNS TABLE(device_id UUID, device_name TEXT, is_authorized BOOLEAN, role TEXT, alert_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_device public.devices; v_new BOOLEAN; v_alert UUID; v_admin UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida.' USING ERRCODE = '42501'; END IF;
  SELECT d.* INTO v_device FROM public.devices d JOIN public.device_access_invites i ON i.device_id = d.id
    WHERE i.token = p_token FOR UPDATE OF d;
  -- Se revisa la vigencia después de tomar el bloqueo; reset y rotación pueden
  -- haber invalidado la invitación mientras esta petición estaba esperando.
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.device_access_invites i
      WHERE i.device_id = v_device.id AND i.token = p_token AND i.expires_at > clock_timestamp()) THEN
    RAISE EXCEPTION 'El QR venció o dejó de ser válido. Pide que te muestren el QR actual.' USING ERRCODE = '22023';
  END IF;
  SELECT dm.user_id INTO v_admin FROM public.device_members dm
    WHERE dm.device_id = v_device.id AND dm.role = 'admin' AND dm.is_authorized;
  IF v_admin IS NULL THEN RAISE EXCEPTION 'Este equipo debe vincularse primero por Bluetooth.' USING ERRCODE = '22023'; END IF;
  v_new := NOT EXISTS(SELECT 1 FROM public.device_members dm WHERE dm.device_id = v_device.id AND dm.user_id = auth.uid());
  INSERT INTO public.device_members(device_id, user_id, role, is_authorized)
    VALUES(v_device.id, auth.uid(), 'user', FALSE) ON CONFLICT DO NOTHING;
  IF v_new THEN
    INSERT INTO public.push_alerts(device_id, user_id, title, body, category, severity, event_type, requester_user_id)
      VALUES(v_device.id, v_admin, 'Solicitud de acceso al equipo',
        'Un usuario espera tu aprobación. Abre Ajustes > Administración para revisar la solicitud.', 'device', 'warning', 'access_request', auth.uid())
      RETURNING id INTO v_alert;
  END IF;
  RETURN QUERY SELECT v_device.id, v_device.name::TEXT, dm.is_authorized, dm.role::TEXT, v_alert
    FROM public.device_members dm WHERE dm.device_id = v_device.id AND dm.user_id = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.join_device_by_invite(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_device_by_invite(UUID) TO authenticated;

CREATE FUNCTION public.list_my_pending_device_requests()
RETURNS TABLE(device_id UUID, administrator_name TEXT, administrator_email TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pending.device_id,
    COALESCE((SELECT string_agg(left(part, 1) || 'xxxxx', ' ' ORDER BY ordinal)
      FROM regexp_split_to_table(trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), '\s+')
        WITH ORDINALITY AS words(part, ordinal) WHERE part <> ''), 'Administrador'),
    CASE WHEN u.email IS NULL THEN '' ELSE left(split_part(u.email, '@', 1), 1) || 'xxxxxxxx@' ||
      left(split_part(u.email, '@', 2), 1) || 'xxxxxxxx' END
  FROM public.device_members pending
    JOIN public.device_members administrator ON administrator.device_id = pending.device_id
      AND administrator.role = 'admin' AND administrator.is_authorized
    LEFT JOIN public.profiles p ON p.id = administrator.user_id
    LEFT JOIN auth.users u ON u.id = administrator.user_id
  WHERE pending.user_id = auth.uid() AND pending.is_authorized IS FALSE;
$$;
REVOKE ALL ON FUNCTION public.list_my_pending_device_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_pending_device_requests() TO authenticated;

CREATE FUNCTION public.invalidate_empty_device_invite()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.device_members WHERE device_id = OLD.device_id) THEN
    DELETE FROM public.device_access_invites WHERE device_id = OLD.device_id;
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER trg_invalidate_empty_device_invite AFTER DELETE ON public.device_members
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_empty_device_invite();
COMMIT;

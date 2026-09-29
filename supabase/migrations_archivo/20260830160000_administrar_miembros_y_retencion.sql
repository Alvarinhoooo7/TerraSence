-- TerraSense: administración auditable de miembros y mantenimiento de datos efímeros.
CREATE TABLE IF NOT EXISTS public.device_member_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('authorize', 'revoke', 'set_role', 'transfer_owner')),
    previous_role TEXT,
    new_role TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS device_member_audit_device_created_idx
    ON public.device_member_audit (device_id, created_at DESC);
ALTER TABLE public.device_member_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ts_member_audit_select_admin" ON public.device_member_audit
    FOR SELECT TO authenticated USING (public.has_device_admin_access(device_id));

CREATE OR REPLACE FUNCTION public.list_device_members(p_device_id UUID)
RETURNS TABLE (user_id UUID, full_name TEXT, email TEXT, role TEXT, is_authorized BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
    IF NOT public.has_device_admin_access(p_device_id) THEN
        RAISE EXCEPTION 'No tienes permisos para administrar este equipo.' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
    SELECT dm.user_id, COALESCE(p.full_name, ''), COALESCE(u.email::TEXT, ''),
           dm.role::TEXT, COALESCE(dm.is_authorized, TRUE)
      FROM public.device_members dm
      LEFT JOIN public.profiles p ON p.id = dm.user_id
      LEFT JOIN auth.users u ON u.id = dm.user_id
     WHERE dm.device_id = p_device_id
     ORDER BY CASE dm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
              COALESCE(p.full_name, u.email, '');
END; $$;
REVOKE ALL ON FUNCTION public.list_device_members(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_device_members(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.manage_device_member(
    p_device_id UUID, p_target_user_id UUID, p_action TEXT, p_role TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_actor UUID := auth.uid(); v_actor_role TEXT; v_target_role TEXT; v_authorized BOOLEAN;
BEGIN
    SELECT role INTO v_actor_role FROM public.device_members
     WHERE device_id = p_device_id AND user_id = v_actor AND COALESCE(is_authorized, TRUE);
    IF v_actor_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'No tienes permisos para administrar este equipo.' USING ERRCODE = '42501';
    END IF;
    SELECT role, COALESCE(is_authorized, TRUE) INTO v_target_role, v_authorized
      FROM public.device_members WHERE device_id = p_device_id AND user_id = p_target_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'La membresía indicada no existe.' USING ERRCODE = 'P0002'; END IF;
    IF p_target_user_id = v_actor AND p_action <> 'transfer_owner' THEN
        RAISE EXCEPTION 'No puedes modificar tu propia membresía.' USING ERRCODE = '22023';
    END IF;
    IF v_target_role = 'owner' AND p_action <> 'transfer_owner' THEN
        RAISE EXCEPTION 'La propiedad sólo se modifica mediante una transferencia.' USING ERRCODE = '42501';
    END IF;
    IF v_actor_role = 'admin' AND (v_target_role = 'admin' OR p_role = 'admin' OR p_action = 'transfer_owner') THEN
        RAISE EXCEPTION 'Sólo el propietario puede administrar administradores.' USING ERRCODE = '42501';
    END IF;
    IF p_action = 'authorize' THEN
        UPDATE public.device_members SET is_authorized = TRUE WHERE device_id = p_device_id AND user_id = p_target_user_id;
    ELSIF p_action = 'revoke' THEN
        UPDATE public.device_members SET is_authorized = FALSE WHERE device_id = p_device_id AND user_id = p_target_user_id;
    ELSIF p_action = 'set_role' THEN
        IF p_role NOT IN ('admin', 'operator') THEN RAISE EXCEPTION 'Rol inválido.' USING ERRCODE = '22023'; END IF;
        UPDATE public.device_members SET role = p_role WHERE device_id = p_device_id AND user_id = p_target_user_id;
    ELSIF p_action = 'transfer_owner' THEN
        IF v_actor_role <> 'owner' OR p_target_user_id = v_actor OR NOT v_authorized THEN
            RAISE EXCEPTION 'La propiedad sólo puede transferirse a otro miembro autorizado.' USING ERRCODE = '42501';
        END IF;
        UPDATE public.device_members SET role = 'admin' WHERE device_id = p_device_id AND user_id = v_actor;
        UPDATE public.device_members SET role = 'owner' WHERE device_id = p_device_id AND user_id = p_target_user_id;
    ELSE RAISE EXCEPTION 'Acción inválida.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.device_member_audit(device_id, actor_user_id, target_user_id, action, previous_role, new_role)
    VALUES (p_device_id, v_actor, p_target_user_id, p_action, v_target_role,
      CASE WHEN p_action = 'set_role' THEN p_role WHEN p_action = 'transfer_owner' THEN 'owner' ELSE v_target_role END);
END; $$;
REVOKE ALL ON FUNCTION public.manage_device_member(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_device_member(UUID, UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.purge_expired_operational_data()
RETURNS TABLE (join_attempts_deleted BIGINT, audit_rows_deleted BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_join BIGINT; v_audit BIGINT;
BEGIN
    DELETE FROM public.device_join_attempts WHERE attempted_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_join = ROW_COUNT;
    DELETE FROM public.device_member_audit WHERE created_at < NOW() - INTERVAL '2 years';
    GET DIAGNOSTICS v_audit = ROW_COUNT;
    RETURN QUERY SELECT v_join, v_audit;
END; $$;
REVOKE ALL ON FUNCTION public.purge_expired_operational_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_operational_data() TO service_role;

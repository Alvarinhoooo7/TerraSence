-- Verificación no sensible (no imprime contraseñas ni hashes) de que el
-- usuario creado en 20260902180000_alta_usuario_alvaro.local.sql quedó
-- operativo: confirmado, con hash bcrypt válido, e is_support_staff() en
-- verdadero para su sesión.
DO $$
DECLARE
    v_uid   UUID;
    v_ok    BOOLEAN;
    v_staff BOOLEAN;
BEGIN
    SELECT id INTO v_uid FROM auth.users WHERE email = 'alvarovillena8@gmail.com';
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'No se encontró el usuario.';
    END IF;

    SELECT (email_confirmed_at IS NOT NULL)
           AND (encrypted_password LIKE '$2%')
           AND (length(encrypted_password) > 50)
      INTO v_ok
      FROM auth.users WHERE id = v_uid;

    SELECT EXISTS (
        SELECT 1 FROM public.admin_support_users WHERE user_id = v_uid AND is_active
    ) INTO v_staff;

    RAISE NOTICE 'usuario % -> confirmado y hash bcrypt válido = %, admin_support_users activo = %',
        v_uid, v_ok, v_staff;

    IF NOT v_ok OR NOT v_staff THEN
        RAISE EXCEPTION 'Verificación fallida.';
    END IF;
END $$;

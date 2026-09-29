-- =============================================================================
-- BACKOFFICE DE CUENTA ÚNICA
-- =============================================================================
-- Sólo akurasoporte@gmail.com entra al backoffice. La regla vive aquí y no en
-- la web: el paquete de la web es público y no debe delatar qué cuenta sirve,
-- y una comprobación sólo de interfaz se salta llamando a la API directamente.
--
--   1. is_support_staff() exige la fila activa de soporte Y ese correo
--      confirmado. Todas las funciones del backoffice pasan por ella.
--   2. Se retiran las demás cuentas de soporte y el alta por código de
--      invitación (support_self_register y su rotación): ya no hay forma de
--      sumarse al backoffice desde fuera de la base.
--   3. Alta de la cuenta SIN contraseña. El primer ingreso se hace por
--      «Recuperar acceso», así la contraseña no queda escrita en ninguna
--      migración ni en el historial remoto de Supabase.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_support_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.admin_support_users s
      JOIN auth.users u ON u.id = s.user_id
     WHERE s.user_id = auth.uid()
       AND s.is_active IS TRUE
       AND lower(u.email) = 'akurasoporte@gmail.com'
       AND u.email_confirmed_at IS NOT NULL
  );
$$;
COMMENT ON FUNCTION public.is_support_staff() IS
  'Puerta de todo el backoffice: true sólo para la cuenta akurasoporte@gmail.com confirmada y activa en admin_support_users.';

-- Alta por código de invitación y gestión de personal: fuera.
DROP FUNCTION IF EXISTS public.support_self_register(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_rotate_invite_code(TEXT);
DROP FUNCTION IF EXISTS public.admin_set_staff_active(UUID, BOOLEAN);
DROP TABLE IF EXISTS public.admin_support_invite;
DROP TABLE IF EXISTS public.support_register_attempts;

DELETE FROM public.admin_support_users WHERE lower(email) <> 'akurasoporte@gmail.com';

-- Alta de la cuenta, idempotente: si ya existe (por ejemplo, creada desde la
-- app) sólo se confirma el correo y se enlaza.
DO $$
DECLARE
    v_email CONSTANT TEXT := 'akurasoporte@gmail.com';
    v_uid   UUID;
BEGIN
    SELECT id INTO v_uid FROM auth.users WHERE lower(email) = v_email;

    IF v_uid IS NULL THEN
        v_uid := gen_random_uuid();
        -- encrypted_password vacío: ninguna contraseña coincide hasta que se
        -- elija una por «Recuperar acceso».
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, confirmation_token, recovery_token,
            email_change_token_new, email_change, email_change_token_current,
            phone_change, phone_change_token, reauthentication_token,
            raw_app_meta_data, raw_user_meta_data,
            is_super_admin, is_sso_user, is_anonymous,
            created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_uid, 'authenticated', 'authenticated', v_email, '',
            NOW(), '', '', '', '', '', '', '', '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"first_name":"Soporte","last_name":"TerraSense"}'::jsonb,
            FALSE, FALSE, FALSE,
            NOW(), NOW()
        );
        INSERT INTO auth.identities (
            id, provider_id, user_id, identity_data, provider,
            last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_uid::TEXT, v_uid,
            jsonb_build_object('sub', v_uid::TEXT, 'email', v_email, 'email_verified', TRUE),
            'email', NULL, NOW(), NOW()
        );
    ELSE
        UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()) WHERE id = v_uid;
    END IF;

    DELETE FROM public.admin_support_users WHERE user_id IS DISTINCT FROM v_uid;
    INSERT INTO public.admin_support_users (user_id, email, full_name, is_active)
    VALUES (v_uid, v_email, 'Soporte TerraSense', TRUE);
END $$;

-- Para la Edge Function backoffice-recover: decide si un correo recibe el
-- código de recuperación. Sólo la invoca la clave de servicio.
CREATE OR REPLACE FUNCTION public.is_backoffice_email(p_email TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.admin_support_users s
      JOIN auth.users u ON u.id = s.user_id
     WHERE s.is_active IS TRUE
       AND lower(u.email) = 'akurasoporte@gmail.com'
       AND lower(u.email) = lower(trim(COALESCE(p_email, '')))
  );
$$;
REVOKE ALL ON FUNCTION public.is_backoffice_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_backoffice_email(TEXT) TO service_role;

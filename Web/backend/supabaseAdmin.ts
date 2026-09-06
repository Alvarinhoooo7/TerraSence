// Web/backend/supabaseAdmin.ts
//
// Mismo patrón que Web/src/services/supabase.ts: un único cliente, mismas
// variables de entorno (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) porque el
// panel de soporte vive en el MISMO proyecto Supabase que la app y la consola
// de agricultores — comparte auth.users, sólo cambia qué puede hacer cada
// sesión una vez autenticada (ver is_support_staff() en la migración
// 20260902120000_panel_soporte_backend.sql).
//
// Nunca uses aquí la service_role key: este archivo se empaqueta para el
// navegador. Todo lo que expone este panel pasa por RPC SECURITY DEFINER que
// comprueban is_support_staff() en el servidor.
//
// IMPORTANTE — una sola instancia de GoTrue:
// Este módulo NO crea un segundo cliente. Dos `createClient` en la misma
// pestaña levantan dos instancias de GoTrue compitiendo por la misma clave de
// `localStorage`; Supabase avisa de ello por consola y el resultado es que un
// refresco de token disparado por una instancia puede dejar a la otra con una
// sesión obsoleta, lo que en el panel se manifiesta como un `42501` espurio a
// mitad de sesión. Reutilizamos el cliente de la consola y sólo le aplicamos
// los tipos generados de la base.

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../src/services/supabase';
import type { Database } from './database.types';

export const supabaseAdmin = supabase as unknown as SupabaseClient<Database>;

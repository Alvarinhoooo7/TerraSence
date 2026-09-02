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

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  console.warn(
    '[TerraSense · Soporte] Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabaseAdmin = createClient<Database>(url ?? '', key ?? '');

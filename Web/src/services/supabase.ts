import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  console.warn(
    '[TerraSense] Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Crea Web/.env a partir de Web/.env.example.',
  );
}

// Usamos valores por defecto seguros para que createClient no crashee toda la app de React en blanco/negro
export const supabase = createClient(
  url || 'https://dummy.supabase.co',
  key || 'dummy-key'
);

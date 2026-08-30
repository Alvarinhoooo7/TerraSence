// src/services/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const extra = Constants.expoConfig?.extra ?? {};

const supabaseUrl =
  (extra.supabaseUrl as string | undefined) ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  (extra.supabaseAnonKey as string | undefined) ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fallo ruidoso en desarrollo: es preferible a una pantalla en blanco.
  console.warn(
    '[TerraSense] Falta EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Crea App/.env a partir de App/.env.example.',
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // React Native no tiene URL de navegador que parsear.
    detectSessionInUrl: false,
  },
});

// React Native no mantiene timers fiables cuando queda en segundo plano.
// Detener y reanudar el refresco evita sesiones caducadas o trabajo innecesario.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

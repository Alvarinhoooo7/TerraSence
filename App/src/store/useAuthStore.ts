import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  isHydrated: boolean;
  setSession: (session: Session | null) => void;
  setHydrated: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      isHydrated: false,
      setSession: (session) => set({ session }),
      setHydrated: () => set({ isHydrated: true }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);

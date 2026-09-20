import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  isHydrated: boolean;
  recoveryUserId: string | null;
  setRecoveryUserId: (id: string | null) => void;
  setSession: (session: Session | null) => void;
  setHydrated: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      isHydrated: false,
      recoveryUserId: null,
      setRecoveryUserId: (id) => set({ recoveryUserId: id }),
      setSession: (session) => set({ session }),
      setHydrated: () => set({ isHydrated: true }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ session: state.session, recoveryUserId: state.recoveryUserId }),
      onRehydrateStorage: () => (state) => {
        // También libera el arranque si el almacenamiento está dañado/no disponible.
        if (state) state.setHydrated();
        else queueMicrotask(() => useAuthStore.setState({ isHydrated: true }));
      },
    }
  )
);

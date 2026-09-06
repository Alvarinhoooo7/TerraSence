import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import { isSupportStaff } from '../backend/adminApi';
import { AuthScreen } from './components/AuthScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { SupportOnboarding } from './components/SupportOnboarding';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DevicesPage } from './pages/DevicesPage';
import { FirmwarePage } from './pages/FirmwarePage';
import { SupportPanelPage } from './pages/SupportPanelPage';
import { SupportStaffPage } from './pages/SupportStaffPage';
import { SupportDeviceDetailPage } from './pages/SupportDeviceDetailPage';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [recovering, setRecovering] = useState(false);

  // `null` mientras no se ha resuelto: distinguirlo de `false` evita mostrar
  // la pantalla de alta de soporte durante el parpadeo inicial a quien sí
  // tiene acceso.
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshStaff = useCallback(() => {
    if (!session) {
      setIsStaff(null);
      return;
    }
    isSupportStaff()
      .then(setIsStaff)
      .catch(() => setIsStaff(false));
  }, [session]);

  useEffect(() => {
    refreshStaff();
  }, [refreshStaff]);

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-terra-bg text-terra-primary transition-colors duration-500">
        <div className="h-12 w-12 border-4 border-terra-primary border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-terra-muted animate-pulse">Iniciando plataforma...</span>
      </div>
    );
  }

  if (recovering) {
    return <ResetPasswordScreen onDone={() => setRecovering(false)} />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (isStaff === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-terra-bg text-terra-primary transition-colors duration-500">
        <div className="h-12 w-12 border-4 border-terra-primary border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-terra-muted animate-pulse">Comprobando permisos de soporte...</span>
      </div>
    );
  }

  // Sesión válida sin pertenencia al panel: la consola es exclusivamente un
  // backoffice, así que la alternativa útil es darse de alta con el código de
  // invitación, no aterrizar en un inventario vacío por RLS.
  if (!isStaff) {
    return (
      <SupportOnboarding
        email={session.user.email ?? ''}
        onActivated={refreshStaff}
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardLayout email={session.user.email ?? ''} />}>
        <Route index element={<Navigate to="/admin" replace />} />
        <Route path="admin" element={<SupportPanelPage />} />
        <Route path="admin/devices/:id" element={<SupportDeviceDetailPage />} />
        <Route path="admin/staff" element={<SupportStaffPage />} />
        <Route path="firmware" element={<FirmwarePage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}

import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import { AuthScreen } from './components/AuthScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DevicesPage } from './pages/DevicesPage';
import { SupportPanelPage } from './pages/SupportPanelPage';
import { SupportDeviceDetailPage } from './pages/SupportDeviceDetailPage';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [recovering, setRecovering] = useState(false);

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

  return (
    <Routes>
      <Route path="/" element={<DashboardLayout email={session.user.email ?? ''} />}>
        <Route index element={<Navigate to="/devices" replace />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="admin" element={<SupportPanelPage />} />
        <Route path="admin/devices/:id" element={<SupportDeviceDetailPage />} />
        <Route path="*" element={<Navigate to="/devices" replace />} />
      </Route>
    </Routes>
  );
}

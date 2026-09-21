import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import { isSupportStaff } from '../backend/adminApi';
import { AccountConfirmed } from './components/AccountConfirmed';
import { AuthScreen } from './components/AuthScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { SupportOnboarding } from './components/SupportOnboarding';
import { DashboardLayout } from './layouts/DashboardLayout';
import { FirmwarePage } from './pages/FirmwarePage';
import { FleetPage } from './pages/FleetPage';
import { MeasurementsPage } from './pages/MeasurementsPage';
import { SupportDeviceDetailPage } from './pages/SupportDeviceDetailPage';
import { SupportPanelPage } from './pages/SupportPanelPage';
import { SupportStaffPage } from './pages/SupportStaffPage';
import { ValidationPage } from './pages/ValidationPage';
import { FullPageLoader } from './ui/Feedback';

/** Compatibilidad temporal con correos de confirmación enviados antes de usar códigos. */
const CONFIRMED_PATH = '/cuenta-confirmada';
const RECOVERY_KEY = 'terrasense-recovery-user';

const recoveryUser = () => {
  try {
    return localStorage.getItem(RECOVERY_KEY);
  } catch {
    return null;
  }
};

const saveRecoveryUser = (id: string | null) => {
  try {
    if (id) localStorage.setItem(RECOVERY_KEY, id);
    else localStorage.removeItem(RECOVERY_KEY);
  } catch {
    /* Almacenamiento no disponible. */
  }
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [recovering, setRecovering] = useState(false);

  // `null` mientras no se ha resuelto: distinguirlo de `false` evita mostrar
  // la pantalla de alta de soporte durante el parpadeo inicial a quien sí
  // tiene acceso.
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && recoveryUser() === data.session.user.id) setRecovering(true);
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        saveRecoveryUser(s?.user.id ?? null);
        setRecovering(true);
      } else if (event === 'SIGNED_OUT') {
        saveRecoveryUser(null);
      }
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

  // Ruta pública de aterrizaje del correo de confirmación. Va antes que
  // `checking`, `recovering` y la comprobación de soporte a propósito: quien
  // llega aquí es un agricultor, no personal del backoffice, y cualquiera de
  // esas ramas lo llevaría a una pantalla que no le corresponde.
  if (window.location.pathname === CONFIRMED_PATH) {
    return <AccountConfirmed />;
  }

  if (checking) {
    return <FullPageLoader label="Iniciando la consola…" />;
  }

  if (recovering) {
    return (
      <ResetPasswordScreen
        onDone={() => {
          saveRecoveryUser(null);
          setRecovering(false);
        }}
      />
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (isStaff === null) {
    return <FullPageLoader label="Comprobando permisos de soporte…" />;
  }

  // Sesión válida sin pertenencia al panel: la consola es exclusivamente un
  // backoffice, así que la alternativa útil es darse de alta con el código de
  // invitación, no aterrizar en un inventario vacío por RLS.
  if (!isStaff) {
    return <SupportOnboarding email={session.user.email ?? ''} onActivated={refreshStaff} />;
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardLayout email={session.user.email ?? ''} />}>
        <Route index element={<Navigate to="/admin" replace />} />
        <Route path="admin" element={<SupportPanelPage />} />
        <Route path="admin/devices/:id" element={<SupportDeviceDetailPage />} />
        <Route path="admin/staff" element={<SupportStaffPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="measurements" element={<MeasurementsPage />} />
        <Route path="firmware" element={<FirmwarePage />} />
        <Route path="validation" element={<ValidationPage />} />
        {/* `/devices` fue el nombre anterior del inventario; los enlaces
            guardados por el equipo de soporte siguen funcionando. */}
        <Route path="devices" element={<Navigate to="/fleet" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}

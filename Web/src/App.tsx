// src/App.tsx — rutas según la sesión.
//
// Sin la sesión de soporte sólo existen /ingresar y /recuperar-acceso; toda
// otra URL lleva a /ingresar. Con ella, el backoffice: Buscar, Equipo y Update.

import { Navigate, Route, Routes } from 'react-router-dom';
import { LOGIN_PATH, LoginPage, RECOVER_PATH } from './auth/LoginPage';
import { RecoverPage } from './auth/RecoverPage';
import { useSession } from './auth/session';
import { Shell } from './layout/Shell';
import { DevicePage } from './pages/DevicePage';
import { SearchPage } from './pages/SearchPage';
import { UpdatePage } from './pages/UpdatePage';
import { FullPageLoader } from './ui/Feedback';

export default function App() {
  const { status, recovering } = useSession();

  // A mitad de la recuperación la sesión recién verificada aún no tiene
  // contraseña: se queda en el flujo hasta elegirla. Ambas ramas comparten el
  // mismo <Routes>, así la pantalla de recuperación no se vuelve a montar (y
  // no pierde lo escrito) cuando `recovering` cambia.
  if (status === 'checking' && !recovering) return <FullPageLoader />;

  if (status !== 'in' || recovering) {
    return (
      <Routes>
        <Route path={LOGIN_PATH} element={recovering ? <Navigate to={RECOVER_PATH} replace /> : <LoginPage />} />
        <Route path={RECOVER_PATH} element={<RecoverPage />} />
        <Route path="*" element={<Navigate to={recovering ? RECOVER_PATH : LOGIN_PATH} replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/buscar" element={<SearchPage />} />
        <Route path="/equipo/:id" element={<DevicePage />} />
        <Route path="/update" element={<UpdatePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/buscar" replace />} />
    </Routes>
  );
}

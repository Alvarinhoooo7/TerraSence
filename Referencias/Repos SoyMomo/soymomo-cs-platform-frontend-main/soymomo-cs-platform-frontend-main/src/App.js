import { Navigate, Route, Routes, useLocation } from "react-router-dom";
// import PrivateRoute from "./components/PrivateRoute";
import React from 'react';
import Login from './pages/Login'
import UnifiedSearch from './pages/UnifiedSearch'
import WearerDashboard from "./pages/WearerDashboard";
import TabletDashboard from "./pages/TabletDashboard";
import Tools from "./pages/Tools";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";
import './App.css';
import AuthProvider from "./authContext";
import SimDashboard from "./pages/SimDashboard";


// /sim y /tablet se unificaron con la búsqueda de relojes. Se conserva el query
// string para que los links con ?searchTxt= sigan funcionando.
function RedirectToSearch() {
  const { search } = useLocation();
  return <Navigate to={`/${search}`} replace />;
}

function App() {

  // const [tokens, setTokens] = useState(null)

  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/" element={<UnifiedSearch/>}/>
          <Route path="/wearer" element={<WearerDashboard/>}/>
          <Route path="/sim/dashboard" element={<SimDashboard/>}/>
          <Route path="/sim" element={<RedirectToSearch/>}/>
          <Route path="/tablet/dashboard" element={<TabletDashboard/>}/>
          <Route path="/tablet" element={<RedirectToSearch/>}/>
          <Route path="/herramientas" element={<Tools/>}/>
          <Route path="/change-password" element={<ChangePassword/>}/>
          <Route path="*" element={<NotFound/>} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;

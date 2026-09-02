import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { isSupportStaff } from '../../backend/adminApi';
import { useEffect, useState } from 'react';
import { Leaf, Cpu, LogOut, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';

const NAV_ITEMS = [
  { path: '/devices', label: 'Equipos', icon: Cpu },
];

export function DashboardLayout({ email }: { email: string }) {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    isSupportStaff().then(setIsAdmin).catch(() => setIsAdmin(false));
  }, []);

  return (
    <div className="flex h-screen w-full bg-terra-bg overflow-hidden text-terra-text">
      
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 glass-panel border-r border-terra-border flex flex-col z-20 shrink-0"
      >
        <div className="h-16 flex items-center px-6 gap-3 border-b border-terra-border">
          <div className="bg-terra-primary/10 p-2 rounded-lg text-terra-primary">
            <Leaf size={24} />
          </div>
          <span className="font-bold text-lg tracking-wide">TerraSense</span>
        </div>

        <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                ${isActive 
                  ? 'bg-terra-primary/15 text-terra-primary border border-terra-primary/30 shadow-[0_0_15px_rgba(18,210,113,0.1)]' 
                  : 'text-terra-muted hover:text-terra-text hover:bg-terra-surface hover:border-transparent border border-transparent'
                }
              `}
            >
              <item.icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="my-2 border-t border-terra-border/50" />
              <NavLink
                to="/admin"
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold
                  ${isActive 
                    ? 'bg-verdict-amber/15 text-verdict-amber border border-verdict-amber/30 shadow-[0_0_15px_rgba(242,169,59,0.1)]' 
                    : 'text-verdict-amber/70 hover:text-verdict-amber hover:bg-terra-surface hover:border-transparent border border-transparent'
                  }
                `}
              >
                <ShieldAlert size={20} />
                <span className="font-medium text-sm">Panel de Soporte</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-terra-border">
          <div className="bg-terra-surface rounded-xl p-4 border border-terra-border/50 flex flex-col gap-3">
            <span className="text-xs text-terra-muted truncate block" title={email}>
              {email}
            </span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium text-verdict-red bg-verdict-red/10 hover:bg-verdict-red/20 transition-colors"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 glass-panel border-b border-terra-border flex items-center justify-between px-8 shrink-0 transition-colors duration-500">
          <div className="flex items-center gap-2 text-sm text-terra-muted font-medium">
             Consola Unificada
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="h-8 w-8 rounded-full bg-terra-surface border border-terra-border flex items-center justify-center text-terra-primary shadow-sm">
              <span className="text-xs font-bold uppercase">{email.substring(0, 2)}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

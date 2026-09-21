// src/layouts/DashboardLayout.tsx — el armazón del backoffice.
//
// El layout sólo se monta para personal de soporte: App.tsx ya resolvió
// `is_support_staff()` y desvía al alta de soporte a quien no lo sea. Repetir
// la comprobación aquí añadía una llamada a Postgres por cada montaje del
// shell sin decidir nada nuevo.

import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Cpu,
  FlaskConical,
  HardDriveDownload,
  LogOut,
  Menu,
  ShieldAlert,
  Sprout,
  Users,
  X,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { supabase } from '../services/supabase';
import { BrandLogo } from '../components/BrandLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../ui/Button';

interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<LucideProps>;
  /** Sólo para `/admin`: es prefijo de `/admin/staff`. */
  end?: boolean;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operación',
    items: [
      { path: '/admin', label: 'Panel de soporte', icon: ShieldAlert, end: true },
      { path: '/fleet', label: 'Flota', icon: Cpu },
      { path: '/measurements', label: 'Mediciones', icon: Sprout },
    ],
  },
  {
    title: 'Catálogos',
    items: [
      { path: '/firmware', label: 'Firmware OTA', icon: HardDriveDownload },
      { path: '/validation', label: 'Validación de laboratorio', icon: FlaskConical },
    ],
  },
  {
    title: 'Administración',
    items: [{ path: '/admin/staff', label: 'Equipo de soporte', icon: Users }],
  },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-terra-primary-soft font-semibold text-terra-primary-ink'
      : 'text-terra-muted hover:bg-terra-raised hover:text-terra-text'
  }`;

export function DashboardLayout({ email }: { email: string }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Navegar cierra el panel lateral en móvil; si no, la pantalla nueva queda
  // tapada por el menú que acabas de usar.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const nav = (
    <nav aria-label="Secciones del backoffice" className="flex flex-1 flex-col gap-5 p-3">
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <h2 className="px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-terra-faint uppercase">
            {group.title}
          </h2>
          {group.items.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end} className={linkClass}>
              <item.icon size={16} aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-terra-border p-3">
      <p className="truncate px-3 pb-2 text-xs text-terra-muted" title={email}>
        {email}
      </p>
      <Button
        variant="ghost"
        size="sm"
        icon={LogOut}
        className="w-full justify-start"
        onClick={() => void supabase.auth.signOut()}
      >
        Cerrar sesión
      </Button>
    </div>
  );

  return (
    <div className="flex h-full w-full bg-terra-bg text-terra-text">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50
          focus:rounded-md focus:bg-terra-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Saltar al contenido
      </a>

      {/* Panel lateral fijo a partir de lg; cajón deslizante por debajo. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-terra-border
          bg-terra-surface transition-transform duration-200 lg:static lg:translate-x-0
          ${menuOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full'}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-terra-border px-4">
          <BrandLogo className="h-9 w-36" />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
            className="text-terra-muted hover:text-terra-text lg:hidden"
          >
            <X size={18} />
          </button>
        </div>
        {nav}
        {account}
      </aside>

      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-terra-border bg-terra-surface px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              className="text-terra-muted hover:text-terra-text lg:hidden"
            >
              <Menu size={20} />
            </button>
            <span className="truncate text-xs font-semibold tracking-wide text-terra-muted uppercase">
              Backoffice de soporte
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span
              className="grid h-8 w-8 place-items-center rounded-full border border-terra-border bg-terra-raised text-[11px] font-semibold text-terra-primary-ink uppercase"
              title={email}
              aria-hidden="true"
            >
              {email.slice(0, 2)}
            </span>
          </div>
        </header>

        <main id="contenido" className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

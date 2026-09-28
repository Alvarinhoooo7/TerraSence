// src/layout/Shell.tsx — armazón del backoffice.
//
// Barra lateral con tres opciones y nada más: Buscar, Update y Cerrar sesión.
// Fija a partir de 1024 px; por debajo, una barra superior abre un cajón.
// La barra usa la tinta del logotipo en los dos temas: ancla la marca y separa
// la navegación del área de trabajo sin necesidad de sombras.

import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, Search, UploadCloud, X } from 'lucide-react';
import { useSession } from '../auth/session';
import { BrandLogo } from '../ui/BrandLogo';

const NAV: { to: string; label: string; icon: ComponentType<LucideProps>; match: string[] }[] = [
  { to: '/buscar', label: 'Buscar', icon: Search, match: ['/buscar', '/equipo'] },
  { to: '/update', label: 'Update', icon: UploadCloud, match: ['/update'] },
];

const itemBase =
  'relative flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors';

export function Shell() {
  const { signOut } = useSession();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV.map((item) => {
        const active = item.match.some((m) => pathname.startsWith(m));
        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={`${itemBase} ${
              active ? 'bg-rail-active text-white' : 'text-rail-text hover:bg-rail-hover hover:text-white'
            }`}
          >
            {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-rail-accent" />}
            <item.icon size={18} aria-hidden="true" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );

  const logout = (
    <div className="border-t border-white/10 px-3 py-3">
      <button
        type="button"
        disabled={leaving}
        onClick={() => {
          setLeaving(true);
          void signOut();
        }}
        className={`${itemBase} text-rail-text hover:bg-rail-hover hover:text-white disabled:opacity-60`}
      >
        <LogOut size={18} aria-hidden="true" />
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <div className="flex h-full">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm"
      >
        Saltar al contenido
      </a>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-white/5 bg-rail transition-transform duration-200
          lg:static lg:translate-x-0 ${open ? 'translate-x-0 shadow-pop' : '-translate-x-full'}`}
      >
        <div className="flex h-20 items-center justify-between px-4">
          <BrandLogo inverse className="h-12 w-40" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="text-rail-muted hover:text-white lg:hidden"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {nav}
        {logout}
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-overlay lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={open}
            className="text-muted hover:text-ink"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <BrandLogo className="h-10 w-32" />
        </header>
        <main id="contenido" className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

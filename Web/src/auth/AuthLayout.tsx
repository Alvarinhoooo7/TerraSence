// src/auth/AuthLayout.tsx — armazón de todas las pantallas sin sesión.
//
// Dos columnas desde `lg`: a la izquierda la marca y qué es esta consola, a la
// derecha el formulario. Bajo `lg` queda sólo el formulario con el logotipo
// encima; el texto de marca no aporta nada a quien sólo quiere entrar.
//
// El panel de marca usa la tinta fija del logotipo en los dos temas. Las
// franjas del pie son los horizontes de suelo de la paleta: es lo que mide la
// sonda, no un adorno genérico.

import type { ReactNode } from 'react';
import { Cpu, HardDriveDownload, Sprout } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { ThemeToggle } from '../components/ThemeToggle';

const CAPABILITIES = [
  { icon: Cpu, text: 'Flota de sondas: batería, firmware y último reporte de cada equipo.' },
  { icon: Sprout, text: 'Mediciones de campo con sus diez variables y su diagnóstico.' },
  { icon: HardDriveDownload, text: 'Catálogo de firmware y validación de laboratorio.' },
];

/** Horizontes de suelo, de la superficie a la roca. */
const STRATA = ['#15803d', '#047857', '#94a3b8', '#cbd5e1'];

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Enlaces secundarios bajo el formulario (cambiar de pantalla). */
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-terra-bg lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-ink px-10 pt-10 pb-24 text-white lg:flex">
        {/* El SVG trae margen propio a la izquierda del isotipo; el -ml lo
            alinea con el borde del texto de abajo. */}
        <BrandLogo inverse className="-ml-2.5 h-24 w-64" />

        <div className="max-w-sm">
          <h2 className="text-2xl leading-snug font-semibold">Backoffice de soporte</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Consola interna del equipo TerraSense para atender las sondas que están en terreno.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {CAPABILITIES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm leading-relaxed text-white/85">
                <Icon size={18} className="mt-0.5 shrink-0 text-[#4ade80]" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="max-w-sm text-xs leading-relaxed text-white/55">
          Acceso sólo para el equipo de soporte. Los agricultores usan la app TerraSense en su
          teléfono.
        </p>

        <div className="absolute inset-x-0 bottom-0 flex flex-col" aria-hidden="true">
          {STRATA.map((color, i) => (
            <span key={color} style={{ background: color, height: 6 + i * 3, opacity: 0.55 }} />
          ))}
        </div>
      </aside>

      <main className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between p-4 sm:p-6">
          <BrandLogo className="-ml-1.5 h-14 w-44 lg:invisible" title="TerraSense" />
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
          <div className="w-full max-w-sm">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-terra-text">{title}</h1>
              {description && (
                <p className="mt-1.5 text-sm leading-relaxed text-terra-muted">{description}</p>
              )}
            </div>
            {children}
            {footer && <div className="mt-6 text-center text-sm text-terra-muted">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}

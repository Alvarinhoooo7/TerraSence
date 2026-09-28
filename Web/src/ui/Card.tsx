// src/ui/Card.tsx — contenedor de las tarjetas del equipo.
//
// Borde y fondo, sin sombra: las sombras quedan para lo que de verdad flota
// (el diálogo). Cada tarjeta tiene título, una línea opcional de contexto y sus
// acciones a la derecha, siempre en el mismo lugar.

import type { ReactNode } from 'react';

export function Card({
  title,
  description,
  actions,
  children,
  className = '',
  labelledBy,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`rounded-lg border border-line bg-surface ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 id={labelledBy} className="text-[15px] font-semibold text-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

// src/ui/PageHeader.tsx — el <h1> de cada pantalla y sus acciones.
//
// Un solo h1 por página, siempre el primero: es lo que un lector de pantalla
// usa para situarse tras navegar. Antes había pantallas con el título dentro
// de un <h1><BrandLogo/></h1> y otras sin encabezado de nivel 1.

import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

export function PageHeader({
  title,
  description,
  icon: Icon,
  tone = 'primary',
  actions,
  breadcrumb,
}: {
  title: string;
  description?: ReactNode;
  icon?: ComponentType<LucideProps>;
  tone?: 'primary' | 'support';
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span
              className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                tone === 'support'
                  ? 'bg-support-soft text-support'
                  : 'bg-terra-primary-soft text-terra-primary-ink'
              }`}
            >
              <Icon size={18} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-terra-text">{title}</h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-terra-muted">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

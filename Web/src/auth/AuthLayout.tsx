// src/auth/AuthLayout.tsx — marco de las pantallas sin sesión.
//
// Neutro a propósito: logo, título y formulario. Nada dice «backoffice» ni
// «soporte» antes de entrar. La franja superior repite las bandas de suelo del
// isotipo: es la única decoración y es de la marca.

import type { ReactNode } from 'react';
import { BrandLogo } from '../ui/BrandLogo';

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <BrandLogo className="mx-auto mb-8 block h-20 w-64" />
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div aria-hidden="true" className="flex h-1">
            <span className="flex-[3] bg-[#15803d]" />
            <span className="flex-[2] bg-[#22c55e]" />
            <span className="flex-[2] bg-[#94a3b8]" />
            <span className="flex-1 bg-[#cbd5e1]" />
          </div>
          <div className="px-6 pt-6 pb-7 sm:px-8">
            <h1 className="text-xl font-semibold text-ink">{title}</h1>
            {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
      </div>
    </main>
  );
}

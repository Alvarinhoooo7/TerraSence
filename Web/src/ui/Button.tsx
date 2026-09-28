// src/ui/Button.tsx
//
// El peso del botón dice qué hace: `primary` es la acción principal de la
// vista (una por vista), `secondary` las de apoyo, `ghost` las discretas y
// `danger` lo irreversible. `danger` es rojo suave a propósito: el reset es
// una acción rara y no debe competir con el resto de la tarjeta.

import type { ButtonHTMLAttributes, ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import { LoaderCircle } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary border-primary hover:bg-primary-hover hover:border-primary-hover',
  secondary: 'bg-surface text-ink border-line-strong hover:bg-hover',
  ghost: 'bg-transparent text-muted border-transparent hover:bg-hover hover:text-ink',
  danger: 'bg-danger-soft text-danger border-danger-line hover:border-danger',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-9 gap-2 px-3.5 text-sm',
  lg: 'h-11 gap-2 px-5 text-[15px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ComponentType<LucideProps>;
  /** Deshabilita el botón y cambia el icono por un indicador de espera. */
  busy?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  busy = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconSize = size === 'lg' ? 18 : 16;
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex shrink-0 items-center justify-center rounded-md border font-medium
        whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50
        ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {busy ? (
        <LoaderCircle size={iconSize} className="animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon size={iconSize} aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

// src/ui/Button.tsx
//
// Cuatro variantes y dos tamaños. El objetivo es que el peso visual de un
// botón diga qué hace: la acción principal de la pantalla es `primary`, las
// de apoyo son `secondary`, y `danger` está reservado a lo irreversible.
// Antes cada pantalla inventaba su combinación de clases y el botón «Buscar»
// del panel de soporte era invisible hasta pasar el ratón por encima.

import type { ButtonHTMLAttributes, ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'support';
type Size = 'sm' | 'md';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-terra-primary text-terra-on-primary border border-terra-primary ' +
    'hover:brightness-110 active:brightness-95',
  secondary:
    'bg-terra-surface text-terra-text border border-terra-border ' +
    'hover:bg-terra-raised hover:border-terra-border-strong',
  ghost:
    'bg-transparent text-terra-muted border border-transparent ' +
    'hover:bg-terra-raised hover:text-terra-text',
  danger:
    'bg-verdict-red text-white border border-verdict-red ' +
    'hover:brightness-110 active:brightness-95',
  support:
    'bg-support-soft text-support border border-support/40 hover:border-support/70',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs rounded-md',
  md: 'h-10 gap-2 px-4 text-sm rounded-md',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ComponentType<LucideProps>;
  /** Deshabilita y muestra el texto de espera, sin cambiar el ancho de golpe. */
  busy?: boolean;
  busyLabel?: string;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  busy = false,
  busyLabel,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex shrink-0 items-center justify-center font-semibold transition-colors
        disabled:cursor-not-allowed disabled:opacity-45
        ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}

/** Botón que sólo lleva icono. Exige `label`: sin texto visible, un botón sin
 * nombre accesible es un botón que el lector de pantalla anuncia como «botón». */
export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...rest
}: Omit<ButtonProps, 'children' | 'icon' | 'busyLabel'> & {
  icon: ComponentType<LucideProps>;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center transition-colors
        disabled:cursor-not-allowed disabled:opacity-45
        ${VARIANT[variant]} ${size === 'sm' ? 'h-8 w-8 rounded-md' : 'h-10 w-10 rounded-md'} ${className}`}
      {...rest}
    >
      <Icon size={size === 'sm' ? 14 : 18} aria-hidden="true" />
    </button>
  );
}

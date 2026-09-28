// src/ui/Field.tsx — campos de formulario con etiqueta, ayuda y error.

import { forwardRef, useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

const INPUT =
  'h-11 w-full rounded-md border bg-surface px-3 text-[15px] text-ink placeholder:text-faint ' +
  'transition-colors focus:outline-none focus-visible:outline-none focus:border-primary ' +
  'focus:ring-3 focus:ring-primary/15 disabled:opacity-60';

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField(
  { label, hint, error, className = '', id, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${INPUT} ${error ? 'border-danger' : 'border-line-strong'} ${className}`}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className="text-[13px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
});

export function PasswordField({ label, hint, error, id, ...rest }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          className={`${INPUT} pr-11 ${error ? 'border-danger' : 'border-line-strong'}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-faint hover:text-ink"
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      {error ? <p className="text-[13px] text-danger">{error}</p> : hint}
    </div>
  );
}

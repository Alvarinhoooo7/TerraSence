// src/ui/Form.tsx — controles de formulario con etiqueta asociada.
//
// Todos los campos de la consola llevaban su etiqueta en un `<span>` suelto:
// visualmente parecía una etiqueta, pero no estaba asociada al control, así
// que un lector de pantalla anunciaba «editar texto» sin decir de qué. `useId`
// resuelve el vínculo sin obligar a cada pantalla a inventar identificadores.

import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';

const CONTROL =
  'w-full rounded-md border border-terra-border bg-terra-surface px-3 text-sm text-terra-text ' +
  'placeholder:text-terra-faint hover:border-terra-border-strong ' +
  'focus:border-terra-primary disabled:cursor-not-allowed disabled:opacity-50';

function Wrapper({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold tracking-wide text-terra-muted uppercase"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-xs text-verdict-red">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className="text-xs leading-relaxed text-terra-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  className = '',
  ...rest
}: ComponentPropsWithRef<'input'> & {
  label: string;
  hint?: ReactNode;
  error?: string;
}) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={`${CONTROL} h-10 ${error ? 'border-verdict-red' : ''} ${className}`}
        {...rest}
      />
    </Wrapper>
  );
}

export function SelectField({
  label,
  hint,
  error,
  children,
  className = '',
  ...rest
}: ComponentPropsWithRef<'select'> & {
  label: string;
  hint?: ReactNode;
  error?: string;
}) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={`${CONTROL} h-10 ${className}`}
        {...rest}
      >
        {children}
      </select>
    </Wrapper>
  );
}

/** Campo de contraseña con conmutador de visibilidad. El botón queda fuera
 * del orden de tabulación: es una ayuda visual, no un paso del formulario. */
export function PasswordField({
  label,
  hint,
  error,
  show,
  onToggleShow,
  toggleIcon,
  ...rest
}: ComponentPropsWithRef<'input'> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  show: boolean;
  onToggleShow: () => void;
  toggleIcon: ReactNode;
}) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          className={`${CONTROL} h-10 pr-11 ${error ? 'border-verdict-red' : ''}`}
          {...rest}
        />
        <button
          type="button"
          onClick={onToggleShow}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-terra-muted hover:text-terra-text"
        >
          {toggleIcon}
        </button>
      </div>
    </Wrapper>
  );
}

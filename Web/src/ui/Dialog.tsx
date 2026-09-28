// src/ui/Dialog.tsx — diálogo de confirmación.
//
// Usa el <dialog> nativo con showModal(): el navegador ya deja inerte el resto
// de la página, atrapa el foco, lo devuelve al cerrarse y cierra con Escape.
// Mientras la acción corre, Escape y el fondo no cierran: cancelar a mitad de
// un reset dejaría al operador sin saber si ocurrió.
//
// Orden fijo de los botones: Cancelar a la izquierda, la acción a la derecha.

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'primary',
  busy = false,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-surface p-0 text-ink
        shadow-pop backdrop:bg-overlay"
    >
      <div className="px-6 pt-5 pb-2">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <div className="mt-2 text-sm text-muted">{children}</div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      <footer className="flex items-center justify-between gap-3 px-6 pt-3 pb-5">
        <Button variant="secondary" onClick={onClose} disabled={busy} autoFocus>
          {cancelLabel}
        </Button>
        <Button variant={tone} onClick={onConfirm} busy={busy}>
          {confirmLabel}
        </Button>
      </footer>
    </dialog>
  );
}

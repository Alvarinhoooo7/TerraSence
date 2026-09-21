// src/components/admin/FactoryResetModal.tsx
//
// Confirmación del reseteo de fábrica. Tres arreglos sobre la versión previa:
//   * el texto decía que se borran «cuadrantes»: `predial_quadrants` se
//     eliminó con el mapa en `20260920140000_retirar_mapa_y_postgis.sql`. Lo
//     que sí se borra y no se mencionaba es el registro de batería.
//   * el botón se habilitaba con 10 caracteres cuando el código tiene 15.
//   * la comparación exigía el código sin guiones, pero la propia consola lo
//     muestra con guiones en el buscador y en la flota: copiarlo y pegarlo
//     fallaba.
//
// El diálogo es modal de verdad: atrapa el foco, lo devuelve al cerrarse y
// responde a Escape. Un `confirm()` del navegador bloquea el hilo y no deja
// rastro de lo ocurrido.

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { factoryResetDevice } from '../../../backend/adminApi';
import type { FactoryResetResult } from '../../../backend/types';
import { Button, IconButton } from '../../ui/Button';
import { TextField } from '../../ui/Form';
import { Alert } from '../../ui/Feedback';
import { digitsOnly, formatDeviceCode } from '../../utils/format';

export function FactoryResetModal({
  deviceId,
  expectedCode,
  onClose,
  onSuccess,
}: {
  deviceId: string;
  expectedCode: string;
  onClose: () => void;
  onSuccess: (result: FactoryResetResult) => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  const typed = digitsOnly(code);
  const matches = typed.length === 15 && typed === digitsOnly(expectedCode);

  useEffect(() => {
    returnFocusTo.current = document.activeElement;
    firstFieldRef.current?.focus();
    const previous = returnFocusTo.current;
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  const submit = async () => {
    if (!matches) {
      setError('El código escrito no coincide con el de este equipo.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onSuccess(await factoryResetDevice(deviceId, typed));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/55"
        onClick={() => !busy && onClose()}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-titulo"
        className="panel relative z-10 flex w-full max-w-lg flex-col rounded-xl border-verdict-red/40 shadow-pop"
      >
        <header className="flex items-start gap-3 border-b border-terra-border px-5 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-verdict-red-soft text-verdict-red">
            <AlertTriangle size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="reset-titulo" className="font-semibold text-terra-text">
              Resetear de fábrica
            </h2>
            <p className="text-xs text-terra-muted">
              Equipo {formatDeviceCode(expectedCode)}
            </p>
          </div>
          <IconButton icon={X} label="Cerrar" size="sm" disabled={busy} onClick={onClose} />
        </header>

        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-sm leading-relaxed text-terra-muted">
            Se desvincula a <strong className="text-terra-text">todos</strong> los miembros y se
            borra el historial privado del equipo: mediciones, alertas, invitaciones de acceso y el
            registro de batería. Se conservan el código de 15 dígitos, el firmware y el hardware,
            porque son la sonda física y no datos del dueño anterior.
          </p>

          <Alert tone="warning">
            Esta operación es irreversible y sólo afecta a la nube. Borrar la memoria del equipo
            físico exige soporte del firmware, que todavía no existe.
          </Alert>

          <TextField
            ref={firstFieldRef}
            label="Escribe el código del equipo para confirmar"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={formatDeviceCode(expectedCode)}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            className="tabular text-center font-mono tracking-widest"
            hint={`${typed.length}/15 dígitos. Se aceptan los guiones tal como se muestran arriba.`}
            error={error ?? undefined}
          />
        </div>

        <footer className="flex justify-end gap-2 border-t border-terra-border px-5 py-4">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={!matches}
            busy={busy}
            busyLabel="Reseteando…"
            onClick={() => void submit()}
          >
            Confirmar reseteo
          </Button>
        </footer>
      </div>
    </div>
  );
}

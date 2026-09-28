// src/components/device/ResetDialog.tsx — confirmación del reset global.
//
// Doble confirmación: el botón Reset abre este diálogo, que enumera lo que se
// borra. Cancelar a la izquierda, Resetear en rojo suave a la derecha.

import { useState } from 'react';
import { friendlyError } from '../../../backend/adminApi';
import { ConfirmDialog } from '../../ui/Dialog';
import { formatDeviceCode } from '../../utils/format';

const ERASED = [
  'Todos los usuarios enlazados, incluido el administrador.',
  'Las solicitudes de acceso pendientes.',
  'Todas las mediciones del equipo.',
  'Las alertas, invitaciones y el historial de batería y conexiones.',
];

export function ResetDialog({
  deviceCode,
  onReset,
  onClose,
}: {
  deviceCode: string;
  onReset: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <ConfirmDialog
      title={`Resetear el equipo ${formatDeviceCode(deviceCode)}`}
      confirmLabel="Resetear"
      tone="danger"
      busy={busy}
      error={error}
      onClose={onClose}
      onConfirm={() => {
        setBusy(true);
        setError(null);
        onReset()
          .catch((e) => setError(friendlyError(e)))
          .finally(() => setBusy(false));
      }}
    >
      <p>Se borrará todo lo asociado al equipo y quedará como de fábrica:</p>
      <ul className="mt-2.5 flex list-disc flex-col gap-1 pl-5 text-ink">
        {ERASED.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-3">
        El equipo desaparece de la app de todos sus usuarios. El ID no cambia (sale de la MAC de la sonda):
        quien la vuelva a vincular con el botón PAIR quedará como administrador. <strong className="font-medium text-ink">No se puede deshacer.</strong>
      </p>
    </ConfirmDialog>
  );
}

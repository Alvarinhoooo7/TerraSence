// src/components/device/DeviceCommands.tsx — acciones sobre un equipo.
//
// Aquí estaba la mentira más cara de la consola. El botón decía «Enviar
// aviso», y al terminar la pantalla anunciaba «Aviso enviado a los usuarios
// del equipo». No se enviaba nada: `admin_push_firmware_update` dejó de
// encolar alertas push en `20260920120000_preparar_equipo_propietario.sql`
// —sin atestación física del firmware, empujar «actualízate» desde el
// backoffice anuncia algo que la consola no puede garantizar— y su respuesta
// dice literalmente «No se envió un aviso push».
//
// Lo que queda es real y útil: verificar contra el servidor que una versión
// del catálogo es aplicable a este equipo. El texto que se muestra al
// terminar es el `message` del propio servidor, no uno escrito aquí: es la
// única forma de que no vuelva a desalinearse.

import { useEffect, useState } from 'react';
import { CircleCheck, RotateCcw, Terminal } from 'lucide-react';
import {
  checkFirmwareAvailability,
  listPublishedFirmware,
} from '../../../backend/adminApi';
import type { FirmwareReleaseRow } from '../../../backend/types';
import { Panel, PanelHeader } from '../../ui/Panel';
import { Button } from '../../ui/Button';
import { SelectField } from '../../ui/Form';
import { Alert } from '../../ui/Feedback';
import { formatVersion } from '../../utils/format';

export function DeviceCommands({
  deviceId,
  onOpenReset,
}: {
  deviceId: string;
  onOpenReset: () => void;
}) {
  const [releases, setReleases] = useState<FirmwareReleaseRow[]>([]);
  const [selected, setSelected] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Catálogo completo, sin filtrar por `hardware_target`. La migración
    // 20260921120000 normalizó la nomenclatura, pero un equipo puede seguir
    // reportando una plataforma que el catálogo no cubra: un desplegable vacío
    // por un desajuste de cadenas sería peor que dejar elegir con criterio,
    // y cada opción declara su target.
    listPublishedFirmware()
      .then(setReleases)
      .catch(() => setReleases([]));
  }, []);

  const check = async () => {
    if (!selected) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await checkFirmwareAvailability(deviceId, selected);
      setResult({
        tone: 'ok',
        text: res.message ?? 'La versión está publicada y es aplicable a este equipo.',
      });
    } catch (e) {
      setResult({ tone: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Panel>
      <PanelHeader icon={Terminal} title="Acciones" />

      <div className="flex flex-col gap-4 p-5">
        <section className="flex flex-col gap-2.5">
          <h3 className="text-sm font-semibold text-terra-text">Verificar versión de firmware</h3>

          {releases.length === 0 ? (
            <p className="text-sm text-terra-muted">
              No hay versiones publicadas en el catálogo. La publicación se hace con la clave de
              servicio, no desde esta consola.
            </p>
          ) : (
            <>
              <SelectField
                label="Versión del catálogo"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Elegir versión…</option>
                {releases.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatVersion(r.version)} · {r.hardware_target}
                    {r.is_mandatory ? ' · obligatoria' : ''}
                  </option>
                ))}
              </SelectField>

              <Button
                variant="primary"
                icon={CircleCheck}
                disabled={!selected}
                busy={checking}
                busyLabel="Comprobando…"
                onClick={() => void check()}
              >
                Comprobar disponibilidad
              </Button>

              <p className="text-xs leading-relaxed text-terra-muted">
                Comprueba contra el servidor que la versión esté publicada y sea aplicable.
                <strong className="font-semibold text-terra-text"> No envía ningún aviso </strong>
                ni transfiere el binario: la descarga, la verificación del SHA-256 y la instalación
                las hace la sonda contra <code className="font-mono">check_firmware_update()</code>.
              </p>
            </>
          )}

          {result && <Alert tone={result.tone}>{result.text}</Alert>}
        </section>

        <section className="flex flex-col gap-2.5 border-t border-terra-border pt-4">
          <h3 className="text-sm font-semibold text-terra-text">Zona irreversible</h3>
          <p className="text-xs leading-relaxed text-terra-muted">
            Prepara el equipo para un dueño nuevo: desvincula a todos sus miembros y borra su
            historial privado. Conserva el código, el firmware y el hardware.
          </p>
          <Button variant="danger" icon={RotateCcw} onClick={onOpenReset}>
            Resetear de fábrica
          </Button>
        </section>
      </div>
    </Panel>
  );
}

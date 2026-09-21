// src/components/device/DeviceBattery.tsx — historial de batería.
//
// `device_status_log` lo llena un trigger sobre `devices`, no un cliente: la
// tabla se llena aunque el aviso venga de la app, de la Edge Function o de
// este panel. `battery_level` es nulable, y el código anterior lo comparaba
// con `> 20` sin comprobarlo — pasaba desapercibido porque `strict` estaba
// apagado en `tsconfig.app.json`.

import { useMemo, useState } from 'react';
import { BatteryMedium, Download } from 'lucide-react';
import type { BatteryLogEntry } from '../../../backend/types';
import { Panel, PanelHeader } from '../../ui/Panel';
import { Button } from '../../ui/Button';
import { BatteryBar, TableScroll } from '../../ui/Data';
import { EmptyState } from '../../ui/Feedback';
import { absoluteTime, formatVersion } from '../../utils/format';
import { downloadCsv, fileStamp } from '../../utils/csv';

const DAY_MS = 86_400_000;

export function DeviceBattery({
  history,
  deviceCode,
  onExportError,
}: {
  history: BatteryLogEntry[];
  deviceCode: string;
  onExportError: (message: string) => void;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const visible = useMemo(() => {
    if (!from && !to) return history;
    const min = from ? Date.parse(from) : Number.NEGATIVE_INFINITY;
    // El «hasta» incluye el día completo: quien escribe una fecha espera que
    // las lecturas de esa jornada entren, no que se corten a medianoche.
    const max = to ? Date.parse(to) + DAY_MS : Number.POSITIVE_INFINITY;
    return history.filter((h) => {
      const t = Date.parse(h.recorded_at);
      return !Number.isNaN(t) && t >= min && t <= max;
    });
  }, [history, from, to]);

  const exportCsv = () => {
    const ok = downloadCsv(
      `terrasense-bateria-${deviceCode}-${fileStamp()}.csv`,
      ['Fecha', 'Bateria (%)', 'Firmware'],
      visible.map((h) => [h.recorded_at, h.battery_level ?? '', h.firmware_version ?? '']),
    );
    if (!ok) onExportError('El navegador bloqueó la descarga del CSV.');
  };

  const dateInput =
    'h-8 rounded-md border border-terra-border bg-terra-surface px-2 text-sm text-terra-text focus:border-terra-primary';

  return (
    <Panel>
      <PanelHeader
        icon={BatteryMedium}
        title="Historial de batería"
        hint={`${history.length} lectura${history.length === 1 ? '' : 's'} (últimas 100)`}
        actions={
          <>
            <label className="flex items-center gap-1.5 text-xs text-terra-muted">
              Desde
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={dateInput}
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-terra-muted">
              Hasta
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={dateInput}
              />
            </label>
            <Button
              size="sm"
              variant="ghost"
              disabled={!from && !to}
              onClick={() => {
                setFrom('');
                setTo('');
              }}
            >
              Limpiar
            </Button>
            <Button size="sm" icon={Download} disabled={visible.length === 0} onClick={exportCsv}>
              CSV
            </Button>
          </>
        }
      />

      {visible.length === 0 ? (
        <EmptyState icon={BatteryMedium} title="Sin lecturas en este rango">
          {history.length === 0
            ? 'El registro se llena con cada cambio de batería o de última conexión que reporta el equipo.'
            : 'Amplía el rango de fechas para ver las lecturas existentes.'}
        </EmptyState>
      ) : (
        <TableScroll label="Historial de batería" maxHeight="24rem">
          <table className="data-table w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-5 py-2.5">Fecha y hora</th>
                <th className="px-3 py-2.5">Nivel</th>
                <th className="px-3 py-2.5">Firmware informado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terra-border">
              {visible.map((h, i) => (
                <tr key={`${h.recorded_at}-${i}`}>
                  <td className="px-5 py-2 whitespace-nowrap text-terra-muted">
                    {absoluteTime(h.recorded_at)}
                  </td>
                  <td className="px-3 py-2">
                    <BatteryBar level={h.battery_level} />
                  </td>
                  <td className="tabular px-3 py-2 font-mono text-xs text-terra-muted">
                    {formatVersion(h.firmware_version)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </Panel>
  );
}

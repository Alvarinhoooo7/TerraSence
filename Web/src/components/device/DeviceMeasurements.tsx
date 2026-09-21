// src/components/device/DeviceMeasurements.tsx — últimas 50 lecturas del equipo.

import { Fragment, useState } from 'react';
import { Download, Sprout } from 'lucide-react';
import type { MeasurementSummary } from '../../../backend/types';
import { STAGE_LABEL } from '../../types';
import type { PhenologicalStage } from '../../types';
import { verdictMeta } from '../../utils/verdict';
import { absoluteTime, num, relativeTime } from '../../utils/format';
import { downloadCsv, fileStamp } from '../../utils/csv';
import { Panel, PanelHeader, PanelNote } from '../../ui/Panel';
import { Button } from '../../ui/Button';
import { Badge, TableScroll } from '../../ui/Data';
import { EmptyState } from '../../ui/Feedback';
import { MeasurementGrid } from '../MeasurementGrid';

export function DeviceMeasurements({
  measurements,
  deviceCode,
  onExportError,
}: {
  measurements: MeasurementSummary[];
  deviceCode: string;
  onExportError: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const exportCsv = () => {
    const ok = downloadCsv(
      `terrasense-mediciones-${deviceCode}-${fileStamp()}.csv`,
      [
        'Fecha', 'Campo', 'Cultivo', 'Etapa', 'Veredicto', 'Titulo',
        'Humedad (%)', 'Temp suelo (C)', 'CE (uS/cm)', 'pH',
        'N sin validar (mg/kg)', 'P sin validar (mg/kg)', 'K sin validar (mg/kg)',
        'Temp ambiente (C)', 'HR ambiente (%)', 'Presion (hPa)', 'Bateria en captura (%)',
        'Latitud', 'Longitud', 'Diagnostico y fuentes',
      ],
      measurements.map((m) => [
        m.measured_at, m.field_name, m.crop_id, m.phenological_stage, m.verdict, m.verdict_title,
        m.vwc_percent, m.soil_temp_c, m.ec_us_cm, m.ph,
        m.nitrogen, m.phosphorus, m.potassium,
        m.canopy_temp_c ?? '', m.canopy_humidity_pct ?? '', m.air_pressure_hpa ?? '',
        m.battery_percent ?? '', m.latitude ?? '', m.longitude ?? '',
        JSON.stringify(m.diagnosis ?? null),
      ]),
    );
    if (!ok) onExportError('El navegador bloqueó la descarga del CSV.');
  };

  return (
    <Panel>
      <PanelHeader
        icon={Sprout}
        title="Mediciones agronómicas"
        hint={`Últimas ${measurements.length} lecturas`}
        actions={
          <Button
            size="sm"
            icon={Download}
            disabled={measurements.length === 0}
            onClick={exportCsv}
          >
            CSV
          </Button>
        }
      />

      {measurements.length === 0 ? (
        <EmptyState icon={Sprout} title="Este equipo todavía no ha reportado mediciones">
          Aparecen aquí en cuanto el agricultor sincroniza su primera captura desde la app.
        </EmptyState>
      ) : (
        <TableScroll label="Mediciones del equipo" maxHeight="30rem">
          <table className="data-table w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-5 py-2.5">Fecha</th>
                <th className="px-3 py-2.5">Campo / Etapa</th>
                <th className="px-3 py-2.5">Veredicto</th>
                <th className="px-3 py-2.5 text-right">Humedad</th>
                <th className="px-3 py-2.5 text-right">Temp.</th>
                <th className="px-3 py-2.5 text-right">CE</th>
                <th className="px-3 py-2.5 text-right">pH</th>
                <th className="px-3 py-2.5 text-right">N·P·K*</th>
                <th className="px-3 py-2.5">
                  <span className="sr-only">Detalle</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terra-border">
              {measurements.map((m) => {
                const meta = verdictMeta(m.verdict);
                const open = expanded === m.id;
                return (
                  <Fragment key={m.id}>
                    <tr>
                      <td
                        className="px-5 py-2.5 whitespace-nowrap text-terra-muted"
                        title={absoluteTime(m.measured_at)}
                      >
                        {relativeTime(m.measured_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-terra-text">{m.field_name || '—'}</div>
                        <div className="text-xs text-terra-muted">
                          {STAGE_LABEL[m.phenological_stage as PhenologicalStage] ??
                            m.phenological_stage}
                          {' · '}
                          {m.crop_id}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          tone={
                            m.verdict === 'GREEN' ? 'green' : m.verdict === 'AMBER' ? 'amber' : 'red'
                          }
                        >
                          <span aria-hidden="true">{meta.icon}</span> {meta.label}
                        </Badge>
                        <div className="mt-0.5 max-w-[16rem] truncate text-xs text-terra-muted">
                          {m.verdict_title}
                        </div>
                      </td>
                      <td className="tabular px-3 py-2.5 text-right">{num(m.vwc_percent, 1, '%')}</td>
                      <td className="tabular px-3 py-2.5 text-right">{num(m.soil_temp_c, 1, '°C')}</td>
                      <td className="tabular px-3 py-2.5 text-right">{num(m.ec_us_cm, 0)}</td>
                      <td className="tabular px-3 py-2.5 text-right">{num(m.ph, 1)}</td>
                      <td className="tabular px-3 py-2.5 text-right text-terra-muted">
                        {m.nitrogen}·{m.phosphorus}·{m.potassium}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-expanded={open}
                          onClick={() => setExpanded(open ? null : m.id)}
                        >
                          {open ? 'Ocultar' : 'Detalle'}
                        </Button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={9} className="bg-terra-raised px-5 py-4">
                          <MeasurementGrid reading={m} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      )}

      <PanelNote>
        * N, P y K se derivan de la conductividad eléctrica, no de electrodos ion-selectivos:
        sirven para verificar que el sensor responde, no para calcular dosis de fertilizante.
      </PanelNote>
    </Panel>
  );
}

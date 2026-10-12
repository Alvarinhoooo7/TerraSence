// src/components/device/MeasurementsCard.tsx — últimas 5 mediciones.
//
// Las 16 columnas pedidas no caben en una fila legible, así que cada fila se
// despliega: recogida muestra las primeras (Registro, Fase con la especie y las
// cuatro variables del suelo) y desplegada, el resto en el mismo orden. La
// coordenada va en texto plano, tal cual.

import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, RefreshCw, Sprout } from 'lucide-react';
import type { Measurement } from '../../../backend/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge, EmptyState, Notice, SkeletonRows } from '../../ui/Feedback';
import { exactDateTime, formatCoordinate, num } from '../../utils/format';
import { stageLabel, verdictMeta } from '../../utils/verdict';
import { summarizeForecast } from '../../utils/weather';

const COLS =
  'grid-cols-[1.5rem_minmax(0,1fr)_auto] md:grid-cols-[1.5rem_11rem_minmax(0,1fr)_repeat(4,6.5rem)] items-center gap-x-3';

function Detail({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2 lg:col-span-4' : ''}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}

function Row({ m, open, onToggle }: { m: Measurement; open: boolean; onToggle: () => void }) {
  const verdict = verdictMeta(m.verdict);
  const panelId = `medicion-${m.id}`;
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={`grid ${COLS} w-full px-5 py-3 text-left text-sm hover:bg-hover`}
      >
        <ChevronDown
          size={17}
          aria-hidden="true"
          className={`text-faint transition-transform ${open ? 'rotate-180 text-ink' : ''}`}
        />
        <span className="font-mono text-[13px] text-ink tabular">{exactDateTime(m.measured_at)}</span>
        <span className="min-w-0 text-ink md:text-left">
          {stageLabel(m.phenological_stage)}
          <span className="block truncate text-xs text-muted">{m.species?.es ?? 'Sin especie'}</span>
        </span>
        <span className="hidden text-right tabular md:block">{num(m.vwc_percent, 1, '%')}</span>
        <span className="hidden text-right tabular md:block">{num(m.soil_temp_c, 1, '°C')}</span>
        <span className="hidden text-right tabular md:block">{num(m.ec_us_cm, 0)}</span>
        <span className="hidden text-right tabular md:block">{num(m.ph, 1)}</span>
      </button>

      {open && (
        <dl
          id={panelId}
          className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-dashed border-line bg-sunken px-5 py-4 pl-14
            sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="contents md:hidden">
            <Detail label="Humedad del suelo">{num(m.vwc_percent, 1, '%')}</Detail>
            <Detail label="Temperatura del suelo">{num(m.soil_temp_c, 1, '°C')}</Detail>
            <Detail label="Conductividad eléctrica">{num(m.ec_us_cm, 0, 'µS/cm')}</Detail>
            <Detail label="pH">{num(m.ph, 1)}</Detail>
          </div>
          <Detail label="Especie">
            {m.species ? <>{m.species.es} <i className="text-muted">{m.species.scientific}</i></> : 'Sin especie indicada'}
          </Detail>
          <Detail label="Nitrógeno">{num(m.nitrogen, 0, 'mg/kg')}</Detail>
          <Detail label="Fósforo">{num(m.phosphorus, 0, 'mg/kg')}</Detail>
          <Detail label="Potasio">{num(m.potassium, 0, 'mg/kg')}</Detail>
          <Detail label="Temperatura ambiente">{num(m.canopy_temp_c, 1, '°C')}</Detail>
          <Detail label="Humedad ambiente">{num(m.canopy_humidity_pct, 1, '%')}</Detail>
          <Detail label="Presión atmosférica">{num(m.air_pressure_hpa, 1, 'hPa')}</Detail>
          <Detail label="Nivel de batería">{num(m.battery_percent, 0, '%')}</Detail>
          <Detail label="Dato de la API">{summarizeForecast(m.weather)}</Detail>
          <Detail label="Consejo del motor agronómico" wide>
            <span className="flex flex-wrap items-baseline gap-2">
              <Badge tone={verdict.tone}>{verdict.label}</Badge>
              <span>{m.action_summary || m.verdict_title || '—'}</span>
            </span>
          </Detail>
          <Detail label="Coordenada de medición" wide>
            <span className="font-mono text-[13px] tabular">{formatCoordinate(m.latitude, m.longitude)}</span>
          </Detail>
        </dl>
      )}
    </li>
  );
}

export function MeasurementsCard({
  measurements,
  loading,
  error,
  onRefresh,
}: {
  measurements: Measurement[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card
      title="Mediciones"
      labelledBy="card-mediciones"
      description="Últimas 5 · N, P y K se estiman desde la conductividad y no están validados"
      actions={
        <Button size="sm" icon={RefreshCw} onClick={onRefresh} busy={loading && measurements != null}>
          Refrescar
        </Button>
      }
    >
      {error && (
        <div className="px-5 pt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {!measurements ? (
        loading && <SkeletonRows rows={5} label="Cargando mediciones" />
      ) : measurements.length === 0 ? (
        <EmptyState icon={Sprout} title="Sin mediciones">
          Aparecen aquí cuando un usuario mide y sincroniza desde la app.
        </EmptyState>
      ) : (
        <div>
          <div aria-hidden="true" className={`${COLS} hidden border-b border-line px-5 py-2.5 text-xs text-muted md:grid`}>
            <span />
            <span>Registro</span>
            <span>Fase y especie</span>
            <span className="text-right">Humedad del suelo</span>
            <span className="text-right">Temp. del suelo</span>
            <span className="text-right">CE (µS/cm)</span>
            <span className="text-right">pH</span>
          </div>
          <ul className="divide-y divide-line">
            {measurements.map((m) => (
              <Row key={m.id} m={m} open={openIds.has(m.id)} onToggle={() => toggle(m.id)} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

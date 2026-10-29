// src/components/device/MeasurementsCard.tsx — el historial del equipo, dividido.
//
// Las 16 columnas pedidas no caben en una fila legible, así que cada fila se
// despliega: recogida muestra las primeras (Registro, la etapa con la especie y las
// cuatro variables del suelo) y desplegada, el resto en el mismo orden. La
// coordenada va en texto plano, tal cual.
//
// El historial se filtra por etapa y por especie y se agrupa por fecha, especie o etapa,
// igual que en la app. Filtrar lo hace el servidor y agrupar, esta tarjeta: cambiar de
// agrupación reordena lo que ya está en pantalla sin volver a la red.

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Filter, RefreshCw, Sprout } from 'lucide-react';
import { MEASUREMENTS_MAX, MEASUREMENTS_PAGE } from '../../../backend/types';
import type { DeviceSpecies, Measurement } from '../../../backend/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge, EmptyState, Notice, SkeletonRows } from '../../ui/Feedback';
import { exactDateTime, formatCoordinate, num } from '../../utils/format';
import {
  DEFAULT_VIEW,
  GROUPING_LABEL,
  changeView,
  organizeHistory,
  speciesOptions,
  totalMeasurements,
} from '../../utils/measurementHistory';
import type { HistoryGrouping, HistoryView, SpeciesOption } from '../../utils/measurementHistory';
import { STAGES, stageLabel, verdictMeta } from '../../utils/verdict';
import { summarizeForecast } from '../../utils/weather';

const COLS =
  'grid-cols-[1.5rem_minmax(0,1fr)_auto] md:grid-cols-[1.5rem_11rem_minmax(0,1fr)_repeat(4,6.5rem)] items-center gap-x-3';

/** Rótulo de la tercera columna: lo que la agrupación no dice ya en su encabezado. */
const GROUP_COLUMN: Record<HistoryGrouping, string> = {
  date: 'Etapa y especie',
  species: 'Etapa',
  stage: 'Especie',
};

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[13px] whitespace-nowrap
        transition-colors duration-150 ${
          selected
            ? 'border-primary bg-primary font-semibold text-on-primary'
            : 'border-line-strong bg-surface font-medium text-ink hover:bg-hover'
        }`}
    >
      {children}
    </button>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-muted">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  );
}

function Detail({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2 lg:col-span-4' : ''}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}

function Row({
  m,
  grouping,
  open,
  onToggle,
}: {
  m: Measurement;
  grouping: HistoryGrouping;
  open: boolean;
  onToggle: () => void;
}) {
  const verdict = verdictMeta(m.verdict);
  const panelId = `medicion-${m.id}`;
  const species = m.species?.es ?? 'Sin especie';
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
          {/* Lo que encabeza el grupo no se repite en cada fila. */}
          {grouping === 'stage' ? (
            <span className="block truncate">{species}</span>
          ) : (
            <>
              {stageLabel(m.phenological_stage)}
              {grouping === 'date' && <span className="block truncate text-xs text-muted">{species}</span>}
            </>
          )}
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
          <Detail label="Etapa">{stageLabel(m.phenological_stage)}</Detail>
          <Detail label="Especie" wide>
            {m.species ? (
              <>
                {m.species.es} <i className="text-muted">{m.species.scientific}</i>
                {/* Explica por qué dos lecturas de la misma especie no se evalúan igual. */}
                {m.species.hasStageCriteria === false && (
                  <span className="block text-xs text-muted">
                    Sin criterios propios de la especie para esta etapa: el veredicto salió del análisis
                    general del suelo.
                  </span>
                )}
              </>
            ) : (
              'Sin especie indicada'
            )}
          </Detail>
          {/* Con qué versiones del catálogo y de los criterios se evaluó: una misma especie
              medida en dos campañas pudo evaluarse con reglas distintas. */}
          {m.species?.catalogVersion && (
            <Detail label="Versiones del diagnóstico" wide>
              Catálogo {m.species.catalogVersion}
              {m.species.rulesVersion
                ? ` · criterios ${m.species.rulesVersion}`
                : ' · criterios anteriores a su registro'}
            </Detail>
          )}
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

/**
 * Opciones del filtro de especie más, si hace falta, la del enlace: una URL con una especie
 * que este equipo nunca midió debe verse elegida, no desaparecer en silencio.
 */
function optionsWithActive(inventory: DeviceSpecies[] | null, active: string): SpeciesOption[] {
  const options = speciesOptions(inventory);
  if (active === 'all' || options.some((o) => o.value === active)) return options;
  return [...options, { value: active, label: active === 'none' ? 'Sin especie' : active, count: 0 }];
}

export function MeasurementsCard({
  measurements,
  inventory,
  view,
  loading,
  error,
  onViewChange,
  onRefresh,
}: {
  measurements: Measurement[] | null;
  inventory: DeviceSpecies[] | null;
  view: HistoryView;
  loading: boolean;
  error: string | null;
  onViewChange: (next: HistoryView) => void;
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

  const options = useMemo(() => optionsWithActive(inventory, view.species), [inventory, view.species]);
  const sections = useMemo(
    () => organizeHistory(measurements ?? [], view.grouping),
    [measurements, view.grouping],
  );

  const filtered = view.stage !== 'all' || view.species !== 'all';
  const shown = measurements?.length ?? 0;
  const change = (patch: Partial<HistoryView>) => onViewChange(changeView(view, patch));

  // El inventario cuenta por especie, no por etapa: con una etapa elegida el total se ignora
  // y la paginación se guía por la página llena, que es lo único que se sabe.
  const total = useMemo(() => {
    if (!inventory || view.stage !== 'all') return null;
    if (view.species === 'all') return totalMeasurements(inventory);
    return options.find((option) => option.value === view.species)?.count ?? null;
  }, [inventory, options, view.species, view.stage]);

  const last = view.offset + shown;
  const hasOlder = total != null ? last < total : shown >= view.limit;

  return (
    <Card
      title="Mediciones"
      labelledBy="card-mediciones"
      description="N, P y K se estiman desde la conductividad y no están validados"
      actions={
        <Button size="sm" icon={RefreshCw} onClick={onRefresh} busy={loading && measurements != null}>
          Refrescar
        </Button>
      }
    >
      <div className="flex flex-col gap-2.5 border-b border-line px-5 py-4">
        <ChipRow label="Etapa">
          <Chip selected={view.stage === 'all'} onClick={() => change({ stage: 'all' })}>
            Todas
          </Chip>
          {STAGES.map((stage) => (
            <Chip key={stage} selected={view.stage === stage} onClick={() => change({ stage })}>
              {stageLabel(stage)}
            </Chip>
          ))}
        </ChipRow>

        {/* Sólo las especies que este equipo midió alguna vez, según lo elegido al medir. */}
        {options.length > 0 && (
          <ChipRow label="Especie">
            <Chip selected={view.species === 'all'} onClick={() => change({ species: 'all' })}>
              Todas
            </Chip>
            {options.map((option) => (
              <Chip
                key={option.value}
                selected={view.species === option.value}
                onClick={() => change({ species: option.value })}
              >
                {option.label} <span className="ml-1 opacity-70 tabular">{option.count}</span>
              </Chip>
            ))}
          </ChipRow>
        )}

        <ChipRow label="Agrupar por">
          {(Object.keys(GROUPING_LABEL) as HistoryGrouping[]).map((grouping) => (
            <Chip
              key={grouping}
              selected={view.grouping === grouping}
              onClick={() => change({ grouping })}
            >
              {GROUPING_LABEL[grouping]}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {error && (
        <div className="px-5 pt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {!measurements ? (
        loading && <SkeletonRows rows={5} label="Cargando mediciones" />
      ) : measurements.length === 0 ? (
        view.offset > 0 ? (
          <EmptyState icon={Filter} title="No hay lecturas más antiguas">
            La página quedó fuera del historial del equipo.
            <span className="mt-3 block">
              <Button size="sm" onClick={() => change({ offset: 0 })}>
                Volver a las más recientes
              </Button>
            </span>
          </EmptyState>
        ) : filtered ? (
          <EmptyState icon={Filter} title="Sin mediciones con estos filtros">
            Este equipo no tiene lecturas de la etapa y la especie elegidas.
            <span className="mt-3 block">
              <Button size="sm" onClick={() => onViewChange({ ...DEFAULT_VIEW, grouping: view.grouping })}>
                Quitar los filtros
              </Button>
            </span>
          </EmptyState>
        ) : (
          <EmptyState icon={Sprout} title="Sin mediciones">
            Aparecen aquí cuando un usuario mide y sincroniza desde la app.
          </EmptyState>
        )
      ) : (
        <div aria-busy={loading || undefined}>
          <div
            aria-hidden="true"
            className={`${COLS} hidden border-b border-line px-5 py-2.5 text-xs text-muted md:grid`}
          >
            <span />
            <span>Registro</span>
            <span>{GROUP_COLUMN[view.grouping]}</span>
            <span className="text-right">Humedad del suelo</span>
            <span className="text-right">Temp. del suelo</span>
            <span className="text-right">CE (µS/cm)</span>
            <span className="text-right">pH</span>
          </div>

          {sections.map((section) => (
            <section key={section.key} aria-label={`${section.title}: ${section.data.length}`}>
              <h3
                className="flex items-baseline gap-2 border-b border-line bg-sunken px-5 py-2 text-[13px]
                  font-semibold text-ink"
              >
                {section.title}
                <span className="text-xs font-normal text-muted tabular">
                  {section.data.length} {section.data.length === 1 ? 'lectura' : 'lecturas'}
                </span>
              </h3>
              <ul className="divide-y divide-line">
                {section.data.map((m) => (
                  <Row
                    key={m.id}
                    m={m}
                    grouping={view.grouping}
                    open={openIds.has(m.id)}
                    onToggle={() => toggle(m.id)}
                  />
                ))}
              </ul>
            </section>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
            <p className="text-[13px] text-muted tabular">
              {shown === 1 ? `Lectura ${last}` : `Lecturas ${view.offset + 1}–${last}`}
              {total != null ? ` de ${total}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  change({ limit: view.limit >= MEASUREMENTS_MAX ? MEASUREMENTS_PAGE : MEASUREMENTS_MAX })
                }
              >
                {view.limit >= MEASUREMENTS_MAX
                  ? `Ver ${MEASUREMENTS_PAGE} por página`
                  : `Ver ${MEASUREMENTS_MAX} por página`}
              </Button>
              <Button
                size="sm"
                icon={ChevronLeft}
                disabled={view.offset === 0}
                onClick={() => change({ offset: Math.max(0, view.offset - view.limit) })}
                busy={loading && view.offset > 0}
              >
                Más recientes
              </Button>
              <Button
                size="sm"
                disabled={!hasOlder}
                onClick={() => change({ offset: view.offset + view.limit })}
                busy={loading && hasOlder}
              >
                Más antiguas
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// src/ui/Data.tsx — piezas para presentar datos: chips, indicadores, métricas
// y el envoltorio de las tablas densas.

import type { ComponentType, ReactNode } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { formatDeviceCode, relativeTime } from '../utils/format';

type BadgeTone = 'neutral' | 'primary' | 'green' | 'amber' | 'red' | 'support';

const BADGE: Record<BadgeTone, string> = {
  neutral: 'bg-terra-raised text-terra-muted border-terra-border',
  primary: 'bg-terra-primary-soft text-terra-primary-ink border-terra-primary/30',
  green: 'bg-verdict-green-soft text-verdict-green border-verdict-green/30',
  amber: 'bg-verdict-amber-soft text-verdict-amber border-verdict-amber/30',
  red: 'bg-verdict-red-soft text-verdict-red border-verdict-red/30',
  support: 'bg-support-soft text-support border-support/30',
};

export function Badge({
  tone = 'neutral',
  children,
  icon: Icon,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  icon?: ComponentType<LucideProps>;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px]
        font-semibold whitespace-nowrap ${BADGE[tone]} ${className}`}
    >
      {Icon && <Icon size={11} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Código de equipo en monoespaciada y con separadores. El `title` lleva la
 * versión sin guiones, que es la que hay que pegar en el buscador. */
export function DeviceCode({ code, className = '' }: { code: string; className?: string }) {
  return (
    <code
      title={code}
      className={`tabular rounded-sm border border-terra-border bg-terra-raised px-1.5 py-0.5
        font-mono text-xs text-terra-text ${className}`}
    >
      {formatDeviceCode(code)}
    </code>
  );
}

/**
 * Estado de reporte.
 *
 * No dice «conectado»: `devices.last_seen_at` registra el último reporte
 * recibido, no una conexión BLE viva. Afirmar conectividad a partir de esa
 * columna es afirmar algo que el dato no sostiene.
 */
export function ReportStatus({
  lastSeenAt,
  online,
  compact = false,
}: {
  lastSeenAt: string | null | undefined;
  online: boolean;
  compact?: boolean;
}) {
  const Icon = online ? Wifi : WifiOff;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap ${
        online ? 'text-verdict-green' : 'text-terra-muted'
      }`}
      title={online ? 'Reportó en la última hora' : 'Sin reporte en la última hora'}
    >
      <Icon size={13} aria-hidden="true" />
      <span className={compact ? 'text-xs' : 'text-sm'}>{relativeTime(lastSeenAt)}</span>
    </span>
  );
}

/** Barra de batería. El porcentaje va siempre en texto: el color es refuerzo,
 * no la información. */
export function BatteryBar({ level }: { level: number | null | undefined }) {
  if (level == null || !Number.isFinite(level)) {
    return <span className="text-terra-muted">Sin dato</span>;
  }
  const pct = Math.max(0, Math.min(100, level));
  const tone = pct < 20 ? 'bg-verdict-red' : pct < 40 ? 'bg-verdict-amber' : 'bg-verdict-green';
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-1.5 w-16 overflow-hidden rounded-full bg-terra-raised"
        role="img"
        aria-label={`Batería ${pct} por ciento`}
      >
        <span className={`block h-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular text-sm">{pct}%</span>
    </span>
  );
}

/** Métrica en cabecera de página: una cifra grande y su etiqueta. */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ComponentType<LucideProps>;
  tone?: BadgeTone;
}) {
  const accent =
    tone === 'green'
      ? 'text-verdict-green'
      : tone === 'amber'
        ? 'text-verdict-amber'
        : tone === 'red'
          ? 'text-verdict-red'
          : tone === 'primary'
            ? 'text-terra-primary-ink'
            : 'text-terra-text';

  return (
    <div className="panel px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-terra-muted uppercase">
        {Icon && <Icon size={13} aria-hidden="true" />}
        <span className="truncate">{label}</span>
      </div>
      <div className={`tabular mt-1.5 text-2xl leading-none font-semibold ${accent}`}>{value}</div>
      {hint && <div className="mt-1.5 text-xs text-terra-muted">{hint}</div>}
    </div>
  );
}

/**
 * Envoltorio de tabla densa.
 *
 * El scroll horizontal vive aquí y no en la página: una tabla de dieciséis
 * columnas no cabe en 1280 px y desbordar el `<main>` rompe el layout entero.
 * `tabIndex` lo hace alcanzable con teclado, porque una región que scrollea
 * sin ser enfocable no se puede recorrer sin ratón.
 */
export function TableScroll({
  children,
  label,
  maxHeight = '32rem',
}: {
  children: ReactNode;
  label: string;
  maxHeight?: string;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={label}
      className="overflow-auto"
      style={{ maxHeight }}
    >
      {children}
    </div>
  );
}

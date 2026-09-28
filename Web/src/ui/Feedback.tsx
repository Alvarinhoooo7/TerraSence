// src/ui/Feedback.tsx — avisos, estados vacíos, esqueletos e insignias.

import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';

type Tone = 'success' | 'error';

/** Aviso en línea tras una acción. `role` hace que el lector de pantalla lo lea. */
export function Notice({
  tone,
  children,
  onDismiss,
}: {
  tone: Tone;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const Icon = tone === 'success' ? CircleCheck : CircleAlert;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-sm ${
        tone === 'success'
          ? 'border-primary/25 bg-primary-soft text-primary-ink'
          : 'border-danger-line bg-danger-soft text-danger'
      }`}
    >
      <Icon size={17} className="mt-px shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="shrink-0 opacity-70 hover:opacity-100"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<LucideProps>;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <Icon size={22} className="text-faint" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      {children && <p className="mt-1 max-w-md text-[13px] text-muted">{children}</p>}
    </div>
  );
}

export function SkeletonRows({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col gap-2.5 px-5 py-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-sunken" />
      ))}
    </div>
  );
}

type BadgeTone = 'neutral' | 'green' | 'amber' | 'red';

const BADGE: Record<BadgeTone, string> = {
  neutral: 'bg-sunken text-muted border-line',
  green: 'bg-primary-soft text-primary-ink border-primary/25',
  amber: 'bg-warning-soft text-warning border-warning/30',
  red: 'bg-danger-soft text-danger border-danger-line',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-xs font-medium whitespace-nowrap ${BADGE[tone]}`}
    >
      {children}
    </span>
  );
}

export function FullPageLoader() {
  return (
    <div className="grid h-full place-items-center" aria-busy="true" aria-label="Cargando">
      <div className="h-1 w-24 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}

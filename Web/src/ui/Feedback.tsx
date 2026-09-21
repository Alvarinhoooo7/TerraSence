// src/ui/Feedback.tsx — avisos, estados vacíos, errores y esqueletos de carga.
//
// Una pantalla de operación tiene cuatro estados y ninguno puede quedarse en
// blanco: cargando, vacía, con error y con datos. Aquí viven los tres
// primeros para que ninguna pantalla los improvise.

import type { ComponentType, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, RefreshCw, XCircle } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { Button } from './Button';

type Tone = 'ok' | 'error' | 'warning' | 'info';

const TONE: Record<Tone, { cls: string; icon: ComponentType<LucideProps>; role: string }> = {
  ok: {
    cls: 'bg-verdict-green-soft text-verdict-green border-verdict-green/30',
    icon: CheckCircle2,
    role: 'status',
  },
  error: {
    cls: 'bg-verdict-red-soft text-verdict-red border-verdict-red/30',
    icon: XCircle,
    role: 'alert',
  },
  warning: {
    cls: 'bg-verdict-amber-soft text-verdict-amber border-verdict-amber/30',
    icon: AlertTriangle,
    role: 'status',
  },
  info: {
    cls: 'bg-terra-raised text-terra-muted border-terra-border',
    icon: Info,
    role: 'status',
  },
};

export function Alert({
  tone = 'info',
  children,
  onDismiss,
}: {
  tone?: Tone;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const { cls, icon: Icon, role } = TONE[tone];
  return (
    <div
      role={role}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`flex items-start gap-2.5 rounded-md border px-4 py-3 text-sm ${cls}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100"
        >
          Cerrar
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon?: ComponentType<LucideProps>;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div role="status" className="mx-auto max-w-md px-6 py-14 text-center">
      {Icon && (
        <Icon size={36} className="mx-auto mb-3 text-terra-border-strong" aria-hidden="true" />
      )}
      <p className="font-semibold text-terra-text">{title}</p>
      {children && <p className="mt-1.5 text-sm leading-relaxed text-terra-muted">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'No se pudo cargar',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="mx-auto max-w-md px-6 py-14 text-center">
      <XCircle size={36} className="mx-auto mb-3 text-verdict-red" aria-hidden="true" />
      <p className="font-semibold text-terra-text">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-terra-muted">{message}</p>
      {onRetry && (
        <div className="mt-5 flex justify-center">
          <Button icon={RefreshCw} onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Esqueleto de tabla. Se prefiere a un spinner porque mantiene la altura del
 * contenido: la página no da un salto cuando llegan los datos, y quien mira
 * ya sabe qué forma tendrá lo que está esperando.
 */
export function TableSkeleton({ rows = 6, label }: { rows?: number; label: string }) {
  return (
    <div className="space-y-2 p-5" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-9 animate-pulse rounded-md bg-terra-raised"
          style={{ opacity: 1 - i * 0.1 }}
        />
      ))}
    </div>
  );
}

/** Carga de pantalla completa: sólo para el arranque de la sesión. */
export function FullPageLoader({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-terra-bg text-terra-muted"
    >
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-terra-border border-t-terra-primary"
        aria-hidden="true"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}

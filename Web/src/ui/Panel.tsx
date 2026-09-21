// src/ui/Panel.tsx — la superficie sobre la que se apoya todo el backoffice.
//
// Composición en vez de configuración: `<Panel><PanelHeader …/>contenido</Panel>`,
// no un `<Panel title icon actions content/>` con ocho props.

import type { ComponentType, HTMLAttributes, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

export function Panel({
  children,
  className = '',
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`panel overflow-hidden ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function PanelHeader({
  icon: Icon,
  title,
  hint,
  tone = 'primary',
  actions,
  headingLevel = 2,
}: {
  icon?: ComponentType<LucideProps>;
  title: string;
  hint?: ReactNode;
  tone?: 'primary' | 'support' | 'danger';
  actions?: ReactNode;
  /** 2 por defecto: el <h1> es el título de la página, no el de la tarjeta. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const toneClass =
    tone === 'support'
      ? 'bg-support-soft text-support'
      : tone === 'danger'
        ? 'bg-verdict-red-soft text-verdict-red'
        : 'bg-terra-primary-soft text-terra-primary-ink';

  return (
    <header className="panel-header flex-wrap justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${toneClass}`}>
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
        <Heading className="truncate font-semibold text-terra-text">{title}</Heading>
        {hint && <span className="truncate text-xs text-terra-muted">{hint}</span>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Nota al pie de una tarjeta: advertencias metrológicas, alcance de un dato. */
export function PanelNote({
  icon: Icon,
  children,
  tone = 'muted',
}: {
  icon?: ComponentType<LucideProps>;
  children: ReactNode;
  tone?: 'muted' | 'warning';
}) {
  return (
    <p
      className={`flex items-start gap-2 border-t border-terra-border px-5 py-3 text-xs leading-relaxed ${
        tone === 'warning' ? 'text-verdict-amber' : 'text-terra-muted'
      }`}
    >
      {Icon && <Icon size={14} className="mt-0.5 shrink-0" aria-hidden="true" />}
      <span className={tone === 'warning' ? 'text-terra-muted' : undefined}>{children}</span>
    </p>
  );
}

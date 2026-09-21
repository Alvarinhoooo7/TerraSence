// src/pages/SupportPanelPage.tsx — el buscador, puerta de entrada del panel.
//
// `admin_search` acepta código de 15 dígitos, nombre o alias del equipo, y el
// correo de cualquier usuario enlazado. Puede devolver varias filas del mismo
// equipo si coincide por más de un motivo: por eso la clave del listado
// combina `device_id` con el índice.

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Cpu, Mail, Search, ShieldAlert, X } from 'lucide-react';
import { searchDevices } from '../../backend/adminApi';
import type { DeviceSearchResult } from '../../backend/types';
import { PageHeader } from '../ui/PageHeader';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { Badge, BatteryBar, DeviceCode, ReportStatus } from '../ui/Data';
import { Alert, EmptyState } from '../ui/Feedback';
import { reportedRecently } from '../utils/format';

const MIN_QUERY = 2;

export function SupportPanelPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DeviceSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length < MIN_QUERY) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await searchDevices(query));
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setError(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <PageHeader
        title="Panel de soporte"
        icon={ShieldAlert}
        tone="support"
        description="Busca un equipo por su código de 15 dígitos, su alias, o el correo de cualquier usuario enlazado."
      />

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <label htmlFor="busqueda-soporte" className="sr-only">
            Código de equipo, alias o correo del usuario
          </label>
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-terra-faint"
            aria-hidden="true"
          />
          <input
            id="busqueda-soporte"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="48213-90574-16628, «Lote norte» o correo@ejemplo.cl"
            autoFocus
            className="h-10 w-full rounded-md border border-terra-border bg-terra-surface pr-10 pl-9
              text-sm text-terra-text placeholder:text-terra-faint hover:border-terra-border-strong
              focus:border-terra-primary"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              aria-label="Limpiar la búsqueda"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-terra-muted hover:text-terra-text"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <Button
          type="submit"
          variant="primary"
          icon={Search}
          disabled={query.trim().length < MIN_QUERY}
          busy={searching}
          busyLabel="Buscando…"
        >
          Buscar
        </Button>
      </form>

      {error && <Alert tone="error">{error}</Alert>}

      {results.length > 0 && (
        <Panel>
          <h2 className="border-b border-terra-border px-5 py-3 text-xs font-semibold tracking-wide text-terra-muted uppercase">
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
          </h2>
          <ul className="divide-y divide-terra-border">
            {results.map((r, i) => (
              <li key={`${r.device_id}-${i}`}>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/devices/${r.device_id}`)}
                  className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-terra-raised"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-terra-primary-soft text-terra-primary-ink">
                    <Cpu size={17} aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-terra-text">
                        {r.alias || r.name}
                      </span>
                      <Badge tone={r.is_active ? 'green' : 'neutral'}>
                        {r.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                      {r.match_reason === 'member_email' && r.matched_member_email && (
                        <Badge tone="support" icon={Mail}>
                          {r.matched_member_email}
                        </Badge>
                      )}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-terra-muted">
                      <DeviceCode code={r.device_code} />
                      <ReportStatus
                        lastSeenAt={r.last_seen_at}
                        online={reportedRecently(r.last_seen_at)}
                        compact
                      />
                      <BatteryBar level={r.battery_level} />
                    </span>
                  </span>

                  <ChevronRight
                    size={16}
                    className="shrink-0 text-terra-muted group-hover:text-terra-primary-ink"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {!searching && searched && results.length === 0 && !error && (
        <Panel>
          <EmptyState icon={Search} title="Sin coincidencias">
            No hay equipos que coincidan con «{query.trim()}». Revisa el código completo o prueba
            con el correo del agricultor.
          </EmptyState>
        </Panel>
      )}

      {!searched && !error && (
        <Panel>
          <EmptyState icon={ShieldAlert} title="Empieza por una búsqueda">
            Si prefieres recorrer el parque completo en vez de buscar un equipo concreto, la
            sección <strong className="text-terra-text">Flota</strong> lista todas las sondas con
            su estado.
          </EmptyState>
        </Panel>
      )}
    </div>
  );
}

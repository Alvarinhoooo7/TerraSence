// src/pages/SearchPage.tsx — buscar un equipo por ID o por el correo de un cliente.
//
// La búsqueda vive en la URL (`/buscar?q=`): volver desde la pantalla del
// equipo recupera los resultados, y un enlace pegado repite la búsqueda.

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, SearchX } from 'lucide-react';
import { friendlyError, searchDevices } from '../../backend/adminApi';
import type { SearchRow } from '../../backend/types';
import { SearchBar } from '../components/SearchBar';
import { RoleBadge } from '../components/RoleBadge';
import { EmptyState, Notice, SkeletonRows } from '../ui/Feedback';
import { formatDeviceCode, personName } from '../utils/format';

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q')?.trim() ?? '';
  const navigate = useNavigate();
  const [rows, setRows] = useState<SearchRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      setRows(await searchDevices(q));
    } catch (e) {
      setError(friendlyError(e));
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query.length >= 3) void run(query);
    else setRows(null);
  }, [query, run]);

  const open = (row: SearchRow) =>
    navigate(`/equipo/${row.device_id}`, { state: { from: `/buscar?q=${encodeURIComponent(query)}` } });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Buscar equipo</h1>
        <div className="mt-5 max-w-2xl">
          <SearchBar initial={query} size="lg" autoFocus={!query} />
          <p className="mt-2.5 text-[13px] text-muted">
            Escribe el ID del equipo (15 dígitos, con o sin guiones) o el correo de cualquier usuario enlazado,
            sea administrador o no. Un correo puede tener varios equipos, y un equipo varios usuarios.
          </p>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {loading && (
        <div className="rounded-lg border border-line bg-surface">
          <SkeletonRows rows={4} label="Buscando" />
        </div>
      )}

      {!loading && rows && rows.length === 0 && (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState icon={SearchX} title={`Sin resultados para «${query}»`}>
            Revisa el ID completo o prueba con el correo exacto del usuario.
          </EmptyState>
        </div>
      )}

      {!loading && rows && rows.length > 0 && (
        <section aria-labelledby="resultados" className="overflow-hidden rounded-lg border border-line bg-surface">
          <h2 id="resultados" className="border-b border-line px-5 py-3 text-[13px] text-muted">
            {rows.length} {rows.length === 1 ? 'resultado' : 'resultados'}
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="hidden text-xs text-muted sm:table-header-group">
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-2.5 font-medium">ID</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Cliente</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Correo</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Rol</th>
                <th scope="col" className="w-10"><span className="sr-only">Abrir</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row, i) => (
                <tr
                  key={`${row.device_id}-${row.user_id ?? 'libre'}-${i}`}
                  onClick={() => open(row)}
                  className="group grid cursor-pointer grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-5 py-3 hover:bg-hover
                    sm:table-row sm:px-0 sm:py-0"
                >
                  <td className="font-mono text-[13px] text-ink tabular sm:px-5 sm:py-3.5">
                    {/* El enlace da foco y teclado a la fila; el clic de la fila es un atajo. */}
                    <a
                      href={`/equipo/${row.device_id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        open(row);
                      }}
                      className="rounded-sm focus-visible:outline-offset-4"
                    >
                      {formatDeviceCode(row.device_code)}
                    </a>
                  </td>
                  <td className="row-start-2 font-medium text-ink sm:px-3 sm:py-3.5">
                    {row.user_id ? personName(row.first_name, row.last_name) : (
                      <span className="font-normal text-muted">Sin usuarios enlazados</span>
                    )}
                  </td>
                  <td className="row-start-3 break-all text-muted sm:px-3 sm:py-3.5">{row.email ?? ''}</td>
                  <td className="col-start-2 row-start-1 sm:px-3 sm:py-3.5">
                    {row.user_id && <RoleBadge role={row.role} authorized={row.is_authorized} />}
                  </td>
                  <td className="hidden pr-4 text-faint group-hover:text-ink sm:table-cell">
                    <ChevronRight size={17} aria-hidden="true" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

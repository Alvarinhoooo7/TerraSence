// src/components/FirmwareView.tsx
//
// Catálogo de versiones de firmware para OTA.
//
// La consola es de SOLO LECTURA sobre esta tabla, y a propósito. La política
// RLS sólo expone las versiones publicadas, y la escritura está reservada al
// rol de servicio: publicar firmware que se instalará sin supervisión en
// equipos repartidos por el campo no es una operación de usuario final.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import type { Device } from '../types';
import { relativeTime } from '../utils/verdict';

interface FirmwareRelease {
  id: string;
  version: string;
  hardware_target: string;
  binary_url: string | null;
  sha256: string | null;
  size_bytes: number | null;
  release_notes: string | null;
  is_mandatory: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

/** Compara versiones semánticas por componentes, no como texto. */
const compareVersions = (a: string, b: string): number => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
};

const humanSize = (bytes: number | null): string =>
  bytes == null ? '—' : `${(bytes / 1024).toFixed(0)} KB`;

export function FirmwareView({ devices }: { devices: Device[] }) {
  const [releases, setReleases] = useState<FirmwareRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('firmware_releases')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setReleases((data ?? []) as FirmwareRelease[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Última versión publicada por plataforma de hardware. */
  const latestByTarget = useMemo(() => {
    const m = new Map<string, FirmwareRelease>();
    for (const r of releases) {
      if (!r.is_published) continue;
      const cur = m.get(r.hardware_target);
      if (!cur || compareVersions(r.version, cur.version) > 0) m.set(r.hardware_target, r);
    }
    return m;
  }, [releases]);

  /** Equipos que están por detrás de la última versión publicada. */
  const outdated = useMemo(
    () =>
      devices.filter((d) => {
        const latest = latestByTarget.get(d.hardware_version);
        return latest ? compareVersions(latest.version, d.firmware_version) > 0 : false;
      }),
    [devices, latestByTarget],
  );

  if (loading) return <p className="text-terra-muted">Cargando firmware…</p>;

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg bg-verdict-red/15 text-verdict-red p-4 text-sm">
          {error}
        </p>
      )}

      {/* Estado del parque de equipos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Versiones publicadas" value={releases.filter((r) => r.is_published).length} />
        <Stat label="Equipos al día" value={devices.length - outdated.length} tone="text-verdict-green" />
        <Stat
          label="Equipos desactualizados"
          value={outdated.length}
          tone={outdated.length > 0 ? 'text-verdict-amber' : undefined}
        />
      </div>

      {outdated.length > 0 && (
        <div className="rounded-xl border border-verdict-amber/40 bg-verdict-amber/10 p-4">
          <h3 className="font-semibold text-verdict-amber mb-2">
            ! {outdated.length} equipo{outdated.length === 1 ? '' : 's'} por actualizar
          </h3>
          <ul className="text-sm space-y-1">
            {outdated.map((d) => {
              const latest = latestByTarget.get(d.hardware_version);
              return (
                <li key={d.id} className="text-terra-muted">
                  <span className="text-terra-text">{d.alias || d.name}</span> ·{' '}
                  <span className="tabular">{d.firmware_version}</span> →{' '}
                  <span className="tabular text-terra-primary">{latest?.version}</span>
                  {latest?.is_mandatory && (
                    <span className="ml-2 text-verdict-red">obligatoria</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-terra-muted mt-3">
            La actualización la inicia el equipo, no la consola: consulta{' '}
            <code>check_firmware_update()</code> y descarga sólo si hay versión superior.
          </p>
        </div>
      )}

      {/* Catálogo */}
      {releases.length === 0 ? (
        <div className="rounded-xl border border-terra-border p-8 text-center">
          <p className="text-terra-muted mb-2">
            Todavía no hay versiones de firmware publicadas.
          </p>
          <p className="text-xs text-terra-muted max-w-lg mx-auto">
            La publicación se hace con la clave de servicio, no desde esta consola: un binario que se
            instalará sin supervisión en equipos repartidos por el campo no debe poder publicarse con
            una sesión de navegador.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-terra-border">
          <table className="w-full text-sm">
            <thead className="bg-terra-surface">
              <tr>
                {['Versión', 'Hardware', 'Estado', 'Tamaño', 'SHA-256', 'Publicada'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-terra-muted whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {releases.map((r) => (
                <tr key={r.id} className="border-t border-terra-border">
                  <td className="px-4 py-3 tabular font-semibold text-terra-primary">
                    {r.version}
                    {r.is_mandatory && (
                      <span className="ml-2 text-xs text-verdict-red">obligatoria</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.hardware_target}</td>
                  <td className="px-4 py-3">
                    {r.is_published ? (
                      <span className="text-verdict-green">✓ Publicada</span>
                    ) : (
                      <span className="text-terra-muted">Borrador</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular">{humanSize(r.size_bytes)}</td>
                  <td className="px-4 py-3">
                    {r.sha256 ? (
                      <code className="text-xs text-terra-muted">
                        {r.sha256.slice(0, 12)}…
                      </code>
                    ) : (
                      <span className="text-verdict-red text-xs">sin firma</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-terra-muted">
                    {relativeTime(r.published_at ?? r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details className="rounded-xl border border-terra-border bg-terra-surface p-4">
        <summary className="cursor-pointer font-semibold text-sm">
          Cómo publicar una versión nueva
        </summary>
        <p className="text-sm text-terra-muted mt-3 mb-3">
          Se ejecuta con la clave de servicio. Entra como borrador: nadie la recibe hasta marcarla
          publicada, y sólo después de probarla en un equipo real.
        </p>
        <pre className="text-xs bg-terra-bg rounded-lg p-3 overflow-x-auto">{`insert into firmware_releases
  (version, hardware_target, binary_url, sha256, size_bytes, release_notes)
values
  ('1.1.0', 'ESP32-WROOM-32',
   'https://…/terrasense-1.1.0.bin',
   '<sha256 del binario>', 892340,
   'Corrige el tiempo de estabilización de la sonda');

-- Sólo tras verificarla en un equipo real:
update firmware_releases
   set is_published = true, published_at = now()
 where version = '1.1.0';`}</pre>
        <p className="text-xs text-verdict-amber mt-3">
          El SHA-256 no es opcional: el equipo debe verificarlo antes de conmutar la partición. Un
          OTA sin verificación de integridad es un vector de ataque.
        </p>
      </details>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-terra-border bg-terra-surface p-4">
      <div className="text-xs font-semibold tracking-wide text-terra-muted uppercase">
        {label}
      </div>
      <div className={`text-3xl font-bold tabular mt-1 ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

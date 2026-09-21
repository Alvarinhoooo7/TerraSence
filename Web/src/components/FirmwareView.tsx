// src/components/FirmwareView.tsx — catálogo de versiones de firmware.
//
// La consola es de SOLO LECTURA sobre `firmware_releases`, y a propósito: la
// política `ts_firmware_select_published` sólo expone las versiones publicadas
// y la escritura está reservada al rol de servicio. Publicar un binario que se
// instalará sin supervisión en equipos repartidos por el campo no es una
// operación que deba poder hacerse con una sesión de navegador.
//
// Consecuencia práctica de esa política: la columna «estado» no puede mostrar
// borradores, porque los borradores no llegan al cliente. Se conserva la
// distinción porque el mismo componente sirve si algún día se lee con una
// sesión de servicio, pero la página lo dice en vez de sugerir que el catálogo
// completo está a la vista.

import { HardDriveDownload, ShieldAlert } from 'lucide-react';
import type { FirmwareRelease } from '../types';
import { Panel, PanelHeader, PanelNote } from '../ui/Panel';
import { Badge, TableScroll } from '../ui/Data';
import { EmptyState, TableSkeleton } from '../ui/Feedback';
import { absoluteDate, formatVersion } from '../utils/format';

const humanSize = (bytes: number | null): string =>
  bytes == null ? '—' : bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function FirmwareView({
  releases,
  loading,
}: {
  releases: FirmwareRelease[];
  loading: boolean;
}) {
  return (
    <Panel>
      <PanelHeader
        icon={HardDriveDownload}
        title={`Versiones publicadas (${releases.length})`}
        hint="Sólo lectura"
      />

      {loading ? (
        <TableSkeleton label="Cargando el catálogo de firmware" rows={4} />
      ) : releases.length === 0 ? (
        <EmptyState icon={HardDriveDownload} title="Todavía no hay versiones publicadas">
          La publicación se hace con la clave de servicio, no desde esta consola: un binario que se
          instalará sin supervisión en equipos repartidos por el campo no debe poder publicarse con
          una sesión de navegador.
        </EmptyState>
      ) : (
        <TableScroll label="Catálogo de firmware" maxHeight="28rem">
          <table className="data-table w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-5 py-2.5">Versión</th>
                <th className="px-3 py-2.5">Plataforma</th>
                <th className="px-3 py-2.5">Tamaño</th>
                <th className="px-3 py-2.5">SHA-256</th>
                <th className="px-3 py-2.5">Publicada</th>
                <th className="px-3 py-2.5">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terra-border">
              {releases.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-2.5">
                    <span className="tabular font-mono font-semibold text-terra-text">
                      {formatVersion(r.version)}
                    </span>
                    {r.is_mandatory && (
                      <Badge tone="amber" className="ml-2">
                        Obligatoria
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                    {r.hardware_target}
                  </td>
                  <td className="tabular px-3 py-2.5">{humanSize(r.size_bytes)}</td>
                  <td className="px-3 py-2.5">
                    {r.sha256 ? (
                      <code className="font-mono text-xs text-terra-muted" title={r.sha256}>
                        {r.sha256.slice(0, 12)}…
                      </code>
                    ) : (
                      <Badge tone="red" icon={ShieldAlert}>
                        Sin firma
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-terra-muted">
                    {absoluteDate(r.published_at ?? r.created_at)}
                  </td>
                  <td className="max-w-[22rem] px-3 py-2.5 text-terra-muted">
                    <span className="line-clamp-2">{r.release_notes ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}

      <PanelNote icon={ShieldAlert} tone="warning">
        El SHA-256 no es opcional: la sonda debe verificarlo antes de conmutar la partición. Un OTA
        sin verificación de integridad es un vector de ataque. Los borradores no aparecen aquí
        porque la política RLS no los expone a una sesión de navegador.
      </PanelNote>
    </Panel>
  );
}

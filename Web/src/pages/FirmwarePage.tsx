// src/pages/FirmwarePage.tsx — catálogo OTA y contraste con la flota.
//
// El contraste entre versión instalada y versión publicada lo calcula ahora
// Postgres, no el navegador: `admin_list_fleet()` devuelve `firmware_status`
// por equipo. La versión anterior lo resolvía en el cliente comparando
// `devices.hardware_version` con `firmware_releases.hardware_target` — dos
// columnas que usaban nomenclaturas distintas ('v2.0-nRF52840' frente a
// 'ESP32-WROOM-32') — y con un `compareVersions` que sobre 'v2.1.0-BLE'
// devolvía NaN. El resultado era que ningún equipo podía salir nunca como
// desactualizado. La migración 20260921120000 normaliza ambas columnas.

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HardDriveDownload, RefreshCw, TriangleAlert } from 'lucide-react';
import { listFleet } from '../../backend/adminApi';
import type { FleetDevice } from '../../backend/types';
import type { FirmwareRelease } from '../types';
import { supabase } from '../services/supabase';
import { PageHeader } from '../ui/PageHeader';
import { Panel, PanelHeader } from '../ui/Panel';
import { Button } from '../ui/Button';
import { Badge, DeviceCode, StatTile } from '../ui/Data';
import { Alert, EmptyState } from '../ui/Feedback';
import { FirmwareView } from '../components/FirmwareView';
import { formatVersion } from '../utils/format';

export function FirmwarePage() {
  const [releases, setReleases] = useState<FirmwareRelease[]>([]);
  const [fleet, setFleet] = useState<FleetDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // El catálogo completo necesita columnas que `listPublishedFirmware` no
      // trae (tamaño, SHA-256); la llamada a la tabla sigue acotada por la
      // política `ts_firmware_select_published`.
      const [cat, flota] = await Promise.all([
        supabase
          .from('firmware_releases')
          .select('*')
          .order('published_at', { ascending: false, nullsFirst: false }),
        listFleet(),
      ]);
      if (cat.error) throw cat.error;
      setReleases((cat.data ?? []) as unknown as FirmwareRelease[]);
      setFleet(flota);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const outdated = fleet.filter((d) => d.firmware_status === 'desactualizado');
  const noCatalog = fleet.filter((d) => d.firmware_status === 'sin_catalogo');
  const upToDate = fleet.filter((d) => d.firmware_status === 'al_dia');

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Firmware OTA"
        icon={HardDriveDownload}
        description="Catálogo de versiones publicadas para las sondas y estado de la flota frente a él."
        actions={
          <Button size="sm" icon={RefreshCw} onClick={() => void load()} busy={loading}>
            Actualizar
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Versiones publicadas" value={releases.length} />
        <StatTile label="Equipos al día" value={upToDate.length} tone="green" />
        <StatTile
          label="Equipos atrasados"
          value={outdated.length}
          tone={outdated.length > 0 ? 'amber' : 'neutral'}
        />
        <StatTile
          label="Sin catálogo"
          value={noCatalog.length}
          hint="Plataforma sin ninguna versión publicada"
        />
      </div>

      {outdated.length > 0 && (
        <Panel>
          <PanelHeader
            icon={TriangleAlert}
            tone="support"
            title={`${outdated.length} equipo${outdated.length === 1 ? '' : 's'} por actualizar`}
          />
          <ul className="divide-y divide-terra-border">
            {outdated.map((d) => (
              <li key={d.device_id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
                <Link
                  to={`/admin/devices/${d.device_id}`}
                  className="font-medium text-terra-text hover:text-terra-primary-ink hover:underline"
                >
                  {d.alias || d.name}
                </Link>
                <DeviceCode code={d.device_code} />
                <span className="tabular font-mono text-xs text-terra-muted">
                  {formatVersion(d.firmware_version)} → {formatVersion(d.latest_version)}
                </span>
                <Badge tone="neutral">{d.hardware_version}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {!loading && noCatalog.length > 0 && (
        <Alert tone="warning">
          {noCatalog.length} equipo{noCatalog.length === 1 ? '' : 's'} declara
          {noCatalog.length === 1 ? '' : 'n'} una plataforma de hardware sin ninguna versión
          publicada:{' '}
          {[...new Set(noCatalog.map((d) => d.hardware_version))].join(', ')}. Hasta que exista una
          versión con ese <code className="font-mono">hardware_target</code>, ni la app ni la
          consola pueden ofrecerles una actualización.
        </Alert>
      )}

      {!loading && fleet.length === 0 && (
        <Panel>
          <EmptyState icon={HardDriveDownload} title="No hay equipos registrados">
            El contraste de versiones aparece en cuanto haya sondas en el inventario.
          </EmptyState>
        </Panel>
      )}

      <FirmwareView releases={releases} loading={loading} />

      <Panel>
        <PanelHeader icon={HardDriveDownload} title="Cómo publicar una versión nueva" />
        <div className="flex flex-col gap-3 p-5">
          <p className="text-sm leading-relaxed text-terra-muted">
            Se ejecuta con la clave de servicio. La versión entra como borrador: nadie la recibe
            hasta marcarla publicada, y sólo después de probarla en un equipo real.{' '}
            <code className="font-mono text-xs">hardware_target</code> debe coincidir exactamente
            con <code className="font-mono text-xs">devices.hardware_version</code>, y{' '}
            <code className="font-mono text-xs">version</code> seguir el formato X.Y.Z que exige la
            restricción de la tabla.
          </p>
          <pre className="overflow-x-auto rounded-md border border-terra-border bg-terra-raised p-3 font-mono text-xs leading-relaxed">
{`insert into firmware_releases
  (version, hardware_target, binary_url, sha256, size_bytes, release_notes)
values
  ('1.1.0', 'ESP32-WROOM-32',
   'https://…/terrasense-1.1.0.bin',
   '<sha256 del binario>', 892340,
   'Corrige el tiempo de estabilización de la sonda');

-- Sólo tras verificarla en un equipo real:
update firmware_releases
   set is_published = true, published_at = now()
 where version = '1.1.0';`}
          </pre>
        </div>
      </Panel>
    </div>
  );
}

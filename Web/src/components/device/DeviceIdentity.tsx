// src/components/device/DeviceIdentity.tsx — identidad, conectividad y firmware.
//
// Tres correcciones respecto a la versión anterior:
//   * el código de 15 dígitos se rotulaba «UUID». No lo es: el UUID es
//     `devices.id`, y es lo que va en la URL, no lo que el operador le pide al
//     agricultor por teléfono.
//   * el título usaba `text-white`, que en tema claro dejaba el nombre del
//     equipo ilegible sobre fondo claro.
//   * «al día» se mostraba también cuando no existía ninguna versión publicada
//     para esa plataforma. Ahora se distinguen los cuatro estados reales.

import type { ReactNode } from 'react';
import { Battery, Calendar, Cpu, MapPin, Radio, Timer } from 'lucide-react';
import type { DeviceDetail } from '../../../backend/types';
import { FIRMWARE_STATUS_LABEL } from '../../../backend/types';
import { Panel, PanelHeader } from '../../ui/Panel';
import { Badge, BatteryBar, DeviceCode, ReportStatus } from '../../ui/Data';
import { absoluteTime, formatVersion, num, reportedRecently } from '../../utils/format';

const FIRMWARE_EXPLAIN: Record<DeviceDetail['firmware_status'], string> = {
  al_dia: 'Coincide con la última versión publicada para su plataforma.',
  desactualizado: 'Hay una versión superior publicada para su plataforma.',
  sin_catalogo: 'No hay ninguna versión publicada para esta plataforma de hardware.',
  version_ilegible:
    'El equipo reportó una versión que no sigue el formato X.Y.Z, así que no se puede comparar.',
};

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-terra-border py-2.5 last:border-0">
      <dt className="flex items-center gap-1.5 text-sm text-terra-muted">
        <Icon size={14} aria-hidden="true" />
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm text-terra-text">{children}</dd>
    </div>
  );
}

export function DeviceIdentity({ detail }: { detail: DeviceDetail }) {
  const { device, last_location, latest_published_firmware, firmware_status } = detail;
  const online = reportedRecently(device.last_seen_at);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Panel>
        <PanelHeader icon={Cpu} title="Identidad del equipo" />
        <dl className="px-5 py-1">
          <Row icon={Cpu} label="Código de vinculación">
            <DeviceCode code={device.device_code} />
          </Row>
          <Row icon={Radio} label="Plataforma de hardware">
            <span className="font-mono text-xs">{device.hardware_version}</span>
          </Row>
          <Row icon={Radio} label="Sensor de microclima">
            <span className="font-mono text-xs">{device.microclimate_sensor_type}</span>
          </Row>
          <Row icon={Timer} label="Intervalo de transmisión">
            <span className="tabular">{device.transmission_interval_seconds} s</span>
          </Row>
          <Row icon={Battery} label="Batería">
            <BatteryBar level={device.battery_level} />
          </Row>
          <Row icon={Calendar} label="Alta del equipo">
            {absoluteTime(device.created_at)}
          </Row>
          <Row icon={MapPin} label="Última posición con GPS">
            {last_location ? (
              <span className="tabular font-mono text-xs">
                {num(last_location.latitude, 5)}, {num(last_location.longitude, 5)}
                <span className="ml-1.5 font-sans text-terra-muted">
                  ({last_location.field_name}
                  {last_location.gps_accuracy_m != null
                    ? ` · ±${num(last_location.gps_accuracy_m, 0)} m`
                    : ''}
                  )
                </span>
              </span>
            ) : (
              <span className="text-terra-muted">Sin mediciones georreferenciadas</span>
            )}
          </Row>
        </dl>
      </Panel>

      <Panel>
        <PanelHeader icon={Radio} title="Estado operativo" />
        <div className="flex flex-col gap-3 p-5">
          <div
            className={`rounded-md border px-4 py-3 ${
              online
                ? 'border-verdict-green/30 bg-verdict-green-soft'
                : 'border-terra-border bg-terra-raised'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold tracking-wide text-terra-muted uppercase">
                Reporte
              </span>
              <ReportStatus lastSeenAt={device.last_seen_at} online={online} />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-terra-muted">
              Último reporte recibido: {absoluteTime(device.last_seen_at)}. `last_seen_at` registra
              cuándo llegó el último dato, no si hay una conexión BLE viva ahora mismo.
            </p>
          </div>

          <div className="rounded-md border border-terra-border bg-terra-raised px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold tracking-wide text-terra-muted uppercase">
                Firmware
              </span>
              <Badge
                tone={
                  firmware_status === 'desactualizado'
                    ? 'amber'
                    : firmware_status === 'al_dia'
                      ? 'green'
                      : 'neutral'
                }
              >
                {FIRMWARE_STATUS_LABEL[firmware_status]}
              </Badge>
            </div>
            <p className="tabular mt-1.5 font-mono text-sm text-terra-text">
              {formatVersion(device.firmware_version)}
              {latest_published_firmware && (
                <span className="text-terra-muted">
                  {' → '}
                  {formatVersion(latest_published_firmware.version)} publicada
                  {latest_published_firmware.is_mandatory ? ' (obligatoria)' : ''}
                </span>
              )}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-terra-muted">
              {FIRMWARE_EXPLAIN[firmware_status]}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-terra-muted">
            <Badge tone={device.is_active ? 'green' : 'neutral'}>
              {device.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
            <Badge tone={device.pairing_mode_active ? 'amber' : 'neutral'}>
              {device.pairing_mode_active ? 'Emparejamiento abierto' : 'Emparejamiento cerrado'}
            </Badge>
            <Badge tone="neutral">Generación de datos {device.data_generation}</Badge>
          </div>
        </div>
      </Panel>
    </div>
  );
}

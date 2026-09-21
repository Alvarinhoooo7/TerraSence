// src/utils/format.ts
//
// Presentación de los valores que la consola repite en todas las pantallas.
// Vive aparte de `verdict.ts` porque nada de esto depende del semáforo.

/** Presenta el código de equipo en tres bloques: 48213-90574-16628 */
export const formatDeviceCode = (raw?: string | null): string => {
  const clean = digitsOnly(raw);
  return clean.length === 15 ? clean.replace(/(\d{5})(\d{5})(\d{5})/, '$1-$2-$3') : clean;
};

/** Sólo los dígitos, como los guarda `devices.device_code`. Sirve tanto para
 * buscar como para comparar el código que teclea el operador de soporte con el
 * del equipo: la consola se lo enseña con guiones, así que copiarlo y pegarlo
 * tiene que funcionar. */
export const digitsOnly = (raw?: string | null): string =>
  (raw ?? '').replace(/\D/g, '').slice(0, 15);

/** Alias histórico de `digitsOnly`, conservado por los sitios que lo llaman. */
export const normalizeDeviceCode = digitsOnly;

/**
 * Versión de firmware lista para mostrar.
 *
 * `devices.firmware_version` llegó a guardar 'v2.1.0-BLE' mientras
 * `firmware_releases.version` exige '2.1.0'. La migración
 * `20260921120000` normaliza lo almacenado, pero la Edge Function
 * `device-checkin` escribe lo que reporte el equipo, así que la pantalla no
 * puede dar por hecho el formato — ni anteponer otra «v» a la que ya venía.
 */
export const formatVersion = (raw?: string | null): string => {
  const value = (raw ?? '').trim();
  if (!value) return '—';
  return value.startsWith('v') ? value : `v${value}`;
};

/** Tiempo relativo en español, para columnas de «última conexión». */
export const relativeTime = (iso: string | null | undefined): string => {
  if (!iso) return 'nunca';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 0) return 'en el futuro';
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} días`;
  const meses = Math.round(d / 30);
  return meses < 12 ? `hace ${meses} meses` : `hace ${Math.round(d / 365)} años`;
};

/** Fecha y hora completas, en el formato de Chile. */
export const absoluteTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  return new Date(ms).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Sólo la fecha. */
export const absoluteDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? '—' : new Date(ms).toLocaleDateString('es-CL');
};

/**
 * Número con decimales fijos, o una raya si no hay dato.
 *
 * PostgREST devuelve los `numeric` como cadena cuando exceden la precisión de
 * un double, así que se acepta `string` y se convierte aquí en vez de confiar
 * en que siempre llegue `number`.
 */
export const num = (
  value: number | string | null | undefined,
  decimals = 1,
  unit = '',
): string => {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n == null || !Number.isFinite(n)) return '—';
  const text = n.toFixed(decimals);
  return unit ? `${text} ${unit}` : text;
};

/** Entero redondeado, o raya. */
export const int = (value: number | string | null | undefined, unit = ''): string =>
  num(value, 0, unit);

/** Ventana en la que se considera que un equipo reportó hace poco. */
export const ONLINE_WINDOW_MS = 3_600_000;

export const reportedRecently = (lastSeenAt: string | null | undefined): boolean => {
  if (!lastSeenAt) return false;
  const ms = Date.parse(lastSeenAt);
  return !Number.isNaN(ms) && Date.now() - ms < ONLINE_WINDOW_MS;
};

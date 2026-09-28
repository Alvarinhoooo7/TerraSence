// src/utils/format.ts — presentación de los valores del backoffice.
//
// Números con coma decimal, como se escriben en Chile. PostgREST entrega los
// `numeric` como cadena cuando exceden un double, así que todo acepta cadena.

type Numeric = number | string | null | undefined;

const toNumber = (value: Numeric): number | null => {
  const n = typeof value === 'string' ? Number(value) : value;
  return n == null || !Number.isFinite(n) ? null : n;
};

/** Sólo los dígitos: el ID se guarda así y el operador puede pegarlo con guiones. */
export const digitsOnly = (raw?: string | null): string => (raw ?? '').replace(/\D/g, '').slice(0, 15);

/** ID del equipo en tres bloques: 48213-90574-16628. */
export const formatDeviceCode = (raw?: string | null): string => {
  const clean = digitsOnly(raw);
  return clean.length === 15 ? clean.replace(/(\d{5})(\d{5})(\d{5})/, '$1-$2-$3') : clean;
};

/** Número con decimales fijos y coma decimal, o una raya si no hay dato. */
export const num = (value: Numeric, decimals = 1, unit = ''): string => {
  const n = toNumber(value);
  if (n == null) return '—';
  const text = n.toFixed(decimals).replace('.', ',');
  return unit ? `${text} ${unit}` : text;
};

/** Coordenada tal cual se pide en la tabla de mediciones: «-30,008954 ; -71,482579». */
export const formatCoordinate = (lat: Numeric, lng: Numeric): string => {
  const a = toNumber(lat);
  const b = toNumber(lng);
  if (a == null || b == null) return 'Sin GPS';
  return `${num(a, 6)} ; ${num(b, 6)}`;
};

const pad = (n: number) => String(n).padStart(2, '0');

const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : new Date(ms);
};

/** Fecha y hora exactas, con segundos: 28-09-2026 14:03:27. */
export const exactDateTime = (iso: string | null | undefined): string => {
  const d = parse(iso);
  if (!d) return '—';
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`;
};

/** Fecha y hora sin segundos: 28-09-2026 14:03. */
export const dateTime = (iso: string | null | undefined): string => exactDateTime(iso).slice(0, 16);

/** Día y mes: 28-09. */
export const dayMonth = (iso: string | null | undefined): string => {
  const d = parse(iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);
  return d ? `${pad(d.getDate())}-${pad(d.getMonth() + 1)}` : '—';
};

/** Tiempo relativo: «hace 3 min», «hace 2 h», «ayer». */
export const relativeTime = (iso: string | null | undefined, now = Date.now()): string => {
  const d = parse(iso);
  if (!d) return '';
  const min = Math.floor((now - d.getTime()) / 60000);
  if (min < 1) return 'hace instantes';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  return months < 12 ? `hace ${months} ${months === 1 ? 'mes' : 'meses'}` : `hace ${Math.floor(days / 365)} años`;
};

/** Nombre y apellido; el correo si el perfil no trae nombre. */
export const personName = (
  first: string | null | undefined,
  last: string | null | undefined,
  fallback = '—',
): string => [first, last].map((s) => (s ?? '').trim()).filter(Boolean).join(' ') || fallback;

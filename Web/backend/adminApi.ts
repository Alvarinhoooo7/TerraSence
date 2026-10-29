// Web/backend/adminApi.ts
//
// Acceso a datos del backoffice. Cada función envuelve una RPC de
// `supabase/migrations_archivo/20260927120200_funciones_backoffice.sql`. Todas exigen
// la sesión de la cuenta de soporte: con cualquier otra, Postgres responde
// 42501 y aquí se propaga como excepción.

import { supabaseAdmin as supabase } from './supabaseAdmin';
import { MEASUREMENTS_PAGE } from './types';
import type {
  DeviceMember,
  DeviceSpecies,
  DeviceStatus,
  DeviceUpdate,
  Measurement,
  MeasurementFilters,
  Release,
  ReleaseDevice,
  ResetResult,
  SearchRow,
  SendResult,
} from './types';

/** Mensaje legible para la interfaz; nunca el detalle técnico de Postgres. */
export function friendlyError(error: unknown): string {
  const e = error as { code?: string; message?: string } | null;
  if (e?.code === '42501') return 'Tu sesión ya no tiene acceso. Vuelve a iniciar sesión.';
  if (e?.code === 'P0002') return 'No encontramos ese equipo.';
  if (e?.code === '22023' && e.message) return e.message;
  if (e?.message && /fetch|network/i.test(e.message)) return 'Sin conexión con el servidor. Reintenta.';
  return 'No se pudo completar la operación. Reintenta en un momento.';
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  // Los nombres de función se tipan contra `database.types.ts`; el resultado se
  // reinterpreta con los tipos de dominio, que sí conocen la nulabilidad.
  const { data, error } = await (supabase.rpc as unknown as (
    f: string,
    a?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>)(fn, args);
  if (error) throw error;
  return data as T;
}

/** true sólo para la cuenta de soporte con sesión válida. */
export async function isSupportStaff(): Promise<boolean> {
  return Boolean(await call<boolean>('is_support_staff'));
}

export const searchDevices = (query: string) =>
  call<SearchRow[]>('admin_search', { p_query: query }).then((rows) => rows ?? []);

export async function getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
  const rows = await call<DeviceStatus[]>('admin_device_status', { p_device_id: deviceId });
  const row = rows?.[0];
  if (!row) throw { code: 'P0002' };
  return row;
}

export const getDeviceMembers = (deviceId: string) =>
  call<DeviceMember[]>('admin_device_members', { p_device_id: deviceId }).then((r) => r ?? []);

/**
 * Lecturas del equipo, filtradas en el servidor. Filtrar allá y no aquí es lo que permite
 * dividir el historial completo de un cliente sin descargarlo entero en cada cambio de
 * filtro.
 */
export const getDeviceMeasurements = (deviceId: string, filters: MeasurementFilters = {}) =>
  call<Measurement[]>('admin_device_measurements', {
    p_device_id: deviceId,
    p_limit: filters.limit ?? MEASUREMENTS_PAGE,
    p_offset: filters.offset ?? 0,
    p_stage: filters.stage ?? null,
    p_species_id: filters.speciesId ?? null,
    p_without_species: filters.withoutSpecies ?? false,
  }).then((r) => r ?? []);

/**
 * Especies que alguna vez se midieron con el equipo, con su recuento. Son las opciones del
 * filtro: no se pueden deducir de unas filas ya filtradas ni de una sola página.
 */
export const getDeviceSpecies = (deviceId: string) =>
  call<DeviceSpecies[]>('admin_device_species', { p_device_id: deviceId }).then((r) => r ?? []);

export const makeAdmin = (deviceId: string, userId: string) =>
  call<void>('admin_make_admin', { p_device_id: deviceId, p_user_id: userId });

export const approveMember = (deviceId: string, userId: string) =>
  call<void>('admin_approve_member', { p_device_id: deviceId, p_user_id: userId });

export const rejectMember = (deviceId: string, userId: string) =>
  call<void>('admin_reject_member', { p_device_id: deviceId, p_user_id: userId });

export const resetDevice = (deviceId: string) =>
  call<ResetResult>('admin_reset_device', { p_device_id: deviceId });

/**
 * Pide el código de recuperación. La función responde igual para cualquier
 * correo y sólo envía a la cuenta de soporte; por eso aquí no hay resultado
 * que interpretar más allá de un fallo de red.
 */
export async function requestRecoveryCode(email: string): Promise<void> {
  const { error } = await supabase.functions.invoke('backoffice-recover', { body: { email } });
  if (error && /fetch|network|Failed to send/i.test(String(error.message))) throw error;
}

// ---------------------------------------------------------------------------
// Actualizaciones de firmware
// ---------------------------------------------------------------------------

export const listReleases = () => call<Release[]>('admin_list_releases').then((r) => r ?? []);

export const getDeviceUpdate = (deviceId: string) =>
  call<DeviceUpdate[]>('admin_device_update', { p_device_id: deviceId }).then((r) => r?.[0] ?? null);

export const listReleaseDevices = (releaseId: string) =>
  call<ReleaseDevice[]>('admin_release_devices', { p_release_id: releaseId }).then((r) => r ?? []);

export const publishRelease = (releaseId: string) =>
  call<void>('admin_publish_release', { p_release_id: releaseId });

export const cancelDeviceUpdate = (deviceId: string) =>
  call<void>('admin_cancel_update', { p_device_id: deviceId });

export async function deleteRelease(releaseId: string): Promise<void> {
  const path = await call<string | null>('admin_delete_release', { p_release_id: releaseId });
  if (path) await supabase.storage.from('firmware').remove([path]);
}

/** Primer byte de una imagen de aplicación del ESP32 (esp_image_header_t.magic). */
const ESP_IMAGE_MAGIC = 0xe9;
const MAX_BINARY_BYTES = 4 * 1024 * 1024;

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sube el binario y registra la versión como borrador. El SHA-256 se calcula
 * aquí, sobre los mismos bytes que se suben: es el que la app y la sonda
 * verifican antes de instalar.
 */
export async function createRelease(input: {
  file: File;
  version: string;
  notes: string;
  mandatory: boolean;
}): Promise<void> {
  const buffer = await input.file.arrayBuffer();
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_BINARY_BYTES) {
    throw { code: '22023', message: 'El archivo debe pesar entre 1 byte y 4 MB.' };
  }
  if (new Uint8Array(buffer, 0, 1)[0] !== ESP_IMAGE_MAGIC) {
    throw {
      code: '22023',
      message: 'El archivo no es un firmware del ESP32. Usa el .bin de la aplicación que genera Arduino IDE.',
    };
  }
  const sha256 = await sha256Hex(buffer);
  const path = `releases/${input.version}.bin`;
  const { error: uploadError } = await supabase.storage
    .from('firmware')
    .upload(path, new Blob([buffer], { type: 'application/octet-stream' }), {
      contentType: 'application/octet-stream',
      upsert: false,
    });
  if (uploadError) {
    const duplicated = /exists|duplicate/i.test(uploadError.message);
    throw { code: '22023', message: duplicated ? `Ya existe un binario para la versión ${input.version}.` : 'No se pudo subir el archivo. Reintenta.' };
  }
  try {
    await call<string>('admin_create_release', {
      p_version: input.version,
      p_notes: input.notes,
      p_sha256: sha256,
      p_size_bytes: buffer.byteLength,
      p_storage_path: path,
      p_is_mandatory: input.mandatory,
    });
  } catch (e) {
    await supabase.storage.from('firmware').remove([path]);
    throw e;
  }
}

async function sendUpdate(body: Record<string, unknown>): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke('backoffice-send-update', { body });
  if (error) {
    // El cuerpo del error trae el mensaje de la RPC (p. ej. «ya tiene esa versión»).
    const context = (error as { context?: Response }).context;
    const detail = context ? await context.json().catch(() => null) : null;
    throw { code: detail?.code ?? '', message: detail?.message ?? error.message };
  }
  return data as SendResult;
}

export const sendUpdateToDevice = (deviceId: string, releaseId: string) =>
  sendUpdate({ device_id: deviceId, release_id: releaseId });

export const sendUpdateToAll = (releaseId: string) => sendUpdate({ release_id: releaseId, all: true });

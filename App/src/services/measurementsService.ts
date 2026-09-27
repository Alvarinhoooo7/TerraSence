import { belongsToRetiredGeneration, historyCacheAffected } from '../utils/deviceReset';
// src/services/measurementsService.ts
//
// Lectura de mediciones para el historial y cola offline-first (store & forward).
//
// La cola es IDEMPOTENTE: cada medición lleva un `client_uuid` generado en el
// teléfono ANTES de intentar el envío. El índice único NO parcial
// (soil_measurements_client_uuid_upsert) hace que un reintento tras recuperar
// cobertura actualice la fila en lugar de duplicarla. Debe ser no parcial:
// PostgREST no puede inferir un índice parcial para ON CONFLICT(client_uuid).

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { createKeyedLock } from '../utils/keyedLock';
import { useAppStore } from '../store/useAppStore';
import { mergeCachedHistories, mergeMeasurementHistory } from '../utils/measurementHistory';
import {
  mapRowToPoint,
  type MeasurementPoint,
  type SoilMeasurementInsert,
  type SoilMeasurementRow,
} from '../types/app';

const QUEUE_KEY = '@terrasense/pending_measurements';
const locked = createKeyedLock();
let resetRevision = 0;
const flushing = new Map<string, Promise<{ sent: number; remaining: number }>>();

interface QueuedMeasurement {
  row: SoilMeasurementInsert;
  queuedAt: string;
}

/** Columnas que necesita el historial. Se piden explícitas para no traer de más. */
const HISTORY_COLUMNS =
  'id,client_uuid,latitude,longitude,gps_accuracy_m,verdict,verdict_title,action_summary,' +
  'phenological_stage,measured_at,ph,ec_us_cm,vwc_percent,soil_temp_c,nitrogen,phosphorus,potassium,canopy_temp_c,canopy_humidity_pct,air_pressure_hpa,battery_percent,diagnosis';

export const newClientUuid = (): string => Crypto.randomUUID();

/** El historial se separa por cuenta y equipo, sin filtrar por nombres de campo. */
export async function loadMeasurementHistory(deviceId?: string | null) {
  const account = await accountQueueKey();
  const key = `${account}/history/${JSON.stringify([null, deviceId ?? null])}`;
  await reconcileDeviceResets().catch(() => undefined);
  const revision = resetRevision;
  const pending = await pendingMeasurementPoints(deviceId);
  let points: MeasurementPoint[];
  let offline = false;
  try {
    points = await fetchMeasurements(deviceId);
  } catch {
    offline = true;
    const raw = await AsyncStorage.getItem(key);
    if (raw !== null) {
      points = JSON.parse(raw);
      if (!Array.isArray(points)) throw new Error('No se pudo leer el historial local.');
    } else {
      // Recuperar los historiales por campo guardados antes de retirar el selector.
      const keys = (await AsyncStorage.getAllKeys()).filter(candidate => {
        const prefix = `${account}/history/`;
        if (!candidate.startsWith(prefix)) return false;
        try {
          const scope = JSON.parse(candidate.slice(prefix.length));
          return Array.isArray(scope) && scope.length === 2 && scope[1] === (deviceId ?? null);
        } catch { return false; }
      });
      points = [];
      for (const [, cached] of await AsyncStorage.multiGet(keys)) {
        if (cached === null) continue;
        const previous = JSON.parse(cached);
        if (!Array.isArray(previous)) throw new Error('No se pudo leer el historial local.');
        points = mergeCachedHistories([points, previous]);
      }
    }
  }
  if (await accountQueueKey() !== account) throw new Error('La cuenta ha cambiado.');
  if (!offline) {
    // A cache write failure must not hide successfully fetched measurements.
    await locked(account, async () => {
      if (revision === resetRevision) await AsyncStorage.setItem(key, JSON.stringify(points));
    }).catch(() => undefined);
  }
  return { points: revision === resetRevision ? mergeMeasurementHistory(points, pending) : [], offline };
}

/** Mediciones del equipo, más recientes primero. */
export async function fetchMeasurements(
  deviceId?: string | null,
  limit = 200,
): Promise<MeasurementPoint[]> {
  let query = supabase
    .from('soil_measurements')
    .select(HISTORY_COLUMNS)
    .order('measured_at', { ascending: false })
    .limit(limit);

  if (deviceId) query = query.eq('device_id', deviceId);
  const { data, error } = await query;

  if (error) throw error;
  return (data as unknown as SoilMeasurementRow[]).map(mapRowToPoint);
}

// ─────────────────────────── Cola local ───────────────────────────

async function accountQueueKey(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Inicia sesión para guardar o sincronizar mediciones.');
  return `${QUEUE_KEY}/${data.session.user.id}`;
}

async function readQueue(key: string): Promise<QueuedMeasurement[]> {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) throw new Error('Cola local dañada: conservar datos y solicitar soporte.');
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      if ('row' in item && 'queuedAt' in item) return [item as QueuedMeasurement];
      // Compatibilidad con la cola de versiones anteriores dentro de la misma
      // clave. Las colas globales antiguas no se adoptan para no cruzar cuentas.
      return [{ row: item as SoilMeasurementInsert, queuedAt: new Date().toISOString() }];
    });
}

async function writeQueue(key: string, items: QueuedMeasurement[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

export async function pendingCount(): Promise<number> {
  return (await readQueue(await accountQueueKey())).length;
}

/** Puntos locales que todavía no están en Supabase, para el historial. */
export async function pendingMeasurementPoints(
  deviceId?: string | null,
): Promise<MeasurementPoint[]> {
  const queue = await readQueue(await accountQueueKey());
  return queue
    .filter(({ row }) => !deviceId || row.device_id === deviceId)
    .map(({ row, queuedAt }) =>
      mapRowToPoint({
        ...row,
        id: row.client_uuid,
        measured_at: row.measured_at ?? queuedAt,
      } as SoilMeasurementRow),
    );
}

/**
 * Guarda una medición. Intenta enviarla; si no hay red la encola.
 * Devuelve `synced` para que la UI pueda distinguir ambos casos sin mentir
 * al usuario sobre el estado real del dato.
 */
export async function saveMeasurement(
  row: SoilMeasurementInsert,
): Promise<{ synced: boolean; point: MeasurementPoint | null }> {
  // Primero se confirma en almacenamiento local. Si Android cierra el proceso
  // durante la petición de red, la lectura sigue disponible para reintentar.
  const key = await accountQueueKey();
  row = { ...row, user_id: key.slice(key.lastIndexOf('/') + 1) };
  await locked(key, async () => {
    const queue = await readQueue(key);
    if (!queue.some((item) => item.row.client_uuid === row.client_uuid)) {
      queue.push({ row, queuedAt: new Date().toISOString() });
      await writeQueue(key, queue);
    }
  });

  try {
    if (await accountQueueKey() !== key) return { synced: false, point: null };
    const { data, error } = await supabase
      .from('soil_measurements')
      .upsert(row, { onConflict: 'client_uuid' })
      .select(HISTORY_COLUMNS)
      .single();

    if (error) throw error;
    await locked(key, async () => {
      const remaining = (await readQueue(key)).filter(item => item.row.client_uuid !== row.client_uuid);
      await writeQueue(key, remaining);
    });
    await AsyncStorage.setItem(`${key}/lastSentAt`, new Date().toISOString()).catch(() => undefined);
    return { synced: true, point: mapRowToPoint(data as unknown as SoilMeasurementRow) };
  } catch {
    return { synced: false, point: null };
  }
}

/**
 * Vacía la cola cuando vuelve la cobertura. Sólo elimina de la cola local lo
 * que el servidor confirmó; lo que falla se conserva para el siguiente intento.
 */
export async function flushQueue(): Promise<{ sent: number; remaining: number }> {
  const key = await accountQueueKey();
  const existing = flushing.get(key);
  if (existing) return existing;
  const work = reconcileDeviceResets().then(() => flushAccount(key));
  flushing.set(key, work);
  try { return await work; } finally { if (flushing.get(key) === work) flushing.delete(key); }
}

async function flushAccount(key: string): Promise<{ sent: number; remaining: number }> {
  const queue = await locked(key, () => readQueue(key));
  if (queue.length === 0) return { sent: 0, remaining: 0 };

  let sent = 0;

  for (const item of queue) {
    if (await accountQueueKey() !== key) break;
    const row = { ...item.row, user_id: key.slice(key.lastIndexOf('/') + 1) };
    const { error } = await supabase
      .from('soil_measurements')
      .upsert(row, { onConflict: 'client_uuid' });
    if (!error) {
      await locked(key, async () => {
        await writeQueue(key, (await readQueue(key)).filter(x => x.row.client_uuid !== item.row.client_uuid));
      });
      await AsyncStorage.setItem(`${key}/lastSentAt`, new Date().toISOString()).catch(() => undefined);
      sent += 1;
    }
  }

  return { sent, remaining: (await readQueue(key)).length };
}

export async function syncStatus() {
  const key = await accountQueueKey();
  return { pending: (await readQueue(key)).length, lastSentAt: await AsyncStorage.getItem(`${key}/lastSentAt`) };
}

/** Purga las copias de un equipo restablecido al reconectar, sin cruzar cuentas. */
export async function reconcileDeviceResets(): Promise<void> {
  const key = await accountQueueKey();
  const { data, error } = await supabase.from('device_data_resets').select('device_id,generation');
  if (error) throw error;
  if (await accountQueueKey() !== key) return;
  await locked(key, async () => {
    for (const reset of data ?? []) {
      const marker = `${key}/reset/${reset.device_id}`;
      if (Number(await AsyncStorage.getItem(marker)) >= reset.generation) continue;
      resetRevision++;
      await writeQueue(key, (await readQueue(key)).filter(item => !belongsToRetiredGeneration(item.row, reset)));
      const caches = (await AsyncStorage.getAllKeys()).filter(k => historyCacheAffected(k, key, reset.device_id));
      if (caches.length) await AsyncStorage.multiRemove(caches);
      const uid = key.slice(key.lastIndexOf('/') + 1);
      const onboardingKey = `@terrasense/onboarding/${uid}`;
      const cached = await AsyncStorage.getItem(onboardingKey);
      if (cached) {
        try {
          const onboarding = JSON.parse(cached);
          onboarding.devices = (onboarding.devices ?? []).filter((d: { id: string; data_generation?: number }) => d.id !== reset.device_id || (d.data_generation ?? 0) >= reset.generation);
          await AsyncStorage.setItem(onboardingKey, JSON.stringify(onboarding));
        } catch { await AsyncStorage.removeItem(onboardingKey); }
      }
      if (await accountQueueKey() === key) {
        const store = useAppStore.getState();
        store.invalidateData();
        if (!store.device || store.device.id === reset.device_id) {
          store.setPoints([]); store.selectPoint(null);
          if (store.device && (store.device.data_generation ?? 0) < reset.generation) store.setDevice(null);
        }
      }
      await AsyncStorage.setItem(marker, String(reset.generation));
    }
  });
}

// src/services/measurementsService.ts
//
// Lectura de mediciones para el mapa y cola offline-first (store & forward).
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
import {
  mapRowToPoint,
  type MapMeasurementPoint,
  type SoilMeasurementInsert,
  type SoilMeasurementRow,
} from '../types/app';

const QUEUE_KEY = '@terrasense/pending_measurements';
const locked = createKeyedLock();
const flushing = new Map<string, Promise<{ sent: number; remaining: number }>>();

interface QueuedMeasurement {
  row: SoilMeasurementInsert;
  queuedAt: string;
}

/** Columnas que necesita el mapa. Se piden explícitas para no traer de más. */
const MAP_COLUMNS =
  'id,latitude,longitude,radius_m,gps_accuracy_m,verdict,verdict_title,action_summary,' +
  'phenological_stage,measured_at,ph,ec_us_cm,vwc_percent,soil_temp_c,nitrogen,phosphorus,potassium';

export const newClientUuid = (): string => Crypto.randomUUID();

/** Mediciones de un predio, más recientes primero. */
export async function fetchMeasurements(
  fieldName: string,
  deviceId?: string | null,
  limit = 200,
): Promise<MapMeasurementPoint[]> {
  let query = supabase
    .from('soil_measurements')
    .select(MAP_COLUMNS)
    .eq('field_name', fieldName)
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

/** Puntos locales que todavía no están en Supabase, para mapa e historial. */
export async function pendingMeasurementPoints(
  fieldName: string,
  deviceId?: string | null,
): Promise<MapMeasurementPoint[]> {
  const queue = await readQueue(await accountQueueKey());
  return queue
    .filter(({ row }) => row.field_name === fieldName && (!deviceId || row.device_id === deviceId))
    .map(({ row, queuedAt }) =>
      mapRowToPoint({
        ...row,
        id: row.client_uuid,
        measured_at: queuedAt,
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
): Promise<{ synced: boolean; point: MapMeasurementPoint | null }> {
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
      .select(MAP_COLUMNS)
      .single();

    if (error) throw error;
    await locked(key, async () => {
      const remaining = (await readQueue(key)).filter(item => item.row.client_uuid !== row.client_uuid);
      await writeQueue(key, remaining);
    });
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
  const work = flushAccount(key);
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
      sent += 1;
    }
  }

  return { sent, remaining: (await readQueue(key)).length };
}

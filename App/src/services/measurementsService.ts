// src/services/measurementsService.ts
//
// Lectura de mediciones para el mapa y cola offline-first (store & forward).
//
// La cola es IDEMPOTENTE: cada medición lleva un `client_uuid` generado en el
// teléfono ANTES de intentar el envío. El índice único parcial de Supabase
// (idx_soil_measurements_client_uuid) hace que un reintento tras recuperar
// cobertura actualice la fila en lugar de duplicarla.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import {
  mapRowToPoint,
  type MapMeasurementPoint,
  type SoilMeasurementInsert,
  type SoilMeasurementRow,
} from '../types/app';

const QUEUE_KEY = '@terrasense/pending_measurements';

/** Columnas que necesita el mapa. Se piden explícitas para no traer de más. */
const MAP_COLUMNS =
  'id,latitude,longitude,radius_m,gps_accuracy_m,verdict,verdict_title,action_summary,' +
  'phenological_stage,measured_at,ph,ec_us_cm,vwc_percent,soil_temp_c,nitrogen,phosphorus,potassium';

export const newClientUuid = (): string => Crypto.randomUUID();

/** Mediciones de un predio, más recientes primero. */
export async function fetchMeasurements(
  fieldName: string,
  limit = 200,
): Promise<MapMeasurementPoint[]> {
  const { data, error } = await supabase
    .from('soil_measurements')
    .select(MAP_COLUMNS)
    .eq('field_name', fieldName)
    .order('measured_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as SoilMeasurementRow[]).map(mapRowToPoint);
}

// ─────────────────────────── Cola local ───────────────────────────

async function readQueue(): Promise<SoilMeasurementInsert[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as SoilMeasurementInsert[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: SoilMeasurementInsert[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function pendingCount(): Promise<number> {
  return (await readQueue()).length;
}

/**
 * Guarda una medición. Intenta enviarla; si no hay red la encola.
 * Devuelve `synced` para que la UI pueda distinguir ambos casos sin mentir
 * al usuario sobre el estado real del dato.
 */
export async function saveMeasurement(
  row: SoilMeasurementInsert,
): Promise<{ synced: boolean; point: MapMeasurementPoint | null }> {
  try {
    const { data, error } = await supabase
      .from('soil_measurements')
      .upsert(row, { onConflict: 'client_uuid' })
      .select(MAP_COLUMNS)
      .single();

    if (error) throw error;
    return { synced: true, point: mapRowToPoint(data as unknown as SoilMeasurementRow) };
  } catch {
    const queue = await readQueue();
    queue.push(row);
    await writeQueue(queue);
    return { synced: false, point: null };
  }
}

/**
 * Vacía la cola cuando vuelve la cobertura. Sólo elimina de la cola local lo
 * que el servidor confirmó; lo que falla se conserva para el siguiente intento.
 */
export async function flushQueue(): Promise<{ sent: number; remaining: number }> {
  const queue = await readQueue();
  if (queue.length === 0) return { sent: 0, remaining: 0 };

  const failed: SoilMeasurementInsert[] = [];
  let sent = 0;

  for (const item of queue) {
    const { error } = await supabase
      .from('soil_measurements')
      .upsert(item, { onConflict: 'client_uuid' });
    if (error) failed.push(item);
    else sent += 1;
  }

  await writeQueue(failed);
  return { sent, remaining: failed.length };
}

// src/services/fieldsService.ts
//
// Predios del usuario.
//
// El esquema adoptado no tiene tabla de predios: `field_name` es una columna
// de texto en `soil_measurements`. En lugar de añadir una tabla —lo que
// obligaría a migrar las filas existentes y romper la app web— los predios se
// derivan de las mediciones y se completan con los que el usuario ha creado
// pero aún no ha medido, guardados en el teléfono.
//
// Es deliberado: un predio sin ninguna medición no es un dato que valga la
// pena sincronizar, y así el alta de predio funciona sin conexión.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const LOCAL_FIELDS_KEY = '@terrasense/local_fields';

export interface FieldSummary {
  name: string;
  measurements: number;
  lastMeasuredAt: string | null;
  /** true si aún no tiene ninguna medición sincronizada. */
  isDraft: boolean;
}

async function readLocalFields(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_FIELDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function writeLocalFields(names: string[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_FIELDS_KEY, JSON.stringify([...new Set(names)]));
}

/** Registra un predio nuevo en el teléfono. Aparecerá aunque no haya red. */
export async function addLocalField(name: string): Promise<void> {
  const clean = name.trim();
  if (!clean) return;
  const current = await readLocalFields();
  await writeLocalFields([...current, clean]);
}

export async function removeLocalField(name: string): Promise<void> {
  const current = await readLocalFields();
  await writeLocalFields(current.filter((n) => n !== name));
}

/**
 * Lista los predios: los que ya tienen mediciones más los creados en local.
 *
 * Si no hay red, devuelve sólo los locales en lugar de fallar: elegir predio
 * es una operación que el agricultor hace en terreno, sin cobertura.
 */
export async function listFields(): Promise<FieldSummary[]> {
  const local = await readLocalFields();
  const map = new Map<string, FieldSummary>();

  try {
    const { data, error } = await supabase
      .from('soil_measurements')
      .select('field_name,measured_at')
      .order('measured_at', { ascending: false })
      .limit(2000);

    if (error) throw error;

    for (const row of (data ?? []) as { field_name: string; measured_at: string }[]) {
      if (!row.field_name) continue;
      const existing = map.get(row.field_name);
      if (existing) {
        existing.measurements += 1;
      } else {
        map.set(row.field_name, {
          name: row.field_name,
          measurements: 1,
          // Vienen ordenadas descendente, así que la primera es la más reciente.
          lastMeasuredAt: row.measured_at,
          isDraft: false,
        });
      }
    }
  } catch {
    // Sin cobertura: se sigue con los predios locales.
  }

  for (const name of local) {
    if (!map.has(name)) {
      map.set(name, { name, measurements: 0, lastMeasuredAt: null, isDraft: true });
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.measurements !== b.measurements) return b.measurements - a.measurements;
    return a.name.localeCompare(b.name, 'es');
  });
}

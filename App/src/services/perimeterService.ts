// src/services/perimeterService.ts
//
// Perímetro del predio: polígono que se dibuja bajo las mediciones.
//
// La superficie NO se calcula aquí: la deriva Postgres sobre el elipsoide
// (`area_ha` es columna generada). Calcularla en el cliente daría cifras
// distintas según la plataforma y errores de redondeo acumulados.

import { supabase } from './supabase';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface FieldPerimeter {
  id: string;
  fieldName: string;
  coordinates: LatLng[];
  areaHa: number | null;
}

/** Mínimo de vértices para que un anillo sea un polígono válido. */
export const MIN_VERTICES = 3;

/**
 * Convierte los vértices a WKT.
 *
 * PostGIS exige que el anillo esté CERRADO: el último punto debe repetir el
 * primero. Si no, rechaza la geometría.
 */
function toWkt(coords: LatLng[]): string {
  const ring = [...coords];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first.latitude !== last.latitude || first.longitude !== last.longitude) {
    ring.push(first);
  }
  const pairs = ring.map((c) => `${c.longitude} ${c.latitude}`).join(',');
  return `SRID=4326;POLYGON((${pairs}))`;
}

/** Extrae los vértices de la geometría que devuelve PostGIS como GeoJSON. */
function fromGeoJson(geom: unknown): LatLng[] {
  const g = geom as { type?: string; coordinates?: number[][][] } | null;
  if (!g?.coordinates?.[0]) return [];
  return g.coordinates[0].map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

export async function getPerimeter(fieldName: string): Promise<FieldPerimeter | null> {
  const { data, error } = await supabase
    .from('field_perimeters')
    .select('id,field_name,area_ha,geom')
    .eq('field_name', fieldName)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { id: string; field_name: string; area_ha: number | null; geom: unknown };
  return {
    id: row.id,
    fieldName: row.field_name,
    coordinates: fromGeoJson(row.geom),
    areaHa: row.area_ha,
  };
}

/**
 * Guarda o reemplaza el perímetro del predio.
 *
 * La restricción UNIQUE (user_id, field_name) hace que redibujarlo actualice
 * en vez de acumular polígonos huérfanos.
 */
export async function savePerimeter(
  fieldName: string,
  coordinates: LatLng[],
): Promise<FieldPerimeter> {
  if (coordinates.length < MIN_VERTICES) {
    throw new Error(`Hacen falta al menos ${MIN_VERTICES} puntos para cerrar el predio.`);
  }

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Sesión no válida.');

  const { data, error } = await supabase
    .from('field_perimeters')
    .upsert(
      { user_id: uid, field_name: fieldName, geom: toWkt(coordinates) },
      { onConflict: 'user_id,field_name' },
    )
    .select('id,field_name,area_ha,geom')
    .single();

  if (error) throw error;

  const row = data as { id: string; field_name: string; area_ha: number | null; geom: unknown };
  return {
    id: row.id,
    fieldName: row.field_name,
    coordinates: fromGeoJson(row.geom),
    areaHa: row.area_ha,
  };
}

export async function deletePerimeter(fieldName: string): Promise<void> {
  const { error } = await supabase.from('field_perimeters').delete().eq('field_name', fieldName);
  if (error) throw error;
}

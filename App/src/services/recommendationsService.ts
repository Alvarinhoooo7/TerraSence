import { supabase } from './supabase';
import { isMeasurementPresentation, type MeasurementPresentation } from '../engine/measurementPresentation';

/** Punto de conexión opcional. No se invoca automáticamente hasta configurar proveedor. */
export async function fetchRemoteRecommendation(measurementId: string, local: MeasurementPresentation): Promise<MeasurementPresentation> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const { data, error } = await supabase.functions.invoke('measurement-recommendation', {
      body: { measurementId, version: 1 }, signal: controller.signal,
    });
    if (error || data?.measurementId !== measurementId || !isMeasurementPresentation(data?.presentation)) return local;
    const remote: MeasurementPresentation = data.presentation;
    // El proveedor puede complementar texto, nunca cambiar los datos ni la fase.
    if (remote.stage !== local.stage || remote.context !== local.context || remote.parameters.some((m, i) => m.value !== local.parameters[i].value || m.unit !== local.parameters[i].unit || m.status !== local.parameters[i].status)) return local;
    return remote;
  } catch { return local; }
  finally { clearTimeout(timer); }
}

// src/components/GisHeatmap.tsx
//
// Visor GIS: mapa de calor predial por interpolación IDW.
//
// POR QUÉ IDW Y NO KRIGING: PostGIS no implementa Kriging; requiere PL/R o
// PL/Python, extensiones que la Postgres gestionada de Supabase no habilita.
// IDW sí es expresable de forma exacta y barata, y para mapear variabilidad
// intrapredial con decenas de puntos da un resultado equivalente en la
// práctica. Se calcula aquí en el cliente sobre canvas: no hace falta ni
// servidor de teselas ni clave de API, así que tampoco hay restricción de
// términos de servicio como con Google Maps.
//
//   IDW:  z(x) = Σ( z_i / d_i^p ) / Σ( 1 / d_i^p )
//
// con p = 2 (ponderación por inverso del cuadrado de la distancia).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SoilMeasurement } from '../types';
import { VERDICT_META } from '../utils/verdict';

type Variable = 'ph' | 'ec_us_cm' | 'vwc_percent' | 'soil_temp_c' | 'nitrogen' | 'phosphorus' | 'potassium';

const VARIABLES: { id: Variable; label: string; unit: string }[] = [
  { id: 'ph', label: 'pH', unit: '' },
  { id: 'ec_us_cm', label: 'Conductividad', unit: 'µS/cm' },
  { id: 'vwc_percent', label: 'Humedad', unit: '%' },
  { id: 'soil_temp_c', label: 'Temperatura', unit: '°C' },
  { id: 'nitrogen', label: 'Nitrógeno', unit: 'mg/kg' },
  { id: 'phosphorus', label: 'Fósforo', unit: 'mg/kg' },
  { id: 'potassium', label: 'Potasio', unit: 'mg/kg' },
];

const IDW_POWER = 2;
const CANVAS_W = 720;
const CANVAS_H = 460;
const PADDING = 28;

/** Rampa perceptual de azul (bajo) a rojo (alto), pasando por verde. */
function ramp(t: number): [number, number, number] {
  const c = Math.min(1, Math.max(0, t));
  if (c < 0.5) {
    const k = c / 0.5;
    return [Math.round(40 + k * 40), Math.round(110 + k * 80), Math.round(200 - k * 80)];
  }
  const k = (c - 0.5) / 0.5;
  return [Math.round(80 + k * 175), Math.round(190 - k * 80), Math.round(120 - k * 70)];
}

export function GisHeatmap({ measurements }: { measurements: SoilMeasurement[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [variable, setVariable] = useState<Variable>('ph');

  const points = useMemo(
    () =>
      measurements.filter(
        (m) =>
          Number.isFinite(m.latitude) &&
          Number.isFinite(m.longitude) &&
          Number.isFinite(m[variable] as number),
      ),
    [measurements, variable],
  );

  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const vals = points.map((p) => p[variable] as number);
    // Margen del 12 % para que los puntos del borde no queden pegados al canvas.
    const padLat = (Math.max(...lats) - Math.min(...lats)) * 0.12 || 0.0005;
    const padLng = (Math.max(...lngs) - Math.min(...lngs)) * 0.12 || 0.0005;
    return {
      minLat: Math.min(...lats) - padLat,
      maxLat: Math.max(...lats) + padLat,
      minLng: Math.min(...lngs) - padLng,
      maxLng: Math.max(...lngs) + padLng,
      minVal: Math.min(...vals),
      maxVal: Math.max(...vals),
    };
  }, [points, variable]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bounds || points.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { minLat, maxLat, minLng, maxLng, minVal, maxVal } = bounds;
    const span = maxVal - minVal || 1;
    const w = CANVAS_W - PADDING * 2;
    const h = CANVAS_H - PADDING * 2;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Proyección lineal simple: a escala predial la distorsión es despreciable.
    const toPx = (lat: number, lng: number) => ({
      x: PADDING + ((lng - minLng) / (maxLng - minLng)) * w,
      y: PADDING + ((maxLat - lat) / (maxLat - minLat)) * h,
    });

    // Se interpola sobre una malla y luego se escala, en lugar de píxel a
    // píxel: con 6 px de paso el resultado es visualmente idéntico y evita
    // bloquear el hilo principal con mallas grandes.
    const STEP = 6;
    const img = ctx.createImageData(w, h);
    const projected = points.map((p) => ({
      ...toPx(p.latitude, p.longitude),
      v: p[variable] as number,
    }));

    for (let gy = 0; gy < h; gy += STEP) {
      for (let gx = 0; gx < w; gx += STEP) {
        const px = gx + PADDING;
        const py = gy + PADDING;

        let num = 0;
        let den = 0;
        let exact: number | null = null;

        for (const p of projected) {
          const d2 = (p.x - px) ** 2 + (p.y - py) ** 2;
          if (d2 < 1) {
            exact = p.v;
            break;
          }
          const wgt = 1 / Math.pow(d2, IDW_POWER / 2);
          num += p.v * wgt;
          den += wgt;
        }

        const value = exact ?? (den > 0 ? num / den : minVal);
        const [r, g, b] = ramp((value - minVal) / span);

        for (let dy = 0; dy < STEP && gy + dy < h; dy++) {
          for (let dx = 0; dx < STEP && gx + dx < w; dx++) {
            const idx = ((gy + dy) * w + (gx + dx)) * 4;
            img.data[idx] = r;
            img.data[idx + 1] = g;
            img.data[idx + 2] = b;
            img.data[idx + 3] = 190;
          }
        }
      }
    }
    ctx.putImageData(img, PADDING, PADDING);

    // Puntos medidos encima, con el color de su veredicto.
    for (const p of points) {
      const { x, y } = toPx(p.latitude, p.longitude);
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle =
        p.verdict === 'GREEN' ? '#58b87c' : p.verdict === 'AMBER' ? '#d6a044' : '#e07463';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0d1512';
      ctx.stroke();
    }

    // Marco
    ctx.strokeStyle = '#28352f';
    ctx.lineWidth = 1;
    ctx.strokeRect(PADDING, PADDING, w, h);
  }, [points, bounds, variable]);

  const meta = VARIABLES.find((v) => v.id === variable)!;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {VARIABLES.map((v) => (
          <button
            key={v.id}
            onClick={() => setVariable(v.id)}
            className={`h-9 px-3 rounded-lg text-sm border ${
              variable === v.id
                ? 'border-terra-primary text-terra-primary bg-terra-primary/10'
                : 'border-terra-border text-terra-muted hover:text-terra-text'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {points.length < 3 ? (
        <p className="text-terra-muted py-10 text-center">
          Hacen falta al menos 3 mediciones georreferenciadas para interpolar un mapa de calor.
          Hay {points.length}.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-terra-border bg-terra-surface p-3">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="max-w-full"
              role="img"
              aria-label={`Mapa de calor de ${meta.label} interpolado por IDW sobre ${points.length} mediciones`}
            />
          </div>

          {bounds && (
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-terra-muted">
                {meta.label} {meta.unit && `(${meta.unit})`}
              </span>
              <span className="tabular">{bounds.minVal.toFixed(1)}</span>
              <div
                className="h-3 flex-1 max-w-xs rounded"
                style={{
                  background:
                    'linear-gradient(90deg, rgb(40,110,200), rgb(80,190,120), rgb(255,110,50))',
                }}
              />
              <span className="tabular">{bounds.maxVal.toFixed(1)}</span>
              <span className="text-terra-muted">· {points.length} puntos</span>
            </div>
          )}

          <p className="text-xs text-terra-muted mt-3 max-w-2xl">
            Interpolación por ponderación inversa de la distancia (IDW, p = 2) calculada en el
            navegador. Los círculos son las mediciones reales, coloreadas por su veredicto:{' '}
            {(['GREEN', 'AMBER', 'RED'] as const).map((v) => (
              <span key={v} className={VERDICT_META[v].text}>
                {VERDICT_META[v].icon} {VERDICT_META[v].label}{' '}
              </span>
            ))}
            . La superficie entre puntos es una estimación, no una medición.
          </p>
        </>
      )}
    </div>
  );
}

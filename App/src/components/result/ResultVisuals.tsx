import React from 'react';
import { View } from 'react-native';
import { Text } from '../AppText';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { ParameterKey } from '../../engine/measurementPresentation';

/**
 * Piezas gráficas del resultado. Sólo dibujan lo que ya trae la medición: el
 * estado lo decide el motor agronómico y las escalas son las físicas de cada
 * variable, no umbrales propios.
 *
 * Cada escala declara una ventana de visualización, que no es un rango de
 * aceptación: sirve para situar la lectura y se recorta en los extremos. El
 * valor exacto se muestra siempre como número junto a la barra. El degradado
 * representa la magnitud física —seco a saturado, frío a cálido, baja a alta—
 * y nunca un juicio agronómico: el veredicto viaja en el color del ícono, de
 * la píldora de estado y del punto del pie de la tarjeta, que vienen del motor.
 */

/** Trazos de cada ícono, en viewBox 24×24. */
const ICONS: Record<ParameterKey, readonly string[]> = {
  // Gota que entra en el suelo, sobre dos líneas de terreno.
  vwc: ['M12 2.5C12 2.5 7 8 7 11.6a5 5 0 0 0 10 0C17 8 12 2.5 12 2.5Z', 'M3 18h18', 'M6 21.3h12'],
  // Termómetro cruzando la línea del suelo, con dos raicillas.
  temp: ['M10 3.6a2 2 0 0 1 4 0v8.6a3.6 3.6 0 1 1-4 0Z', 'M12 13.6V7', 'M2.5 16.5h6M15.5 16.5h6',
    'M5 16.5v3.4M19 16.5v3.4'],
  // Gota con hoja interior y arco de balance: acidez del suelo, no laboratorio.
  ph: ['M12 3C12 3 7.6 8.1 7.6 11.4a4.4 4.4 0 0 0 8.8 0C16.4 8.1 12 3 12 3Z',
    'M10.4 12.2c1.6.3 3-.8 3.4-2.5', 'M4 20.2a8 8 0 0 1 16 0'],
  // Dos electrodos y el pulso iónico entre ellos.
  ec: ['M7 3.6v8.8M17 3.6v8.8', 'M9.4 17.2l2.1-3.2 1.1 2.1 2-3.4', 'M4 20.4h16'],
  // Brote vigoroso con nervadura: el nitrógeno manda en el follaje.
  nitrogen: ['M12 20.4c0-6.2 2.6-10.3 8.2-11.3-.5 6.2-3.6 9.8-8.2 11.3Z',
    'M12 20.4c0-4.1-1.6-7.2-5.7-8.7'],
  // Raíz ramificada: el fósforo manda en el sistema radicular.
  phosphorus: ['M12 3.4v8.4', 'M12 11.8c-2.6 1.6-4.2 4.2-4.7 7.4', 'M12 11.8c2.6 1.6 4.2 4.2 4.7 7.4',
    'M12 11.8v8.6'],
  // Celda hexagonal con el fruto dentro: el potasio manda en el llenado.
  potassium: ['M12 3.2l7 4v9.6l-7 4-7-4V7.2l7-4Z', 'M12 9.4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
  // Termómetro con un sol: el aire, no el suelo.
  airTemp: ['M8.6 4.2a2 2 0 0 1 4 0v8.2a3.6 3.6 0 1 1-4 0Z', 'M10.6 13.8V7.4',
    'M19 4.8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z', 'M19 2.4v1.1M19 9v1.1M16.3 6.3h-1.1M22.8 6.3h-1.1'],
  // Dos gotas de rocío y la brisa: humedad del aire, no lluvia.
  airHumidity: ['M9 4.8S6 8.6 6 10.4a3 3 0 0 0 6 0C12 8.6 9 4.8 9 4.8Z',
    'M16.2 10.2s-2.3 2.8-2.3 4.1a2.3 2.3 0 0 0 4.6 0c0-1.3-2.3-4.1-2.3-4.1Z',
    'M3.4 18.6h8.8M6.4 21.4h11'],
  // Dial barométrico con aguja.
  airPressure: ['M4 18.4a8 8 0 1 1 16 0', 'M12 18.4l4.4-4.4',
    'M12 6.4v1.7M5.9 10.2l1.5.9M18.1 10.2l-1.5.9'],
};

/** Insignia de la esquina para los tres valores de referencia. */
const LETTERS: Partial<Record<ParameterKey, string>> = { nitrogen: 'N', phosphorus: 'P', potassium: 'K' };

/** Ícono de la variable sobre un fondo teñido con el color de su estado. */
export function MetricBadge({ metric, tone, size = 44 }: { metric: ParameterKey; tone: string; size?: number }) {
  const { colors } = useAppTheme();
  const trazos = ICONS[metric];
  const letra = LETTERS[metric];
  return <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: `${tone}22`, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke={tone} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      {trazos.map((d, i) => <Path key={i} d={d} />)}
    </Svg>
    {!!letra && <View style={{ position: 'absolute', right: size * 0.04, bottom: size * 0.04, minWidth: size * 0.36, height: size * 0.36, paddingHorizontal: 2, borderRadius: size * 0.18, backgroundColor: tone, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.card, fontSize: size * 0.24, fontWeight: '900' }}>{letra}</Text>
    </View>}
  </View>;
}

/** Anillo con cuántas variables quedaron en cada estado. */
export function StatusRing({ counts, size = 116 }: { counts: { ok: number; warn: number; bad: number }; size?: number }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const total = counts.ok + counts.warn + counts.bad;
  const r = 44; const c = 2 * Math.PI * r; const gap = total > 1 ? 4 : 0;
  let offset = 0;
  const segments = ([[counts.ok, colors.success], [counts.warn, colors.warning], [counts.bad, colors.danger]] as const).filter(([n]) => n > 0).map(([n, color]) => {
    const length = (n / total) * c;
    const segment = { color, dash: `${Math.max(length - gap, 0.1)} ${c}`, offset: -offset };
    offset += length;
    return segment;
  });
  return <View accessible accessibilityLabel={t(`${counts.ok} de ${total} variables en condición favorable`, `${counts.ok} of ${total} variables in favorable condition`)}
    style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
      <Circle cx="50" cy="50" r={r} stroke={colors.border} strokeWidth="9" fill="none" />
      {segments.map((s, i) => <Circle key={i} cx="50" cy="50" r={r} stroke={s.color} strokeWidth="9" fill="none" strokeLinecap="round"
        strokeDasharray={s.dash} strokeDashoffset={s.offset} transform="rotate(-90 50 50)" />)}
    </Svg>
    <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{counts.ok}<Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '600' }}>/{total}</Text></Text>
    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{t('favorables', 'favorable')}</Text>
  </View>;
}

/**
 * Escala de una variable: ventana de visualización, degradado de magnitud y las
 * tres referencias físicas del pie. `min` y `max` recortan la posición del
 * marcador; el número exacto se muestra aparte y no se recorta nunca.
 */
interface Escala {
  min: number;
  max: number;
  paradas: readonly (readonly [number, string])[];
  /** Referencias físicas, nunca juicios: no se escribe «óptimo» en una escala. */
  extremos: readonly [string, string, string];
  extremosEn: readonly [string, string, string];
  /** Marca fija de referencia, como la presión normal al nivel del mar. */
  referencia?: number;
}

const FRIO = '#3B8FD9', TEMPLADO = '#6BBF59', CALIDO = '#E8A23B', ARDIENTE = '#D9534F';
const SECO = '#EBD9B4', HUMEDO = '#5AA9E6', SATURADO = '#2D5F9A';

const ESCALAS: Record<ParameterKey, Escala> = {
  // Rango físico completo declarado por el manual de la sonda.
  vwc: {
    min: 0, max: 100, paradas: [[0, SECO], [0.5, HUMEDO], [1, SATURADO]],
    extremos: ['Seco', 'Húmedo', 'Saturado'], extremosEn: ['Dry', 'Moist', 'Saturated'],
  },
  // La sonda declara −40 a +80 °C; la ventana cubre el suelo agrícola.
  temp: {
    min: -5, max: 45, paradas: [[0, FRIO], [0.4, TEMPLADO], [0.75, CALIDO], [1, ARDIENTE]],
    extremos: ['Frío', 'Templado', 'Cálido'], extremosEn: ['Cold', 'Mild', 'Warm'],
  },
  // Escala colorimétrica convencional del pH, de 0 a 14.
  ph: {
    min: 0, max: 14,
    paradas: [[0, '#D9534F'], [0.3, '#E8A23B'], [0.5, '#6BBF59'], [0.72, '#3B8FD9'], [1, '#6E4BC2']],
    extremos: ['Ácido', 'Neutro', 'Alcalino'], extremosEn: ['Acidic', 'Neutral', 'Alkaline'],
    referencia: 7,
  },
  // La sonda declara 0 a 20.000 µS/cm; la ventana cubre el suelo de cultivo.
  ec: {
    min: 0, max: 3000, paradas: [[0, '#BFE3D4'], [0.5, '#46A07A'], [1, '#6E4BC2']],
    extremos: ['Baja', 'Media', 'Alta'], extremosEn: ['Low', 'Medium', 'High'],
  },
  // N, P y K: rango declarado por el manual, sin bandas ni clases. Son valores
  // de referencia derivados de la conductividad, no un diagnóstico nutricional.
  nitrogen: {
    min: 0, max: 1999, paradas: [[0, '#D8E6D0'], [1, '#2F6B45']],
    extremos: ['0', 'mg/kg', '1.999'], extremosEn: ['0', 'mg/kg', '1,999'],
  },
  phosphorus: {
    min: 0, max: 1999, paradas: [[0, '#D8E6D0'], [1, '#2F6B45']],
    extremos: ['0', 'mg/kg', '1.999'], extremosEn: ['0', 'mg/kg', '1,999'],
  },
  potassium: {
    min: 0, max: 1999, paradas: [[0, '#D8E6D0'], [1, '#2F6B45']],
    extremos: ['0', 'mg/kg', '1.999'], extremosEn: ['0', 'mg/kg', '1,999'],
  },
  // El BME280 declara −40 a +85 °C; la ventana cubre el aire junto a la planta.
  airTemp: {
    min: -5, max: 45, paradas: [[0, FRIO], [0.4, TEMPLADO], [0.75, CALIDO], [1, ARDIENTE]],
    extremos: ['Frío', 'Templado', 'Caluroso'], extremosEn: ['Cold', 'Mild', 'Hot'],
  },
  airHumidity: {
    min: 0, max: 100, paradas: [[0, SECO], [0.5, HUMEDO], [1, SATURADO]],
    extremos: ['Seco', 'Húmedo', 'Saturado'], extremosEn: ['Dry', 'Humid', 'Saturated'],
  },
  // El BME280 declara 300 a 1.100 hPa; la ventana cubre la presión de superficie.
  airPressure: {
    min: 970, max: 1040, paradas: [[0, '#9FB8CE'], [0.5, '#6BBF59'], [1, '#C98B4B']],
    extremos: ['Baja', 'Normal', 'Alta'], extremosEn: ['Low', 'Normal', 'High'],
    referencia: 1013,
  },
};

/** Barra con degradado y marcador circular en la posición de la lectura. */
export function MarkerScale({ escala, value, labels = false, id }: {
  escala: Escala; value: number; labels?: boolean; id: string;
}) {
  const { colors } = useAppTheme();
  const { language } = useTranslation();
  const bruto = (value - escala.min) / (escala.max - escala.min);
  const at = Math.max(0, Math.min(1, bruto));
  const textos = language === 'en' ? escala.extremosEn : escala.extremos;
  const marca = escala.referencia == null ? null
    : Math.max(0, Math.min(1, (escala.referencia - escala.min) / (escala.max - escala.min)));
  return <View style={{ gap: 4 }}>
    <View style={{ height: 16, justifyContent: 'center' }}>
      <Svg width="100%" height={8} preserveAspectRatio="none" viewBox="0 0 100 8">
        <Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          {escala.paradas.map(([pos, color], i) => <Stop key={i} offset={String(pos)} stopColor={color} />)}
        </LinearGradient></Defs>
        <Rect x="0" y="0" width="100" height="8" rx="4" fill={`url(#${id})`} />
      </Svg>
      {marca != null && <View style={{ position: 'absolute', left: `${marca * 100}%`, marginLeft: -1, width: 2, height: 14, borderRadius: 1, backgroundColor: colors.card, opacity: 0.85 }} />}
      <View style={{ position: 'absolute', left: `${at * 100}%`, marginLeft: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.card, borderWidth: 3, borderColor: colors.text }} />
    </View>
    {labels && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {textos.map((texto, i) => <Text key={i} style={{ color: colors.textSecondary, fontSize: 12 }}>{texto}</Text>)}
    </View>}
  </View>;
}

/** Escala física de la variable. Las diez la tienen; sin lectura no se dibuja. */
export function MetricScale({ metric, value, labels }: { metric: ParameterKey; value: number | null; labels?: boolean }) {
  if (value == null) return null;
  const escala = ESCALAS[metric];
  if (!escala) return null;
  return <MarkerScale escala={escala} value={value} labels={labels} id={`escala-${metric}`} />;
}

/**
 * Criterios agronómicos propios de una especie, por etapa, con su evidencia (TASK ES6/ES7).
 *
 * `speciesCatalog.ts` es identidad: nombre, nombre científico y la fuente que acredita
 * que la especie se cultiva en Chile. Los perfiles son agronomía: umbrales con fuente
 * técnica, habilitados criterio por criterio, en speciesProfilesHortalizas.ts,
 * speciesProfilesFrutales.ts, speciesProfilesBerriesAromaticas.ts y speciesProfilesCultivos.ts;
 * el contrato y los constructores, en speciesRuleKit.ts. Este archivo une las listas en `SPECIES_RULES` y evalúa los criterios.
 *
 * Cada criterio tiene fuente propia o, si no existe, se toma de una especie similar y
 * lo declara (`scope: 'analog'`, `analogOf` y sus limitaciones; MOTOR_AGRONOMICO.md §7.1).
 * Nunca hay cifras sin fuente. Un perfil ausente en `SPECIES_RULES` no tiene criterios,
 * y así lo informa `hasEnabledCriteria`.
 *
 * Proceso de incorporación de cada criterio: MOTOR_AGRONOMICO.md §7.5. Esquema de
 * evidencia por perfil: §7.2. Estados de una regla: §8.1 (`candidate`/`documented`/`enabled`
 * aquí; `locally_validated`/`retired` no aplican todavía porque no hay contraste de
 * terreno ni retiro de ningún criterio).
 *
 * Familias: pH del suelo (lectura de la sonda), umbrales de una lectura del equipo
 * (temperatura de suelo, humedad del aire), extremos diarios de temperatura del aire
 * del pronóstico (helada, frío, calor) y episodios del pronóstico (lluvia, niebla).
 * Las dos primeras se evalúan con la captura; las del pronóstico, cuando llega el clima.
 */
import type { PhenologicalStage } from '../types/app';
import type { AgronomicAlert, SoilMeasurement } from '../types/agronomy';
import type { AppLanguage } from '../types/preferences';
import type { SpeciesAirTemperatureCriterion, SpeciesComparison, SpeciesCriterion, SpeciesPhCriterion, SpeciesRuleProfile, SpeciesSeverity, SpeciesThreshold, SpeciesWeatherEventCriterion } from './speciesRuleKit';
import { decimal, salt } from './speciesRuleKit';
import { HORTALIZA_PROFILES } from './speciesProfilesHortalizas';
import { FRUTAL_PROFILES } from './speciesProfilesFrutales';
import { BERRY_AROMATIC_PROFILES } from './speciesProfilesBerriesAromaticas';
import { FIELD_CROP_PROFILES } from './speciesProfilesCultivos';

export type { SpeciesCriterionState, SpeciesCriterionEvidence, SpeciesPhCriterion, SpeciesThreshold, SpeciesComparison, SpeciesSeverity, SpeciesAirTemperatureCriterion, SpeciesReadingCriterion, SpeciesWeatherEventCriterion, SpeciesSalinityCriterion, SpeciesWaterCriterion, SpeciesCriterion, SpeciesEstablishment, SpeciesRuleProfile } from './speciesRuleKit';
export { fahrenheitToCelsius } from './speciesRuleKit';

/** Versión del conjunto de criterios; cambia cuando se agrega, corrige o retira uno. */
export const SPECIES_RULES_VERSION = '2.9.0';

const PROFILES: readonly SpeciesRuleProfile[] = [...HORTALIZA_PROFILES, ...FRUTAL_PROFILES, ...BERRY_AROMATIC_PROFILES, ...FIELD_CROP_PROFILES];

export const SPECIES_RULES: Readonly<Record<string, SpeciesRuleProfile>> =
  Object.fromEntries(PROFILES.map(profile => [profile.speciesId, profile]));

export const findSpeciesRuleProfile = (speciesId: string | null | undefined): SpeciesRuleProfile | undefined =>
  speciesId && Object.prototype.hasOwnProperty.call(SPECIES_RULES, speciesId) ? SPECIES_RULES[speciesId] : undefined;

/** Si la especie tiene al menos un criterio habilitado para la etapa. `speciesCatalog.ts` delega aquí. */
export function hasEnabledCriteria(speciesId: string | null | undefined, stage: PhenologicalStage): boolean {
  const profile = findSpeciesRuleProfile(speciesId);
  if (!profile) return false;
  return profile.criteria.some(c => c.state === 'enabled' && c.stages.includes(stage));
}

export type PhPosition = 'below_limit' | 'below_optimum' | 'optimum' | 'above_optimum' | 'above_limit';

/**
 * Posición de una lectura respecto del criterio. Los límites son estrictos: en el valor
 * exacto del límite la fuente todavía no indica corregir. Cruzar un límite manda sobre
 * el óptimo (frutilla: 5,8 es a la vez mínimo y comienzo del rango normal).
 */
export function classifyPh(criterion: SpeciesPhCriterion, ph: number): PhPosition {
  if (criterion.lowerLimit != null && ph < criterion.lowerLimit) return 'below_limit';
  if (criterion.upperLimit != null && ph > criterion.upperLimit) return 'above_limit';
  if (ph < criterion.optimum.min) return 'below_optimum';
  if (ph > criterion.optimum.max) return 'above_optimum';
  return 'optimum';
}

function phTitle(criterion: SpeciesPhCriterion, position: PhPosition, language: AppLanguage): string {
  const en = language === 'en';
  const n = (value: number) => decimal(value, language);
  const { min, max } = criterion.optimum;
  const single = min === max;
  const optimum = single ? (en ? `target ${n(min)}` : `objetivo ${n(min)}`) : `${n(min)}–${n(max)}`;
  switch (position) {
    case 'below_limit': return en ? `pH below the documented minimum for this species (${n(criterion.lowerLimit!)})`
      : `pH bajo el mínimo documentado para esta especie (${n(criterion.lowerLimit!)})`;
    case 'above_limit': return en ? `pH above the documented maximum for this species (${n(criterion.upperLimit!)})`
      : `pH sobre el máximo documentado para esta especie (${n(criterion.upperLimit!)})`;
    case 'optimum': return single
      ? (en ? `pH at this species' documented target (${n(min)})` : `pH en el objetivo documentado para esta especie (${n(min)})`)
      : (en ? `pH within this species' documented optimum (${optimum})` : `pH dentro del óptimo documentado para esta especie (${optimum})`);
    case 'below_optimum': return en
      ? `pH below this species' documented ${single ? optimum : `optimum (${optimum})`}${criterion.lowerLimit != null ? `, above its minimum (${n(criterion.lowerLimit)})` : ''}`
      : `pH bajo el ${single ? optimum : `óptimo (${optimum})`} documentado para esta especie${criterion.lowerLimit != null ? `, sobre su mínimo (${n(criterion.lowerLimit)})` : ''}`;
    case 'above_optimum': return en
      ? `pH above this species' documented ${single ? optimum : `optimum (${optimum})`}${criterion.upperLimit != null ? `, below its maximum (${n(criterion.upperLimit)})` : '; no maximum is documented'}`
      : `pH sobre el ${single ? optimum : `óptimo (${optimum})`} documentado para esta especie${criterion.upperLimit != null ? `, bajo su máximo (${n(criterion.upperLimit)})` : '; no hay un máximo documentado'}`;
  }
}

const sourcesOf = (criterion: SpeciesCriterion) =>
  criterion.evidence.map(e => e.institution).filter((name, i, all) => all.indexOf(name) === i).join('; ');

/** Detalle técnico de un criterio: lo que dice la fuente, sus límites, el control y la cita. */
const explanation = (criterion: SpeciesCriterion, check: string, language: AppLanguage) => {
  const en = language === 'en';
  return [en ? criterion.noteEn : criterion.note, en ? criterion.limitationsEn : criterion.limitations, check,
    `(${en ? 'Source' : 'Fuente'}: ${sourcesOf(criterion)}.)`].filter(Boolean).join(' ');
};

/** Lo que lee el agricultor sobre el pH: el valor, el ideal y qué hacer, sin términos de la fuente. */
function phPlain(criterion: SpeciesPhCriterion, position: PhPosition, ph: number, language: AppLanguage): { title: string; action: string } {
  const en = language === 'en';
  const n = (value: number) => decimal(value, language);
  const { min, max } = criterion.optimum;
  const ideal = min === max ? n(min) : (en ? `${n(min)} to ${n(max)}` : `${n(min)} a ${n(max)}`);
  const measured = en ? `Measured pH: ${n(ph)}. Ideal for this crop: ${ideal}.` : `pH medido: ${n(ph)}. Ideal para este cultivo: ${ideal}.`;
  const lab = en ? 'Before correcting the soil, confirm the pH with a laboratory analysis.' : 'Antes de corregir el suelo, confirma el pH con un análisis de laboratorio.';
  const recheck = en ? 'No correction is needed for now; measure again to confirm.' : 'Por ahora no hace falta corregir; vuelve a medir para confirmar.';
  switch (position) {
    case 'below_limit': return {
      title: en ? 'pH too low for this crop (acidic soil)' : 'pH demasiado bajo para este cultivo (suelo ácido)',
      action: `${measured} ${en ? `Below ${n(criterion.lowerLimit!)} this crop has problems.` : `Bajo ${n(criterion.lowerLimit!)} este cultivo tiene problemas.`} ${lab}` };
    case 'above_limit': return {
      title: en ? 'pH too high for this crop (alkaline soil)' : 'pH demasiado alto para este cultivo (suelo alcalino)',
      action: `${measured} ${en ? `Above ${n(criterion.upperLimit!)} this crop has problems.` : `Sobre ${n(criterion.upperLimit!)} este cultivo tiene problemas.`} ${lab}` };
    case 'optimum': return {
      title: en ? 'pH suitable for this crop' : 'pH adecuado para este cultivo',
      action: `${measured} ${en ? 'It is within the ideal range.' : 'Está dentro de lo ideal.'}` };
    case 'below_optimum': return {
      title: en ? 'pH slightly low for this crop' : 'pH algo bajo para este cultivo',
      action: `${measured} ${en ? 'It is below ideal but still acceptable.' : 'Está bajo lo ideal, pero todavía es aceptable.'} ${recheck}` };
    case 'above_optimum': return {
      title: en ? 'pH slightly high for this crop' : 'pH algo alto para este cultivo',
      action: `${measured} ${en ? 'It is above ideal but still acceptable.' : 'Está sobre lo ideal, pero todavía es aceptable.'} ${recheck}` };
  }
}

const SALT_PLAIN = {
  sensitive: ['Este cultivo es sensible a la sal', 'This crop is sensitive to salt',
    'Si el suelo o el agua de riego tienen sales, rinde menos.', 'If the soil or irrigation water is salty, it yields less.'],
  moderately_sensitive: ['Este cultivo es algo sensible a la sal', 'This crop is somewhat sensitive to salt',
    'Con suelo o agua de riego salinos puede rendir menos.', 'With salty soil or irrigation water it may yield less.'],
  moderately_tolerant: ['Este cultivo tolera algo de sal', 'This crop tolerates some salt',
    'Soporta mejor que muchos cultivos un suelo o agua con sales.', 'It handles salty soil or water better than many crops.'],
  tolerant: ['Este cultivo tolera la sal', 'This crop tolerates salt',
    'Soporta bien un suelo o agua con sales.', 'It handles salty soil or water well.'],
} as const;

/** Si `value` cumple la condición del umbral. */
export function meetsThreshold(comparison: SpeciesComparison, threshold: SpeciesThreshold, value: number): boolean {
  switch (comparison) {
    case 'below': return value < threshold.value;
    case 'at_or_below': return value <= threshold.value;
    case 'above': return value > threshold.value;
    case 'at_or_above': return value >= threshold.value;
  }
}

/**
 * Alertas propias de la especie para esta captura y etapa. Se agregan a las alertas
 * generales sin reemplazarlas: una especie indicada no cambia cómo se evalúa el suelo
 * frío, salino o seco (T45); sólo añade las razones que su propio criterio documenta.
 * Sólo cruzar un límite documentado es advertencia; el resto es información.
 *
 * `usable` dice si el dato puede interpretarse (disponible y captura vigente): un dato
 * ausente, inválido o de una captura antigua no se compara con ningún criterio. Los
 * criterios del pronóstico se evalúan en `evaluateSpeciesWeather`; aquí sólo se compara
 * con ellos la temperatura del aire que midió el equipo, y sólo cuando la lectura implica
 * la condición (ver `localAirImplies`). Así un riesgo de helada se detecta aunque no haya
 * red ni pronóstico.
 */
export function evaluateSpeciesCriteria(
  speciesId: string | null | undefined,
  stage: PhenologicalStage,
  reading: SoilMeasurement,
  language: AppLanguage = 'es',
  usable: (key: 'ph' | 'temp' | 'airHumidity' | 'airTemp') => boolean = () => true,
): AgronomicAlert[] {
  const profile = findSpeciesRuleProfile(speciesId);
  if (!profile) return [];
  const en = language === 'en';
  const alerts: AgronomicAlert[] = [];
  const localAirHits: SpeciesAirTemperatureCriterion[] = [];
  for (const criterion of profile.criteria) {
    if (criterion.state !== 'enabled' || !criterion.stages.includes(stage)) continue;
    if (criterion.kind === 'ph') {
      if (!usable('ph') || typeof reading.ph !== 'number' || !Number.isFinite(reading.ph)) continue;
      const position = classifyPh(criterion, reading.ph);
      const check = en
        ? 'Probe reading in the field: confirm pH with a laboratory analysis before correcting it.'
        : 'Lectura de la sonda en terreno: confirma el pH con un análisis de laboratorio antes de corregirlo.';
      const plain = phPlain(criterion, position, reading.ph, language);
      alerts.push({
        type: position === 'below_limit' || position === 'above_limit' ? 'warning' : 'info',
        param: 'ph', origin: 'species',
        title: plain.title, action: plain.action,
        detail: `${phTitle(criterion, position, language)}. ${explanation(criterion, check, language)}`,
      });
    } else if (criterion.kind === 'reading') {
      const value = reading[criterion.variable];
      if (!usable(criterion.variable) || typeof value !== 'number' || !Number.isFinite(value)) continue;
      if (!meetsThreshold(criterion.comparison, criterion.threshold, value)) continue;
      const unit = criterion.variable === 'temp' ? ' °C' : ' %';
      const measured = en ? `Measured: ${decimal(value, 'en')}${unit}.` : `Medido: ${decimal(value, 'es')}${unit}.`;
      alerts.push({
        type: criterion.severity, param: criterion.variable, origin: 'species',
        title: en ? criterion.effectEn : criterion.effect,
        action: `${measured} ${en ? criterion.adviceEn : criterion.advice}`,
        detail: explanation(criterion, '', language),
      });
    } else if (criterion.kind === 'salinity_reference') {
      // Referencia, no comparación: se informa aunque la conductividad falte o no sea comparable.
      const [title, titleEn, plain, plainEn] = SALT_PLAIN[criterion.rating];
      alerts.push({
        type: 'info', param: 'ec', origin: 'species',
        title: en ? titleEn : title,
        action: en ? `${plainEn} If you are concerned about salt, ask a laboratory for a soil salinity analysis.`
          : `${plain} Si te preocupa la sal, pide en laboratorio un análisis de salinidad del suelo.`,
        detail: explanation(criterion, en
          ? 'To know whether salts limit this crop, ask a laboratory for the saturated-paste electrical conductivity.'
          : 'Para saber si las sales limitan este cultivo, pide en laboratorio la conductividad eléctrica del extracto de saturación.', language),
      });
    } else if (criterion.kind === 'air_temperature') {
      const value = reading.airTemp;
      if (!localAirImplies(criterion) || !usable('airTemp') || typeof value !== 'number' || !Number.isFinite(value)) continue;
      if (meetsThreshold(criterion.comparison, criterion.threshold, value)) localAirHits.push(criterion);
    } else if (criterion.kind === 'water_sensitivity') {
      alerts.push({
        type: 'info', param: 'vwc', origin: 'species',
        title: en ? `${criterion.period === 'flowering' ? 'Flowering' : 'Vegetative growth'}: make sure this crop does not lack water`
          : `${criterion.period === 'flowering' ? 'Floración' : 'Crecimiento vegetativo'}: que no le falte agua a este cultivo`,
        action: en ? 'At this stage, a lack of water is what lowers this crop\'s harvest the most. Check that irrigation reaches the roots well.'
          : 'En esta etapa, la falta de agua es lo que más baja la cosecha de este cultivo. Revisa que el riego llegue bien a las raíces.',
        detail: explanation(criterion, '', language),
      });
    }
  }
  // Grados de un mismo riesgo: sólo el umbral más bajo que se cumple, como en el pronóstico (T44).
  const local = localAirHits.reduce<SpeciesAirTemperatureCriterion | null>((best, c) => !best || c.threshold.value < best.threshold.value
    || (c.threshold.value === best.threshold.value && SEVERITY_ORDER[c.severity] < SEVERITY_ORDER[best.severity]) ? c : best, null);
  if (local) {
    const measured = decimal(Math.round(reading.airTemp! * 10) / 10, language);
    alerts.push({
      type: local.severity, param: 'airTemp', origin: 'species',
      title: `${en ? local.effectEn : local.effect} — ${en ? `the device measures ${measured} °C now` : `el equipo mide ${measured} °C ahora`}`,
      action: `${en ? local.adviceEn : local.advice} ${en
        ? 'Check it with a thermometer in the shade, at plant height.'
        : 'Compruébalo con un termómetro a la sombra, a la altura de la planta.'}`,
      detail: explanation(local, en
        ? `Air temperature measured by the device at this point when measuring (${measured} °C), compared with the threshold the source gives for the daily low: if it is already at or below the threshold, the low of the day is too. It is a single reading: it does not say how long the cold lasts, and a reading above the threshold does not rule out frost later.`
        : `Temperatura del aire que midió el equipo en este punto al medir (${measured} °C), comparada con el umbral que la fuente da para la mínima del día: si ya está en el umbral o bajo él, la mínima del día también. Es una sola lectura: no dice cuánto dura el frío, y una lectura sobre el umbral no descarta una helada más tarde.`, language),
    });
  }
  // Trazabilidad (§8.1): la especie y la variable identifican el criterio; la versión, el conjunto.
  return alerts.map(alert => ({ ...alert, ruleId: `species:${profile.speciesId}:${alert.param}`, ruleVersion: SPECIES_RULES_VERSION }));
}

/**
 * Si una lectura instantánea del aire basta para afirmar la condición del criterio. Sólo en
 * frío y helada: la mínima del día nunca supera la temperatura de este momento, así que una
 * lectura en el umbral o bajo él implica una mínima en el umbral o bajo él. El calor queda
 * en el pronóstico: el sol sobre el equipo eleva su lectura y daría falsas alarmas, y una
 * «noche cálida» no se deduce de un instante.
 */
export const localAirImplies = (criterion: SpeciesAirTemperatureCriterion) =>
  criterion.extreme === 'minimum' && (criterion.comparison === 'below' || criterion.comparison === 'at_or_below');

/** Si la especie tiene en la etapa algún criterio de frío que la lectura del aire pueda revisar. */
export function hasLocalAirCriteria(speciesId: string | null | undefined, stage: PhenologicalStage): boolean {
  const profile = findSpeciesRuleProfile(speciesId);
  return !!profile && profile.criteria.some(c => c.state === 'enabled' && c.stages.includes(stage) && c.kind === 'air_temperature' && localAirImplies(c));
}

// --- Criterios del pronóstico -------------------------------------------------------------

/** Un día comparable del pronóstico, con su nombre ya resuelto para leer («hoy», «el mar 6 oct»). */
export interface SpeciesWeatherDay {
  date: string;
  label: string;
  isToday: boolean;
  minimumTemperatureC: number | null;
  maximumTemperatureC: number | null;
  /** `null` si faltan cantidad y probabilidad de lluvia. */
  rainy: boolean | null;
  /** `null` si el día no trae código de tiempo. */
  fog: boolean | null;
}

/** Una hora del pronóstico en hora local del proveedor (`AAAA-MM-DDTHH:mm`). */
export interface SpeciesWeatherHour {
  time: string;
  temperatureC: number | null;
}

export interface SpeciesWeatherInput {
  /** Hoy primero, si existe, y luego los días siguientes. */
  days: SpeciesWeatherDay[];
  /** Serie horaria, si el pronóstico la trae; sólo informa la duración, no cambia la gravedad. */
  hours?: SpeciesWeatherHour[];
  rainingNow: boolean;
  fogNow: boolean;
}

export interface SpeciesWeatherFinding {
  type: SpeciesSeverity;
  title: string;
  /** Qué significa y qué hacer, en lenguaje simple. */
  body: string;
  /** Cifras de la fuente, limitaciones y cita, para quien quiera revisarlas. */
  detail: string;
  /** El primer momento en que aplica. */
  when: 'now' | 'today' | 'next_days';
}

export interface SpeciesWeatherResult {
  /** La especie tiene criterios del pronóstico para la etapa. */
  applicable: boolean;
  /** Al menos un criterio aplicable se pudo comparar con el pronóstico. */
  evaluated: boolean;
  findings: SpeciesWeatherFinding[];
}

const isWeatherCriterion = (c: SpeciesCriterion): c is SpeciesAirTemperatureCriterion | SpeciesWeatherEventCriterion =>
  c.kind === 'air_temperature' || c.kind === 'weather_event';

/** Si la especie tiene criterios que dependen del pronóstico en esta etapa. */
export function hasWeatherCriteria(speciesId: string | null | undefined, stage: PhenologicalStage): boolean {
  const profile = findSpeciesRuleProfile(speciesId);
  return !!profile && profile.criteria.some(c => c.state === 'enabled' && c.stages.includes(stage) && isWeatherCriterion(c));
}

const SEVERITY_ORDER: Record<SpeciesSeverity, number> = { danger: 0, warning: 1, info: 2 };

const HOUR_MS = 3_600_000;
const localMs = (time: string) => Date.parse(`${time}:00Z`);

/**
 * Horas seguidas que cumplen la condición en la noche o el día de `date`: la racha más larga
 * con al menos una hora de esa fecha. Una hora sin dato, o un salto distinto de una hora
 * (hueco o cambio de horario), corta la racha en vez de unir episodios (T23, T24). `null`
 * si la serie no cubre esa fecha o ninguna hora cumple: no se inventa una duración (T22).
 */
export function longestRun(hours: readonly SpeciesWeatherHour[] | undefined, date: string, meets: (value: number) => boolean): number | null {
  if (!hours?.some(h => h.time.startsWith(date))) return null;
  let best = 0, run = 0, touches = false, previous = Number.NaN;
  for (const hour of hours) {
    const at = localMs(hour.time);
    const ok = typeof hour.temperatureC === 'number' && Number.isFinite(hour.temperatureC) && Number.isFinite(at) && meets(hour.temperatureC);
    if (!ok || at - previous !== HOUR_MS) { run = 0; touches = false; }
    if (ok) {
      run += 1;
      touches ||= hour.time.startsWith(date);
      if (touches) best = Math.max(best, run);
    }
    previous = ok ? at : Number.NaN;
  }
  return best > 0 ? best : null;
}

const listDays = (labels: string[], language: AppLanguage) => labels.length > 1
  ? `${labels.slice(0, -1).join(', ')} ${language === 'en' ? 'and' : 'y'} ${labels[labels.length - 1]}`
  : labels[0];

/**
 * Compara el pronóstico con los criterios climáticos de la especie para la etapa. Entre
 * los criterios de un mismo extremo (mínima o máxima) que se cumplen, sólo se informa el
 * de umbral más extremo: una helada de −4 °C no genera además el aviso de helada leve
 * (T44). Un día sin el dato necesario no cuenta como favorable: si ningún día lo trae, el
 * criterio queda sin evaluar.
 */
export function evaluateSpeciesWeather(
  speciesId: string | null | undefined,
  stage: PhenologicalStage,
  weather: SpeciesWeatherInput | null,
  language: AppLanguage = 'es',
): SpeciesWeatherResult {
  const profile = findSpeciesRuleProfile(speciesId);
  const criteria = (profile?.criteria ?? []).filter(c => c.state === 'enabled' && c.stages.includes(stage)).filter(isWeatherCriterion);
  if (!criteria.length) return { applicable: false, evaluated: false, findings: [] };
  if (!weather) return { applicable: true, evaluated: false, findings: [] };
  const en = language === 'en';
  const n = (value: number) => decimal(Math.round(value * 10) / 10, language);
  const forecastCheck = en
    ? 'Model forecast for the area, not a measurement on the plant: confirm conditions in the field.'
    : 'Pronóstico del modelo para el sector, no una medición en la planta: confirma las condiciones en terreno.';
  let evaluated = false;
  const found: (SpeciesWeatherFinding & { rank: number; family: string })[] = [];

  for (const criterion of criteria) {
    if (criterion.kind === 'air_temperature') {
      const key = criterion.extreme === 'minimum' ? 'minimumTemperatureC' : 'maximumTemperatureC';
      const valueOf = (day: SpeciesWeatherDay) => day[key];
      const known = weather.days.filter(day => { const v = valueOf(day); return typeof v === 'number' && Number.isFinite(v); });
      if (!known.length) continue;
      evaluated = true;
      const hits = known.filter(day => meetsThreshold(criterion.comparison, criterion.threshold, valueOf(day)!));
      if (!hits.length) continue;
      const worst = hits.reduce((a, b) => (criterion.extreme === 'minimum' ? valueOf(b)! < valueOf(a)! : valueOf(b)! > valueOf(a)!) ? b : a);
      const label = criterion.extreme === 'minimum' ? (en ? 'low' : 'mínima') : (en ? 'high' : 'máxima');
      const on = worst.isToday ? worst.label : `${en ? 'on' : 'el'} ${worst.label}`;
      const days = hits.length > 1 ? ` ${en ? 'Days at risk' : 'Días con riesgo'}: ${listDays(hits.map(d => d.label), language)}.` : '';
      const below = criterion.comparison === 'below' || criterion.comparison === 'at_or_below';
      const hoursRun = longestRun(weather.hours, worst.date, value => meetsThreshold(criterion.comparison, criterion.threshold, value));
      const duration = hoursRun == null ? ''
        : en ? ` About ${hoursRun} hours in a row ${below ? 'at or below' : 'above'} ${n(criterion.threshold.value)} °C are expected ${on}.`
          : ` Se esperan unas ${hoursRun} horas seguidas ${below ? 'a' : 'sobre'} ${n(criterion.threshold.value)} °C${below ? ' o menos' : ''} ${on}.`;
      found.push({
        type: criterion.severity,
        title: `${en ? criterion.effectEn : criterion.effect} — ${label} ${en ? 'of' : 'de'} ${n(valueOf(worst)!)} °C ${on}`,
        body: `${en ? criterion.adviceEn : criterion.advice}${days}${duration}`,
        detail: explanation(criterion, forecastCheck, language),
        when: hits[0].isToday ? 'today' : 'next_days',
        // Gana el umbral más extremo de cada familia: helada más fuerte, calor o noche más cálidos.
        rank: below ? criterion.threshold.value : -criterion.threshold.value,
        family: `${criterion.extreme}:${below ? 'below' : 'above'}`,
      });
    } else {
      const key = criterion.event === 'rain' ? 'rainy' : 'fog';
      const now = criterion.event === 'rain' ? weather.rainingNow : weather.fogNow;
      const known = weather.days.filter(day => day[key] !== null);
      if (!known.length && !now) continue;
      evaluated = true;
      const hits = known.filter(day => day[key] === true);
      if (!hits.length && !now) continue;
      const labels = [...(now ? [en ? 'now' : 'ahora'] : []), ...hits.map(d => d.label)];
      found.push({
        type: criterion.severity,
        title: `${en ? criterion.effectEn : criterion.effect} — ${listDays(labels, language)}`,
        body: en ? criterion.adviceEn : criterion.advice,
        detail: explanation(criterion, forecastCheck, language),
        when: now ? 'now' : hits[0].isToday ? 'today' : 'next_days',
        rank: 0, family: criterion.event,
      });
    }
  }

  const findings = found
    .filter(f => !found.some(other => other !== f && other.family === f.family
      && (other.rank < f.rank || (other.rank === f.rank && SEVERITY_ORDER[other.type] < SEVERITY_ORDER[f.type]))))
    .sort((a, b) => SEVERITY_ORDER[a.type] - SEVERITY_ORDER[b.type])
    .map(({ rank: _rank, family: _family, ...finding }) => finding);
  const result: SpeciesWeatherResult = { applicable: true, evaluated, findings };
  return result;
}

/**
 * Categorías de riesgo general (`frost`, `heat`, `rain`) que ya activaron un hallazgo propio
 * de la especie en el pronóstico, para fusionar el aviso general sin duplicar tarjetas (§9.2).
 */
export function coveredGeneralWeatherRisks(
  speciesId: string | null | undefined,
  stage: PhenologicalStage,
  weather: SpeciesWeatherInput | null,
): Set<'frost' | 'heat' | 'rain'> {
  const covered = new Set<'frost' | 'heat' | 'rain'>();
  const profile = findSpeciesRuleProfile(speciesId);
  const criteria = (profile?.criteria ?? []).filter(c => c.state === 'enabled' && c.stages.includes(stage)).filter(isWeatherCriterion);
  if (!criteria.length || !weather) return covered;
  for (const criterion of criteria) {
    if (criterion.kind === 'air_temperature') {
      const key = criterion.extreme === 'minimum' ? 'minimumTemperatureC' : 'maximumTemperatureC';
      const hits = weather.days.some(day => typeof day[key] === 'number' && Number.isFinite(day[key]) && meetsThreshold(criterion.comparison, criterion.threshold, day[key]!));
      if (!hits) continue;
      const below = criterion.comparison === 'below' || criterion.comparison === 'at_or_below';
      if (criterion.extreme === 'minimum' && below) covered.add('frost');
      if (criterion.extreme === 'maximum' && !below) covered.add('heat');
    } else if (criterion.event === 'rain') {
      if (weather.rainingNow || weather.days.some(day => day.rainy === true)) covered.add('rain');
    }
  }
  return covered;
}

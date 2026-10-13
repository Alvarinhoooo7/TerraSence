/**
 * Criterios agronómicos propios de una especie, por etapa, con su evidencia (TASK ES6).
 *
 * `speciesCatalog.ts` es identidad: nombre, nombre científico y la fuente que acredita
 * que la especie se cultiva en Chile. Este archivo es agronomía: umbrales con fuente
 * técnica, habilitados criterio por criterio. Ninguna especie hereda el perfil de otra
 * ni del grupo (MOTOR_AGRONOMICO.md §7.1): un perfil ausente en `SPECIES_RULES` no tiene
 * criterios, y así lo informa `hasEnabledCriteria`.
 *
 * Proceso de incorporación de cada criterio: MOTOR_AGRONOMICO.md §7.5. Esquema de
 * evidencia por perfil: §7.2. Estados de una regla: §8.1 (`draft`/`documented`/`enabled`
 * aquí; `locally_validated`/`retired` no aplican todavía porque no hay contraste de
 * terreno ni retiro de ningún criterio).
 */
import type { PhenologicalStage } from '../types/app';
import type { AgronomicAlert, SoilMeasurement } from '../types/agronomy';
import type { AppLanguage } from '../types/preferences';

export type SpeciesCriterionState = 'candidate' | 'documented' | 'enabled';

export interface SpeciesCriterionEvidence {
  institution: string;
  title: string;
  url: string;
  /** Sección, página o tabla citada dentro de la fuente. */
  section: string;
  /** Fecha ISO en que se verificó el contenido citado. */
  consultedAt: string;
  /** Valor y contexto tal como figuran en la fuente, antes de cualquier conversión. */
  originalValue: string;
}

export interface SpeciesPhCriterion {
  kind: 'ph';
  state: SpeciesCriterionState;
  /** Etapas de medición en que este criterio se evalúa. */
  stages: readonly PhenologicalStage[];
  min: number;
  max: number;
  note: string;
  noteEn: string;
  /** Qué no está documentado o qué contexto limita el criterio; nunca se omite. */
  limitations: string;
  limitationsEn: string;
  evidence: SpeciesCriterionEvidence;
}

/** Únicamente `ph` por ahora; ES6 incorpora temperatura, salinidad, agua y clima por especie. */
export type SpeciesCriterion = SpeciesPhCriterion;

export interface SpeciesRuleProfile {
  /** == `SpeciesEntry.id` de speciesCatalog.ts. */
  speciesId: string;
  /** Anual o perenne con evaluación parcial de suelo/clima (§7.1, T42). */
  horizon: 'annual' | 'perennial_partial';
  criteria: readonly SpeciesCriterion[];
}

const ph = (
  stages: PhenologicalStage[], min: number, max: number,
  note: string, noteEn: string, limitations: string, limitationsEn: string,
  evidence: SpeciesCriterionEvidence,
): SpeciesPhCriterion => ({ kind: 'ph', state: 'enabled', stages, min, max, note, noteEn, limitations, limitationsEn, evidence });

/**
 * Primer lote habilitado de ES6. Cada perfil se incorpora sólo con fuente propia
 * verificada; no se extrapola un rango de una especie a otra del mismo grupo.
 */
export const SPECIES_RULES: Readonly<Record<string, SpeciesRuleProfile>> = {
  'sp.arandano': {
    speciesId: 'sp.arandano',
    horizon: 'perennial_partial',
    criteria: [
      ph(
        ['vegetativo', 'floracion'], 4.5, 5.3,
        'El pH ideal documentado para arándano es 4,5 a 5,3.',
        'The documented ideal pH for blueberry is 4.5 to 5.3.',
        'Por debajo de 4,3 hay riesgo de toxicidad de aluminio; por encima de 5,5, crecimiento detenido y clorosis férrica. Entre 5,3 y 5,5 la fuente no documenta un umbral, sólo los extremos.',
        'Below 4.3 there is a risk of aluminum toxicity; above 5.5, stunted growth and iron chlorosis. Between 5.3 and 5.5 the source documents no threshold, only the extremes.',
        {
          institution: 'University of Maryland Extension',
          title: 'Growing Blueberries in the Mid-Atlantic (FS-2025-0766)',
          url: 'https://www.extension.umd.edu/resource/growing-blueberries-mid-atlantic-fs-2025-0766',
          section: 'Soil pH',
          consultedAt: '2026-10-13',
          originalValue: 'ideal 4.5–5.3; stunted growth above pH 5.5; lime needed below pH 4.3 to prevent aluminum toxicity',
        },
      ),
    ],
  },
};

export const findSpeciesRuleProfile = (speciesId: string | null | undefined): SpeciesRuleProfile | undefined =>
  speciesId ? SPECIES_RULES[speciesId] : undefined;

/** Si la especie tiene al menos un criterio habilitado para la etapa. `speciesCatalog.ts` delega aquí. */
export function hasEnabledCriteria(speciesId: string | null | undefined, stage: PhenologicalStage): boolean {
  const profile = findSpeciesRuleProfile(speciesId);
  if (!profile) return false;
  return profile.criteria.some(c => c.state === 'enabled' && c.stages.includes(stage));
}

/**
 * Alertas propias de la especie para esta captura y etapa. Se agregan a las alertas
 * generales sin reemplazarlas: una especie indicada no cambia cómo se evalúa el suelo
 * frío, salino o seco (T45); sólo añade las razones que su propio criterio documenta.
 */
export function evaluateSpeciesCriteria(
  speciesId: string | null | undefined,
  stage: PhenologicalStage,
  reading: SoilMeasurement,
  language: AppLanguage = 'es',
): AgronomicAlert[] {
  const profile = findSpeciesRuleProfile(speciesId);
  if (!profile) return [];
  const en = language === 'en';
  const alerts: AgronomicAlert[] = [];
  for (const criterion of profile.criteria) {
    if (criterion.state !== 'enabled' || !criterion.stages.includes(stage)) continue;
    if (criterion.kind === 'ph') {
      if (!Number.isFinite(reading.ph)) continue;
      const inRange = reading.ph >= criterion.min && reading.ph <= criterion.max;
      alerts.push({
        type: inRange ? 'info' : 'warning',
        param: 'ph',
        title: en
          ? `pH ${inRange ? 'within' : 'outside'} this species' documented range (${criterion.min}–${criterion.max})`
          : `pH ${inRange ? 'dentro de' : 'fuera de'} el rango documentado de esta especie (${criterion.min}–${criterion.max})`,
        action: `${en ? criterion.noteEn : criterion.note} ${en ? criterion.limitationsEn : criterion.limitations} (${criterion.evidence.institution}, ${criterion.evidence.title}).`,
      });
    }
  }
  return alerts;
}

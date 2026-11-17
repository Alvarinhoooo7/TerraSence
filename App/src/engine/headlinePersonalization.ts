import { findSpecies } from './speciesCatalog';
import type { PhenologicalStage } from '../types/app';

/**
 * Personaliza el titular de una recomendación con la especie y la etapa de la lectura. Sólo
 * reescribe los titulares genéricos que nombran «el cultivo»: el consejo es el mismo, dicho con
 * el nombre de lo que se midió. Con «tu» en vez de un artículo, el titular no depende del género
 * del nombre. Si la versión personalizada pasa del límite de 40 caracteres, queda la genérica.
 */
export const HEADLINE_MAX = 40;

type Lang = 'es' | 'en';
type Rewrite = (name: string) => string;

const BY_SPECIES: Record<Lang, Record<string, Rewrite>> = {
  es: {
    'Protege el cultivo del frío': n => `Protege tu ${n} del frío`,
    'Protege el cultivo del calor': n => `Protege tu ${n} del calor`,
    'Cuida que no le falte agua': n => `Cuida que a tu ${n} no le falte agua`,
    'Sigue observando el cultivo': n => `Sigue observando tu ${n}`,
    'Revisa la ventilación del cultivo': n => `Revisa la ventilación de tu ${n}`,
  },
  en: {
    'Protect the crop from the cold': n => `Protect your ${n} from the cold`,
    'Protect the crop from the heat': n => `Protect your ${n} from the heat`,
    'Make sure it does not lack water': n => `Make sure your ${n} gets water`,
    'Keep watching the crop': n => `Keep watching your ${n}`,
    'Check the crop ventilation': n => `Check ventilation for your ${n}`,
  },
};

/** «Nada que corregir» depende de la etapa: antes de sembrar no hay cultivo que observar. */
const NOTHING_TO_FIX: Record<Lang, { headline: string; byStage: Partial<Record<PhenologicalStage, string>> }> = {
  es: { headline: 'Sigue observando el cultivo', byStage: { pre_siembra: 'Sigue preparando la siembra', cosecha: 'Sigue con la cosecha prevista' } },
  en: { headline: 'Keep watching the crop', byStage: { pre_siembra: 'Keep preparing for planting', cosecha: 'Carry on with the planned harvest' } },
};

// Palabras que conservan su mayúscula dentro del nombre común.
const PROPER = new Set(['Swiss', 'Brussels', 'Bruselas', 'Asian', "Darwin's", 'Chilean', 'Monterey']);

function inSentence(name: string): string {
  return name.replace(/\s*\(.*?\)\s*/g, ' ').trim().split(/\s+/)
    .map(word => PROPER.has(word) ? word : word.charAt(0).toLocaleLowerCase('es') + word.slice(1)).join(' ');
}

export function personalizeHeadline(headline: string, stage: PhenologicalStage, speciesId: string | null | undefined, language: Lang): string {
  const nothing = NOTHING_TO_FIX[language];
  if (headline === nothing.headline && nothing.byStage[stage]) return nothing.byStage[stage]!;
  const species = findSpecies(speciesId);
  const rewrite = BY_SPECIES[language][headline];
  if (!species || !rewrite) return headline;
  const personal = rewrite(inSentence(language === 'en' ? species.en : species.es));
  return personal.length <= HEADLINE_MAX ? personal : headline;
}

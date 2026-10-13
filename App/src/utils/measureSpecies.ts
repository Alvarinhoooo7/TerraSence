/**
 * Especie de la medición en curso (TASK ES2/ES4, T48).
 *
 * La especie es opcional, sólo se pide fuera de pre-siembra y vive en el estado de la
 * pantalla de medición, nunca en el store global: cada medición nueva monta la pantalla
 * desde cero y parte sin especie, aunque la anterior tuviera una.
 */
import { NO_SPECIES_ID } from '../engine/speciesCatalog';
import type { PhenologicalStage } from '../types/app';

/** Toda medición nueva parte sin especie. */
export const initialMeasureSpecies = <T>(): T | null => null;

/** Vegetativo, floración y cosecha piden especie; pre-siembra (o sin etapa) no. */
export const asksForSpecies = (stage: PhenologicalStage | null | undefined): boolean =>
  stage != null && stage !== 'pre_siembra';

/** Entre vegetativo, floración y cosecha la planta es la misma; pasar a pre-siembra la borra. */
export const speciesAfterStageChange = <T>(current: T | null, next: PhenologicalStage): T | null =>
  asksForSpecies(next) ? current : null;

/** ID que se evalúa y se presenta: sólo cuando la etapa pide especie y hay una elegida. */
export const measuredSpeciesId = (stage: PhenologicalStage | null | undefined, species: { id: string } | null | undefined): string | null =>
  asksForSpecies(stage) && species ? species.id : null;

/** Valor de `crop_id` al guardar: la especie elegida o la ausencia explícita, nunca un cultivo ficticio. */
export const cropIdForSave = (stage: PhenologicalStage | null | undefined, species: { id: string } | null | undefined): string =>
  measuredSpeciesId(stage, species) ?? NO_SPECIES_ID;

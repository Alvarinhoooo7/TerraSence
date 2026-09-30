import { CROPS_DB, SOIL_TEXTURES } from './agronomyEngine';
import type { CropId, SoilTexture, SoilTextureId } from '../types/agronomy';
import type { AppLanguage } from '../types/preferences';

// Los IDs y los nombres del motor quedan estables para lecturas y diagnósticos guardados.
const cropNamesEn: Record<CropId, string> = {
  maiz: 'Grain corn / Sweet corn',
  tomate: 'Field / Greenhouse tomato',
  papa: 'Potato (tuber)',
  trigo: 'Wheat / Winter cereals',
  lechuga: 'Lettuce / Leafy greens',
  palto: 'Avocado (Hass)',
  vid: 'Wine / Table grapes',
  arandano: 'Blueberry (berries)',
};

const textureNamesEn: Record<SoilTextureId, string> = {
  arenoso: 'Sandy (loose / light)',
  franco: 'Loam (balanced / ideal)',
  franco_arcilloso: 'Clay loam (heavy)',
  arcilloso: 'Clay (very heavy / slow drainage)',
};

export const cropName = (id: CropId, language: AppLanguage = 'es'): string =>
  language === 'en' ? cropNamesEn[id] : CROPS_DB[id].name;

export const textureName = (id: SoilTextureId, language: AppLanguage = 'es'): string =>
  language === 'en' ? textureNamesEn[id] : SOIL_TEXTURES[id].name;

export const textureNameFromDefinition = (texture: SoilTexture, language: AppLanguage = 'es'): string => {
  const id = (Object.keys(SOIL_TEXTURES) as SoilTextureId[]).find(key => SOIL_TEXTURES[key].name === texture.name);
  return id ? textureName(id, language) : texture.name;
};

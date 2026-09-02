// src/store/useAppStore.ts
import { create } from 'zustand';
import type { PhenologicalStage, MapMeasurementPoint, DeviceRow } from '../types/app';
import type { CropId, SoilTextureId } from '../types/agronomy';
import { DEFAULT_APP_PREFERENCES, type AppPreferences } from '../types/preferences';

interface AppState {
  /** Fase elegida en el flujo de medición; determina la interpretación y el consejo. */
  stage: PhenologicalStage;
  cropId: CropId;
  textureId: SoilTextureId;
  fieldName: string;

  device: DeviceRow | null;
  points: MapMeasurementPoint[];
  selectedPointId: string | null;

  isSyncing: boolean;
  pendingCount: number;
  preferences: AppPreferences;
  preferencesLoaded: boolean;

  setStage: (s: PhenologicalStage) => void;
  setCrop: (c: CropId) => void;
  setTexture: (t: SoilTextureId) => void;
  setFieldName: (n: string) => void;
  setDevice: (d: DeviceRow | null) => void;
  setPoints: (p: MapMeasurementPoint[]) => void;
  addPoint: (p: MapMeasurementPoint) => void;
  selectPoint: (id: string | null) => void;
  setSyncing: (v: boolean) => void;
  setPendingCount: (n: number) => void;
  setPreferences: (preferences: AppPreferences) => void;
  setPreferencesLoaded: (loaded: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  stage: 'pre_siembra',
  cropId: 'maiz',
  textureId: 'franco',
  fieldName: 'Mi predio',

  device: null,
  points: [],
  selectedPointId: null,

  isSyncing: false,
  pendingCount: 0,
  preferences: DEFAULT_APP_PREFERENCES,
  preferencesLoaded: false,

  setStage: (stage) => set({ stage }),
  setCrop: (cropId) => set({ cropId }),
  setTexture: (textureId) => set({ textureId }),
  setFieldName: (fieldName) => set({ fieldName }),
  setDevice: (device) => set({ device }),
  setPoints: (points) => set({ points }),
  addPoint: (p) => set((s) => ({ points: [p, ...s.points] })),
  selectPoint: (selectedPointId) => set({ selectedPointId }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setPreferences: (preferences) => set({ preferences }),
  setPreferencesLoaded: (preferencesLoaded) => set({ preferencesLoaded }),
}));

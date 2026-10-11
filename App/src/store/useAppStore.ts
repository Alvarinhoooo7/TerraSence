// src/store/useAppStore.ts
import { create } from 'zustand';
import type { PhenologicalStage, MeasurementPoint, DeviceRow } from '../types/app';
import { DEFAULT_APP_PREFERENCES, type AppPreferences } from '../types/preferences';

interface AppState {
  /** Fase elegida en el flujo de medición; determina la interpretación y el consejo. */
  stage: PhenologicalStage;

  device: DeviceRow | null;
  points: MeasurementPoint[];
  selectedPointId: string | null;

  isSyncing: boolean;
  pendingCount: number;
  dataRevision: number;
  invalidateData: () => void;
  preferences: AppPreferences;
  preferencesLoaded: boolean;

  setStage: (s: PhenologicalStage) => void;
  setDevice: (d: DeviceRow | null) => void;
  setPoints: (p: MeasurementPoint[]) => void;
  addPoint: (p: MeasurementPoint) => void;
  selectPoint: (id: string | null) => void;
  setSyncing: (v: boolean) => void;
  setPendingCount: (n: number) => void;
  setPreferences: (preferences: AppPreferences) => void;
  setPreferencesLoaded: (loaded: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  stage: 'pre_siembra',

  device: null,
  points: [],
  selectedPointId: null,

  isSyncing: false,
  pendingCount: 0,
  dataRevision: 0,
  invalidateData: () => set(s => ({ dataRevision: s.dataRevision + 1 })),
  preferences: DEFAULT_APP_PREFERENCES,
  preferencesLoaded: false,

  setStage: (stage) => set({ stage }),
  setDevice: (device) => set({ device }),
  setPoints: (points) => set({ points }),
  addPoint: (p) => set((s) => ({ points: [p, ...s.points.filter(item => item.id !== p.id)] })),
  selectPoint: (selectedPointId) => set({ selectedPointId }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setPreferences: (preferences) => set({ preferences }),
  setPreferencesLoaded: (preferencesLoaded) => set({ preferencesLoaded }),
}));

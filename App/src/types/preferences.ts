export type AppLanguage = 'es' | 'en';
export type AppThemePreference = 'system' | 'light' | 'dark';
export type MeasurementSystem = 'metric' | 'imperial';
export type NotificationCategory = 'agronomic' | 'device' | 'weather' | 'sync';

export type GuideId =
  | 'auth'
  | 'onboarding'
  | 'map'
  | 'measure'
  | 'history'
  | 'settings'
  | 'devices'
  | 'perimeter';

export interface AppPreferences {
  language: AppLanguage;
  theme: AppThemePreference;
  measurementSystem: MeasurementSystem;
  notifications: Record<NotificationCategory, boolean>;
  guidesSeen: Partial<Record<GuideId, boolean>>;
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  language: 'es',
  theme: 'system',
  measurementSystem: 'metric',
  notifications: {
    agronomic: true,
    device: true,
    weather: true,
    sync: false,
  },
  guidesSeen: {},
};

export const normalizePreferences = (raw: unknown): AppPreferences => {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const notifications =
    value.notifications && typeof value.notifications === 'object'
      ? (value.notifications as Record<string, unknown>)
      : {};
  const guidesSeen =
    value.guides_seen && typeof value.guides_seen === 'object'
      ? (value.guides_seen as Record<string, unknown>)
      : value.guidesSeen && typeof value.guidesSeen === 'object'
        ? (value.guidesSeen as Record<string, unknown>)
        : {};

  return {
    language: value.language === 'en' ? 'en' : 'es',
    theme: value.theme === 'light' || value.theme === 'dark' ? value.theme : 'system',
    measurementSystem:
      value.measurement_system === 'imperial' || value.measurementSystem === 'imperial'
        ? 'imperial'
        : 'metric',
    notifications: {
      agronomic: notifications.agronomic !== false,
      device: notifications.device !== false,
      weather: notifications.weather !== false,
      sync: notifications.sync === true,
    },
    guidesSeen: Object.fromEntries(
      Object.entries(guidesSeen).filter(([, seen]) => seen === true),
    ) as AppPreferences['guidesSeen'],
  };
};

export const serializePreferences = (preferences: AppPreferences) => ({
  language: preferences.language,
  theme: preferences.theme,
  measurement_system: preferences.measurementSystem,
  notifications: preferences.notifications,
  guides_seen: preferences.guidesSeen,
});

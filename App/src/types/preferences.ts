export type AppLanguage = 'es' | 'en';
export type AppThemePreference = 'system' | 'light' | 'dark';
export type MeasurementSystem = 'metric' | 'imperial';
export type TextSize = 'normal' | 'large';
export type NotificationCategory = 'device';

export type GuideId =
  | 'auth'
  | 'onboarding'
  | 'measure'
  | 'history'
  | 'settings'
  | 'devices';

export interface AppPreferences {
  language: AppLanguage;
  theme: AppThemePreference;
  measurementSystem: MeasurementSystem;
  textSize: TextSize;
  notifications: Record<NotificationCategory, boolean>;
  guidesSeen: Partial<Record<GuideId, boolean>>;
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  language: 'es',
  theme: 'system',
  measurementSystem: 'metric',
  textSize: 'normal',
  notifications: {
    device: true,
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
    textSize: value.text_size === 'large' || value.textSize === 'large' ? 'large' : 'normal',
    notifications: {
      device: notifications.device !== false,
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
  text_size: preferences.textSize,
  notifications: preferences.notifications,
  guides_seen: preferences.guidesSeen,
});

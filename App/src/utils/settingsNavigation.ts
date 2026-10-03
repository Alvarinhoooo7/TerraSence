export type SettingsPageId = 'index' | 'account' | 'preferences' | 'equipment' | 'help'
  | 'profile' | 'notifications' | 'firmware' | 'language' | 'theme' | 'permissions'
  | 'sync' | 'about' | 'contact' | 'share';

const parents: Partial<Record<SettingsPageId, SettingsPageId>> = {
  // Mi cuenta se abre directo desde el índice: vuelve a él.
  notifications: 'preferences', language: 'preferences', theme: 'preferences', permissions: 'preferences',
  firmware: 'equipment', sync: 'equipment', share: 'equipment', about: 'help', contact: 'help',
};
export const settingsParent = (page: SettingsPageId): SettingsPageId => parents[page] ?? 'index';

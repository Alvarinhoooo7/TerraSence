import { GuideSwitch as Switch } from '../components/guide/GuideControls';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, View } from 'react-native';
import { SettingsPage, SettingsText, SettingsRow, SettingsCard } from '../components/SettingsUI';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { listMyDeviceMemberships } from '../services/deviceService';
import { clearDevSkip } from '../utils/devSkipOnboarding';
import { getPushRegistrationStatus, registerPushToken, signOutThisPhone, subscribePushRegistration } from '../services/notifications';
import { savePreferences } from '../services/preferencesService';
import { pendingCount } from '../services/measurementsService';
import type { AppPreferences } from '../types/preferences';
import { ProfileScreen } from './ProfileScreen';
import { AboutSettings, ContactSettings, FirmwareSettings, PhonePermissions, SyncSettings } from './SettingsDetails';

type Page = 'index' | 'profile' | 'notifications' | 'firmware' | 'language' | 'theme' | 'permissions' | 'sync' | 'about' | 'contact';
interface Props { onClose: () => void; onOpenInbox: () => void; onOpenDevices: () => void; onOpenAdministration: () => void }
export function FieldSettingsScreen({ onClose, onOpenInbox, onOpenDevices, onOpenAdministration }: Props) {
  const { colors } = useAppTheme(); const { t } = useTranslation();
  const preferences = useAppStore(s => s.preferences); const [page, setPage] = useState<Page>('index');
  const [canAdminister, setCanAdminister] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false);
  const [pushStatus, setPushStatus] = useState(getPushRegistrationStatus);
  useEffect(() => subscribePushRegistration(setPushStatus), []);
  useEffect(() => { let active = true; const refresh = () => void listMyDeviceMemberships().then(rows => { if (active) setCanAdminister(rows.some(m => m.role === 'admin' && m.is_authorized)); }).catch(() => { if (active) setCanAdminister(false); }); refresh(); const timer = setInterval(refresh, 10000); return () => { active = false; clearInterval(timer); }; }, []);
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (busy) return true; if (page === 'index') return false; setPage('index'); return true; }); return () => sub.remove(); }, [page, busy]);
  const back = () => { if (!busy) { setError(''); setPage('index'); } };
  const apply = async (next: AppPreferences) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    const previous = useAppStore.getState().preferences;
    useAppStore.getState().setPreferences(next);
    try { await savePreferences(next); void registerPushToken(next).catch(() => undefined); }
    catch { useAppStore.getState().setPreferences(previous); setError(t('No se pudo guardar el cambio. Inténtalo nuevamente.', 'Could not save the change. Please retry.')); }
    finally { lock.current = false; setBusy(false); }
  };
  const signOut = async () => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try {
      // Revoca esta instalación y cierra sólo en este teléfono (alcance local).
      await signOutThisPhone(clearDevSkip);
    }
    catch { setError(t('No se pudo cerrar sesión. Revisa la conexión y vuelve a intentarlo.', 'Could not sign out. Check connectivity and retry.')); }
    finally { lock.current = false; setBusy(false); }
  };
  const confirmSignOut = async () => {
    try { const count = await pendingCount(); Alert.alert(t('Cerrar sesión', 'Sign out'), count ? t(`Hay ${count} mediciones pendientes. Se conservarán en este teléfono para esta cuenta. Sincroniza antes si no volverás a usarla.`, `There are ${count} pending readings. They remain on this phone for this account. Sync first if you will not use it again.`) : t('¿Quieres cerrar tu sesión?', 'Do you want to sign out?'), [{ text: t('Cancelar', 'Cancel'), style: 'cancel' }, { text: t('Cerrar sesión', 'Sign out'), style: 'destructive', onPress: () => void signOut() }]); }
    catch { setError(t('No pudimos comprobar tus pendientes. Revisa Datos y sincronización.', 'Could not check pending readings. Review Data and synchronization.')); }
  };
  if (page === 'profile') return <ProfileScreen onBack={back} />;
  if (page === 'permissions') return <PhonePermissions onBack={back} />;
  if (page === 'sync') return <SyncSettings onBack={back} />;
  if (page === 'firmware') return <FirmwareSettings onBack={back} />;
  if (page === 'about') return <AboutSettings onBack={back} />;
  if (page === 'contact') return <ContactSettings onBack={back} />;
  const title = { index: t('Ajustes', 'Settings'), notifications: t('Notificaciones', 'Notifications'), language: t('Idioma', 'Language'), theme: t('Apariencia', 'Appearance') }[page];
  return <SettingsPage title={title} description={page === 'index' ? t('Tu cuenta, tus equipos y tus preferencias.', 'Your account, devices and preferences.') : undefined} onBack={page === 'index' ? onClose : back}>
    {!!error && <SettingsText danger>{error}</SettingsText>}
    {page === 'index' && <>
      <SettingsRow title={t('Mi perfil', 'My profile')} subtitle={t('Nombre, correo y contraseña', 'Name, email and password')} onPress={() => setPage('profile')} />
      <SettingsRow title={t('Mis dispositivos', 'My devices')} subtitle={t('Equipos vinculados y acceso compartido', 'Linked devices and shared access')} onPress={onOpenDevices} />
      {canAdminister && <SettingsRow title={t('Administración del equipo', 'Device administration')} subtitle={t('Miembros, solicitudes y propiedad', 'Members, requests and ownership')} onPress={onOpenAdministration} />}
      <SettingsRow title={t('Avisos', 'Alerts')} subtitle={t('Solicitudes y cambios de acceso', 'Requests and access changes')} onPress={onOpenInbox} />
      <SettingsRow title={t('Notificaciones', 'Notifications')} subtitle={t('Avisos push de equipos', 'Device push alerts')} onPress={() => setPage('notifications')} />
      <SettingsRow title={t('Actualizaciones', 'Updates')} subtitle={t('Firmware del ESP32', 'ESP32 firmware')} onPress={() => setPage('firmware')} />
      <SettingsRow title={t('Idioma', 'Language')} subtitle={preferences.language === 'es' ? 'Español' : 'English'} onPress={() => setPage('language')} />
      <SettingsRow title={t('Apariencia', 'Appearance')} onPress={() => setPage('theme')} />
      <SettingsRow title={t('Permisos del teléfono', 'Phone permissions')} onPress={() => setPage('permissions')} />
      <SettingsRow title={t('Datos y sincronización', 'Data and synchronization')} onPress={() => setPage('sync')} />
      <SettingsRow title={t('Contacto', 'Contact')} onPress={() => setPage('contact')} />
      <SettingsRow title={t('Acerca de y privacidad', 'About and privacy')} onPress={() => setPage('about')} />
      <View style={{ height: 12 }} /><SettingsRow title={t('Cerrar sesión', 'Sign out')} danger disabled={busy} onPress={() => void confirmSignOut()} />
    </>}
    {page === 'language' && <>{(['es', 'en'] as const).map(language => <SettingsRow key={language} title={language === 'es' ? 'Español' : 'English'} selected={language === preferences.language} disabled={busy} onPress={() => void apply({ ...preferences, language })} />)}
      <SettingsText>{t('Unidades de medida', 'Measurement units')}</SettingsText>{(['metric', 'imperial'] as const).map(measurementSystem => <SettingsRow key={measurementSystem} title={measurementSystem === 'metric' ? t('Métrico · °C, ha', 'Metric · °C, ha') : t('Imperial · °F, ac', 'Imperial · °F, ac')} selected={preferences.measurementSystem === measurementSystem} disabled={busy} onPress={() => void apply({ ...preferences, measurementSystem })} />)}</>}
    {page === 'theme' && (['system', 'light', 'dark'] as const).map(theme => <SettingsRow key={theme} title={theme === 'system' ? t('Seguir el sistema', 'Follow system') : theme === 'light' ? t('Claro', 'Light') : t('Oscuro', 'Dark')} selected={preferences.theme === theme} disabled={busy} onPress={() => void apply({ ...preferences, theme })} />)}
    {page === 'notifications' && <>
      <SettingsText>{t('Recibe solicitudes de acceso, aprobaciones, rechazos y cambios de administración. El permiso del teléfono se gestiona por separado. Los cambios sin conexión se enviarán cuando vuelvas a conectarte.', 'Receive access requests, approvals, rejections and administration changes. Phone permission is managed separately. Offline changes will sync when you reconnect.')}</SettingsText>
      {pushStatus === 'error' && <SettingsCard><SettingsText danger>{t('No se pudo actualizar el registro de este teléfono. Reintenta con conexión.', 'Could not update this phone registration. Retry online.')}</SettingsText><SettingsRow title={t('Reintentar registro', 'Retry registration')} onPress={() => void registerPushToken().catch(() => undefined)} /></SettingsCard>}
      <SettingsCard><View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}><View style={{ flex: 1 }}><SettingsText>{t('Acceso a equipos', 'Device access')}</SettingsText><SettingsText>{t('Avisos push sobre miembros y solicitudes.', 'Push alerts about members and requests.')}</SettingsText></View><Switch accessibilityLabel={t('Acceso a equipos', 'Device access')} disabled={busy} value={preferences.notifications.device} onValueChange={enabled => void apply({ ...preferences, notifications: { device: enabled } })} trackColor={{ false: colors.border, true: colors.primary }} /></View></SettingsCard>
      <SettingsRow title={t('Revisar permiso del teléfono', 'Review phone permission')} onPress={() => setPage('permissions')} />
    </>}
  </SettingsPage>;
}

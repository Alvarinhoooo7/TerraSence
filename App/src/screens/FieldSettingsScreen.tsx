import { GuideSwitch as Switch } from '../components/guide/GuideControls';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Text, View } from 'react-native';
import { SettingsPage, SettingsText, SettingsRow, SettingsCard } from '../components/SettingsUI';
import { ScreenCard, ScreenLabel, ScreenSegmented } from '../components/screen/ScreenUI';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { listMyDeviceMemberships } from '../services/deviceService';
import { clearDevSkip } from '../utils/devSkipOnboarding';
import { getPushRegistrationStatus, registerPushToken, signOutThisPhone, subscribePushRegistration } from '../services/notifications';
import { savePreferences } from '../services/preferencesService';
import { pendingCount } from '../services/measurementsService';
import type { AppPreferences } from '../types/preferences';
import { ProfileScreen } from './ProfileScreen';
import { AboutSettings, ContactSettings, FirmwareSettings, PhonePermissions, SyncSettings } from './SettingsDetails';
import { ShareDeviceScreen } from './ShareDeviceScreen';
import { settingsParent, type SettingsPageId } from '../utils/settingsNavigation';

type Page = SettingsPageId;
interface Props { onClose: () => void; onOpenInbox: () => void; onOpenAdministration: () => void; initialPage?: SettingsPageId }
export function FieldSettingsScreen({ onClose, onOpenInbox, onOpenAdministration, initialPage = 'index' }: Props) {
  const { colors } = useAppTheme(); const { t } = useTranslation();
  const preferences = useAppStore(s => s.preferences); const [page, setPage] = useState<Page>(initialPage);
  const [canAdminister, setCanAdminister] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false);
  const [pushStatus, setPushStatus] = useState(getPushRegistrationStatus);
  useEffect(() => subscribePushRegistration(setPushStatus), []);
  useEffect(() => { let active = true; const refresh = () => void listMyDeviceMemberships().then(rows => { if (active) setCanAdminister(rows.some(m => m.role === 'admin' && m.is_authorized)); }).catch(() => { if (active) setCanAdminister(false); }); refresh(); const timer = setInterval(refresh, 10000); return () => { active = false; clearInterval(timer); }; }, []);
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (busy) return true; if (page === 'index') return false; setPage(settingsParent(page)); return true; }); return () => sub.remove(); }, [page, busy]);
  const back = () => { if (!busy) { setError(''); setPage(settingsParent(page)); } };
  const apply = async (next: AppPreferences) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    const previous = useAppStore.getState().preferences;
    // Cuenta de este cambio: si la sesión cambia mientras se guarda, una respuesta
    // tardía no restaura ni avisa sobre las preferencias de la cuenta nueva.
    const account = useAuthStore.getState().session?.user.id;
    const sameAccount = () => useAuthStore.getState().session?.user.id === account;
    useAppStore.getState().setPreferences(next);
    try { await savePreferences(next); if (sameAccount()) void registerPushToken(next).catch(() => undefined); }
    catch { if (!sameAccount()) return; useAppStore.getState().setPreferences(previous); setError(t('No se pudo guardar el cambio. Inténtalo nuevamente.', 'Could not save the change. Please retry.')); }
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
  if (page === 'share') return <ShareDeviceScreen onBack={back} />;
  const title = { index: t('Configuración', 'Settings'), account: t('Cuenta', 'Account'), preferences: t('Preferencias', 'Preferences'), equipment: t('Equipos y datos', 'Devices and data'), help: t('Ayuda y privacidad', 'Help and privacy'), notifications: t('Notificaciones', 'Notifications'), language: t('Idioma y unidades', 'Language and units'), theme: t('Apariencia', 'Appearance') }[page];
  // Etiqueta de cada subpantalla: la categoría a la que vuelve. El índice es una
  // pestaña de la barra inferior y no lleva «Volver».
  const parent = settingsParent(page);
  const eyebrow = page === 'index' ? 'TERRASENSE' : (parent === 'index' ? t('Configuración', 'Settings') : ({ account: t('Cuenta', 'Account'), preferences: t('Preferencias', 'Preferences'), equipment: t('Equipos y datos', 'Devices and data'), help: t('Ayuda y privacidad', 'Help and privacy') } as Record<string, string>)[parent] ?? '').toUpperCase();
  return <SettingsPage title={title} eyebrow={eyebrow} description={page === 'index' ? t('Tu cuenta, tus equipos y tus preferencias.', 'Your account, devices and preferences.') : undefined} onBack={page === 'index' ? undefined : back}>
    {!!error && <SettingsText danger>{error}</SettingsText>}
    {page === 'index' && <>
      <SettingsRow title={t('Mi cuenta', 'My account')} subtitle={t('Nombre, correo y contraseña', 'Name, email and password')} onPress={() => setPage('profile')} />
      <SettingsRow title={t('Preferencias', 'Preferences')} subtitle={t('Idioma, unidades, apariencia y permisos', 'Language, units, appearance and permissions')} onPress={() => setPage('preferences')} />
      <SettingsRow title={t('Equipos y datos', 'Devices and data')} subtitle={t('Acceso, actualizaciones y sincronización', 'Access, updates and synchronization')} onPress={() => setPage('equipment')} />
      <SettingsRow title={t('Ayuda y privacidad', 'Help and privacy')} subtitle={t('Avisos, contacto y documentos', 'Alerts, contact and documents')} onPress={() => setPage('help')} />
      <SettingsRow title={t('Cerrar sesión', 'Sign out')} subtitle={t('Sólo en este teléfono', 'On this phone only')} danger disabled={busy} onPress={() => void confirmSignOut()} />
    </>}
    {page === 'equipment' && <>
      <SettingsRow title={t('Compartir acceso', 'Share access')} subtitle={t('Invitación temporal por QR o código', 'Temporary invitation by QR or code')} onPress={() => setPage('share')} />
      {canAdminister && <SettingsRow title={t('Administración del equipo', 'Device administration')} subtitle={t('Miembros, solicitudes y propiedad', 'Members, requests and ownership')} onPress={onOpenAdministration} />}
      <SettingsRow title={t('Actualizaciones', 'Updates')} subtitle={t('Firmware del ESP32', 'ESP32 firmware')} onPress={() => setPage('firmware')} />
      <SettingsRow title={t('Datos y sincronización', 'Data and synchronization')} onPress={() => setPage('sync')} />
    </>}
    {page === 'preferences' && <>
      {/* Las tres preferencias de pocas opciones se eligen aquí mismo, sin subpantallas. */}
      <ScreenCard>
        <ScreenSegmented label={t('Idioma', 'Language')} disabled={busy} value={preferences.language}
          options={[{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]} onChange={language => void apply({ ...preferences, language })} />
        <ScreenSegmented label={t('Unidades', 'Units')} disabled={busy} value={preferences.measurementSystem}
          options={[{ value: 'metric', label: t('Métrico · °C', 'Metric · °C') }, { value: 'imperial', label: t('Imperial · °F', 'Imperial · °F') }]} onChange={measurementSystem => void apply({ ...preferences, measurementSystem })} />
        <ScreenSegmented label={t('Apariencia', 'Appearance')} disabled={busy} value={preferences.theme}
          options={[{ value: 'system', label: t('Sistema', 'System') }, { value: 'light', label: t('Claro', 'Light') }, { value: 'dark', label: t('Oscuro', 'Dark') }]} onChange={theme => void apply({ ...preferences, theme })} />
      </ScreenCard>
      <ScreenLabel>{t('Avisos y permisos', 'Alerts and permissions')}</ScreenLabel>
      <SettingsRow title={t('Notificaciones', 'Notifications')} subtitle={preferences.notifications.device ? t('Avisos de acceso activados', 'Access alerts on') : t('Avisos de acceso desactivados', 'Access alerts off')} onPress={() => setPage('notifications')} />
      <SettingsRow title={t('Permisos del teléfono', 'Phone permissions')} subtitle={t('Bluetooth, ubicación, cámara y avisos', 'Bluetooth, location, camera and alerts')} onPress={() => setPage('permissions')} />
    </>}
    {page === 'help' && <>
      <SettingsRow title={t('Avisos', 'Alerts')} subtitle={t('Solicitudes y cambios de acceso a tus equipos', 'Requests and access changes for your devices')} onPress={onOpenInbox} />
      <SettingsRow title={t('Contactar a soporte', 'Contact support')} subtitle={t('Escríbenos por correo', 'Write to us by email')} onPress={() => setPage('contact')} />
      <SettingsRow title={t('Términos y privacidad', 'Terms and privacy')} subtitle={t('Cómo funciona el servicio y cómo cuidamos tus datos', 'How the service works and how we protect your data')} onPress={() => setPage('about')} />
    </>}
    {page === 'language' && <>{(['es', 'en'] as const).map(language => <SettingsRow key={language} title={language === 'es' ? 'Español' : 'English'} selected={language === preferences.language} disabled={busy} onPress={() => void apply({ ...preferences, language })} />)}
      <ScreenLabel>{t('Unidades de medida', 'Measurement units')}</ScreenLabel>{(['metric', 'imperial'] as const).map(measurementSystem => <SettingsRow key={measurementSystem} title={measurementSystem === 'metric' ? t('Métrico · °C, ha', 'Metric · °C, ha') : t('Imperial · °F, ac', 'Imperial · °F, ac')} selected={preferences.measurementSystem === measurementSystem} disabled={busy} onPress={() => void apply({ ...preferences, measurementSystem })} />)}</>}
    {page === 'theme' && (['system', 'light', 'dark'] as const).map(theme => <SettingsRow key={theme} title={theme === 'system' ? t('Seguir el sistema', 'Follow system') : theme === 'light' ? t('Claro', 'Light') : t('Oscuro', 'Dark')} selected={preferences.theme === theme} disabled={busy} onPress={() => void apply({ ...preferences, theme })} />)}
    {page === 'notifications' && <>
      <SettingsText>{t('Recibe solicitudes de acceso, aprobaciones, rechazos y cambios de administración. El permiso del teléfono se gestiona por separado. Los cambios sin conexión se enviarán cuando vuelvas a conectarte.', 'Receive access requests, approvals, rejections and administration changes. Phone permission is managed separately. Offline changes will sync when you reconnect.')}</SettingsText>
      {pushStatus === 'error' && <SettingsCard><SettingsText danger>{t('No se pudo actualizar el registro de este teléfono. Reintenta con conexión.', 'Could not update this phone registration. Retry online.')}</SettingsText><SettingsRow title={t('Reintentar registro', 'Retry registration')} onPress={() => void registerPushToken().catch(() => undefined)} /></SettingsCard>}
      <SettingsCard><View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{t('Acceso a equipos', 'Device access')}</Text><SettingsText>{t('Avisos push sobre miembros y solicitudes.', 'Push alerts about members and requests.')}</SettingsText></View><Switch accessibilityLabel={t('Acceso a equipos', 'Device access')} disabled={busy} value={preferences.notifications.device} onValueChange={enabled => void apply({ ...preferences, notifications: { device: enabled } })} trackColor={{ false: colors.border, true: colors.primary }} /></View></SettingsCard>
      <SettingsRow title={t('Revisar permiso del teléfono', 'Review phone permission')} onPress={() => setPage('permissions')} />
    </>}
  </SettingsPage>;
}

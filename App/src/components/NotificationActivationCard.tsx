import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ScreenCard, ScreenText } from './screen/ScreenUI';
import { EntryButton } from './entry/EntryUI';
import { askForAccess } from './permissionPrompt';
import { openPermissionSettings, readPermission } from '../services/permissionsService';
import { getPushRegistrationStatus, registerPushToken, subscribePushRegistration } from '../services/notifications';
import { savePreferences } from '../services/preferencesService';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { createAccountOperation } from '../utils/accountOperation';
import { notificationActivation } from '../utils/notificationActivation';
import type { PermissionState } from '../utils/permissionState';

/** Control contextual, sin ventanas al entrar ni cambios de permiso automáticos. */
export function NotificationActivationCard({ description, showRegistered = false }: { description?: string; showRegistered?: boolean }) {
  const { t, language } = useTranslation();
  const enabled = useAppStore(s => s.preferences.notifications.device);
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [registration, setRegistration] = useState(getPushRegistrationStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const revision = useRef(0);
  const account = useRef(createAccountOperation(useAuthStore.getState().session?.user.id, () => useAuthStore.getState().session?.user.id));
  const refresh = useCallback(async () => {
    const version = ++revision.current;
    const active = account.current.begin();
    const next = await readPermission('notifications');
    if (active() && version === revision.current) setPermission(next);
  }, []);
  useEffect(() => {
    account.current.mount();
    void refresh();
    const unsubscribeStatus = subscribePushRegistration(setRegistration);
    const unsubscribeAccount = useAuthStore.subscribe(() => account.current.cancelIfAccountChanged());
    const foreground = AppState.addEventListener('change', state => { if (state === 'active' && !lock.current) void refresh(); });
    return () => { account.current.unmount(); revision.current++; unsubscribeStatus(); unsubscribeAccount(); foreground.remove(); };
  }, [refresh]);

  const view = notificationActivation(permission, enabled, registration);
  const act = async () => {
    if (lock.current || !view.action) return;
    lock.current = true; revision.current++; setBusy(true); setError('');
    const active = account.current.begin();
    try {
      if (!active()) return;
      if (view.action === 'settings') await openPermissionSettings();
      else if (view.action === 'check') await refresh();
      else {
        const access = await askForAccess('notifications', language, active);
        if (!active()) return;
        setPermission(access.state);
        if (!access.ok) return;
        const current = useAppStore.getState().preferences;
        if (!current.notifications.device) {
          const next = { ...current, notifications: { device: true } };
          await savePreferences(next);
          if (!active()) return;
          useAppStore.getState().setPreferences(next);
        }
        await registerPushToken();
      }
    } catch {
      if (active()) setError(t('No pudimos completar la activación. Revisa la conexión e inténtalo otra vez.', 'Could not complete activation. Check your connection and try again.'));
    } finally {
      lock.current = false;
      if (active()) { setBusy(false); void refresh(); }
    }
  };

  if (!showRegistered && (view.state === 'registered' || view.state === 'quiet')) return null;
  const messages = {
    checking: t('Consultando el permiso del teléfono…', 'Checking phone permission…'),
    'permission-error': t('No pudimos consultar el permiso del teléfono.', 'Could not check phone permission.'),
    unavailable: t('Este teléfono no permite usar notificaciones. Puedes consultar los avisos dentro de la app.', 'Notifications are unavailable on this phone. You can read alerts in the app.'),
    'preference-off': t('Los avisos están desactivados en tu cuenta.', 'Alerts are turned off for your account.'),
    'permission-needed': t('Falta autorizar las notificaciones en este teléfono.', 'Notification permission is needed on this phone.'),
    'permission-blocked': t('Las notificaciones están desactivadas en el teléfono. Puedes cambiarlas en sus ajustes.', 'Notifications are disabled on this phone. You can change them in its settings.'),
    registering: t('Registrando este teléfono para recibir avisos…', 'Registering this phone for alerts…'),
    'registration-pending': t('El permiso está concedido, pero falta confirmar el registro para recibir avisos.', 'Permission is granted, but phone registration still needs confirmation.'),
    registered: t('Permiso concedido y teléfono registrado para recibir avisos.', 'Permission granted and phone registered for alerts.'),
    quiet: t('Teléfono registrado con avisos silenciosos. Puedes cambiar su presentación en los ajustes.', 'Phone registered for quiet notifications. You can change their presentation in settings.'),
  };
  const labels = {
    enable: t('Activar avisos de acceso', 'Enable access alerts'),
    request: t('Activar avisos de acceso', 'Enable access alerts'),
    settings: t('Abrir ajustes del teléfono', 'Open phone settings'),
    retry: t('Reintentar registro', 'Retry registration'),
    check: t('Comprobar permiso', 'Check permission'),
  };
  return <ScreenCard>
    <ScreenText muted={false}>{description ?? t('Recibe avisos de solicitudes, aprobaciones, rechazos y cambios de administración.', 'Get alerts about requests, approvals, rejections and administration changes.')}</ScreenText>
    <ScreenText>{messages[view.state]}</ScreenText>
    <ScreenText>{t('Es opcional: puedes seguir usando la app y consultar Avisos sin activarlos.', 'Optional: you can keep using the app and read Alerts without enabling notifications.')}</ScreenText>
    {!!error && <ScreenText danger>{error}</ScreenText>}
    {view.action && <EntryButton secondary label={labels[view.action]} busy={busy} onPress={() => void act()} />}
  </ScreenCard>;
}

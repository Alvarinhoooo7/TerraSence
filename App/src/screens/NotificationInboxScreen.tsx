import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SettingsButton, SettingsCard, SettingsPage, SettingsText } from '../components/SettingsUI';
import { GuideTouchable as TouchableOpacity } from '../components/guide/GuideControls';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { getMyNotification, listMyNotifications, markNotificationRead, type DeviceNotification, type NotificationCursor } from '../services/notificationInbox';
import { NotificationUnavailableError, isOfflineError, notificationCopy, parseNotificationPayload } from '../utils/notificationRoute';
import { useAuthStore } from '../store/useAuthStore';

type Problem = 'offline' | 'load' | 'open' | 'unavailable' | 'resolved';

/**
 * Acceso a la bandeja desde pantallas que no tienen Ajustes (espera de aprobación, vinculación).
 * Es una franja DENTRO del flujo, encima del contenido: el contenido baja lo que ella ocupe y
 * ninguna cabecera ni acción queda tapada, con pantalla compacta o texto grande. Queda a la
 * izquierda del botón de guía («?», absoluto en la esquina superior derecha), sin solaparse.
 */
export function InboxShortcut({ onPress }: { onPress: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // La franja ocupa el área segura superior; la pantalla de abajo, al estar debajo de ella, no la repite.
  return <View style={{ paddingTop: insets.top + 6, paddingBottom: 6, paddingLeft: 16, paddingRight: 16 + 48 + 8, alignItems: 'flex-end', backgroundColor: colors.background }}>
    <TouchableOpacity guideTitle={t('Avisos', 'Alerts')} accessibilityRole="button" onPress={onPress}
      style={{ minHeight: 48, minWidth: 48, maxWidth: '100%', paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 24 }}>
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>{t('Avisos', 'Alerts')}</Text>
    </TouchableOpacity>
  </View>;
}

export function NotificationInboxScreen({ onBack, onOpen, initialAlertId, onInitialHandled }: {
  onBack: () => void;
  /** Navega a la pantalla del aviso tras comprobar acceso; rechaza con `NotificationUnavailableError` si ya no corresponde. */
  onOpen: (notification: DeviceNotification) => Promise<void>;
  /** Aviso de una push que debe abrirse al entrar. */
  initialAlertId?: string | null;
  /** Se invoca al tomar `initialAlertId`, para que no se repita al volver a esta pantalla. */
  onInitialHandled?: () => void;
}) {
  const { colors } = useAppTheme();
  const { t, language, locale } = useTranslation();
  const uid = useAuthStore(s => s.session?.user.id);
  const [rows, setRows] = useState<DeviceNotification[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const request = useRef(0);
  const openLock = useRef(false);
  const handled = useRef<string | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const sameAccount = useCallback(() => useAuthStore.getState().session?.user.id === uid, [uid]);

  const load = useCallback(async (before: NotificationCursor | null = null) => {
    const version = ++request.current;
    setLoading(true);
    try {
      const page = await listMyNotifications(before);
      if (version !== request.current || !sameAccount()) return;
      setRows(current => before ? [...current, ...page.rows.filter(item => !current.some(existing => existing.id === item.id))] : page.rows);
      setHasMore(page.hasMore);
      setProblem(current => current === 'offline' || current === 'load' ? null : current);
    } catch (error) {
      if (version === request.current && sameAccount()) setProblem(isOfflineError(error) ? 'offline' : 'load');
    } finally { if (version === request.current) { setLoading(false); setLoaded(true); } }
  }, [sameAccount]);

  // Al entrar o cambiar de cuenta se parte de cero; el estado nunca se hereda de otra cuenta.
  useEffect(() => {
    setRows([]); setHasMore(false); setLoaded(false); setProblem(null);
    void load();
    const appState = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    // Con la bandeja abierta, una push nueva aparece sin salir y volver a entrar.
    const received = Notifications.addNotificationReceivedListener(notification => {
      if (parseNotificationPayload(notification.request.content.data)) void load();
    });
    return () => { request.current += 1; appState.remove(); received.remove(); };
  }, [load]);

  // Recuperación: mientras haya un fallo de carga se reintenta solo, sin pedir permisos ni bloquear.
  useEffect(() => {
    if (problem !== 'offline' && problem !== 'load') return;
    const timer = setInterval(() => void load(), 15_000);
    return () => clearInterval(timer);
  }, [problem, load]);

  const open = useCallback(async (id: string) => {
    if (openLock.current || !uid) return;
    openLock.current = true; setOpening(true); setProblem(null);
    try {
      // Reconsultar antes de navegar: la cuenta, la membresía o la solicitud pudieron cambiar.
      const fresh = await getMyNotification(id);
      if (!sameAccount()) return;
      if (!fresh) { setProblem('unavailable'); void load(); return; }
      await markNotificationRead(fresh.id);
      if (!sameAccount()) return;
      setRows(current => current.map(item => item.id === fresh.id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item));
      if (fresh.status === 'active') await onOpenRef.current(fresh);
      else setProblem('resolved');
    } catch (error) {
      if (!sameAccount()) return;
      // 42501: el servidor ya no reconoce el aviso para esta cuenta.
      if (error instanceof NotificationUnavailableError || (error as { code?: string } | null)?.code === '42501') { setProblem('unavailable'); void load(); }
      else setProblem(isOfflineError(error) ? 'offline' : 'open');
    } finally { openLock.current = false; setOpening(false); }
  }, [uid, sameAccount, load]);

  useEffect(() => {
    if (!initialAlertId) { handled.current = null; return; }
    if (opening || handled.current === initialAlertId) return;
    handled.current = initialAlertId;
    onInitialHandled?.();
    void open(initialAlertId);
  }, [initialAlertId, opening, open, onInitialHandled]);

  const message: Record<Problem, string> = {
    offline: t('Sin conexión. Los avisos se actualizarán cuando vuelvas a conectarte.', 'You are offline. Alerts will refresh when you reconnect.'),
    load: t('No se pudieron cargar los avisos. Reintentando.', 'Could not load alerts. Retrying.'),
    open: t('No se pudo abrir el aviso. Inténtalo de nuevo.', 'Could not open the alert. Please try again.'),
    unavailable: t('Este aviso ya no está disponible.', 'This alert is no longer available.'),
    resolved: t('Este aviso ya no requiere acción.', 'This alert no longer needs action.'),
  };

  return <SettingsPage title={t('Avisos', 'Alerts')} onBack={onBack}
    description={t('Solicitudes y cambios de acceso a tus equipos.', 'Requests and access changes for your devices.')}>
    {!!problem && <SettingsText danger={problem !== 'resolved'}>{message[problem]}</SettingsText>}
    {loading && !loaded && <View accessibilityRole="progressbar" accessibilityLabel={t('Cargando avisos', 'Loading alerts')} style={{ paddingVertical: 24, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={colors.primary} />
      <SettingsText>{t('Cargando avisos…', 'Loading alerts…')}</SettingsText>
    </View>}
    {loaded && !rows.length && !problem && <SettingsCard>
      <SettingsText>{t('Todavía no hay avisos. Aquí aparecerán las solicitudes de acceso y los cambios de administración de tus equipos.', 'There are no alerts yet. Access requests and administrator changes for your devices will appear here.')}</SettingsText>
    </SettingsCard>}
    {rows.map(row => {
      const copy = notificationCopy(row.event_type, language);
      const unavailable = row.status !== 'active';
      const state = row.status === 'expired' ? t('Vencido', 'Expired') : row.status === 'cancelled' ? t('Resuelto', 'Resolved') : '';
      const unread = !row.read_at;
      return <TouchableOpacity key={row.id} guideTitle={copy.title} accessibilityRole="button" accessibilityState={{ disabled: opening }}
        accessibilityLabel={[unread ? t('Sin leer', 'Unread') : '', copy.title, copy.body, state].filter(Boolean).join('. ')}
        disabled={opening} onPress={() => void open(row.id)} style={{ opacity: unavailable ? 0.7 : 1 }}>
        <SettingsCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {unread && <View importantForAccessibility="no-hide-descendants" style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
            <Text style={{ flex: 1, flexShrink: 1, color: colors.text, fontWeight: unread ? '700' : '600', fontSize: 16 }}>{copy.title}</Text>
          </View>
          <SettingsText>{copy.body}</SettingsText>
          <SettingsText>{new Date(row.created_at).toLocaleString(locale)}{state ? ` · ${state}` : ''}</SettingsText>
        </SettingsCard>
      </TouchableOpacity>;
    })}
    {hasMore && <SettingsButton title={t('Ver avisos anteriores', 'View earlier alerts')} onPress={() => void load(rows[rows.length - 1] ?? null)} busy={loading} disabled={!rows.length} />}
    <SettingsButton title={t('Actualizar', 'Refresh')} onPress={() => void load()} busy={loading} />
  </SettingsPage>;
}

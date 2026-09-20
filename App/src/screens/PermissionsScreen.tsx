import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AuthButton, AuthHeading, AuthLayout, AuthMessage, authStyles } from '../components/auth/AuthUI';
import { readPermissions, requestPermission } from '../services/permissionsService';
import { markPermissionsReviewed, PERMISSION_KINDS, type PermissionKind, type PermissionSnapshot, type PermissionState } from '../utils/permissionState';

export function PermissionsScreen({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const { colors, isDark } = useAppTheme();
  const { t, language } = useTranslation();
  const [permissions, setPermissions] = useState<PermissionSnapshot | null>(null);
  const [busy, setBusy] = useState<PermissionKind | 'continue' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const locked = useRef(false);
  const active = useRef(true);
  const revision = useRef(0);

  const refresh = useCallback(async () => {
    if (locked.current) return;
    const request = ++revision.current;
    const snapshot = await readPermissions();
    if (active.current && request === revision.current && !locked.current) setPermissions(snapshot);
  }, []);

  useEffect(() => {
    active.current = true;
    void refresh();
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    const back = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => { active.current = false; revision.current += 1; foreground.remove(); back.remove(); };
  }, [refresh]);

  const ask = async (kind: PermissionKind) => {
    if (locked.current || !permissions) return;
    locked.current = true; revision.current += 1; setBusy(kind); setError(null);
    try {
      const previous = permissions[kind];
      if (!previous.canAskAgain && previous.status !== 'granted') {
        await Linking.openSettings();
      } else {
        const result = await requestPermission(kind, language);
        if (result.status === 'granted') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        // Android anterior a 12 comparte ubicación con el escaneo Bluetooth.
        const snapshot = await readPermissions();
        if (active.current) setPermissions({ ...snapshot, [kind]: result });
      }
    } catch {
      if (active.current) setError(t('No pudimos completar la solicitud. Puedes reintentar o continuar y revisar los permisos después.', 'We could not complete the request. Try again or continue and review permissions later.'));
    } finally {
      locked.current = false;
      if (active.current) setBusy(null);
    }
  };

  const finish = async () => {
    if (locked.current) return;
    if (saveFailed) { onComplete(); return; }
    locked.current = true; setBusy('continue'); setError(null);
    try {
      await markPermissionsReviewed(AsyncStorage, userId);
      if (active.current) onComplete();
    } catch {
      if (active.current) {
        setSaveFailed(true);
        setError(t('No pudimos guardar este paso. Puedes continuar; es posible que lo veas de nuevo al abrir la app.', 'We could not save this step. You can continue; you may see it again when reopening the app.'));
      }
    } finally {
      locked.current = false;
      if (active.current) setBusy(null);
    }
  };

  const legacyAndroid = Platform.OS === 'android' && Number(Platform.Version) < 31;
  const copy: Record<PermissionKind, { title: string; detail: string; requirement: string }> = {
    bluetooth: {
      title: t('Bluetooth', 'Bluetooth'),
      detail: t('Para encontrar tu sonda cercana y recibir sus mediciones. Mantén el Bluetooth encendido cuando la uses.', 'To find your nearby probe and receive its readings. Keep Bluetooth on when using it.'),
      requirement: t('Necesario para usar la sonda', 'Needed to use the probe'),
    },
    location: {
      title: t('Ubicación al usar la app', 'Location while using the app'),
      detail: legacyAndroid
        ? t('Este Android la necesita para buscar la sonda por Bluetooth. También permite ubicar tus mediciones y consultar el pronóstico de tu campo.', 'This Android version needs it to find the probe over Bluetooth. It also locates your readings and provides your field’s forecast.')
        : t('Para asociar coordenadas a tus mediciones y consultar el pronóstico de tu campo. Puedes medir sin coordenadas ni pronóstico.', 'To add coordinates to your readings and get your field’s forecast. You can measure without coordinates or a forecast.'),
      requirement: legacyAndroid ? t('Necesaria para buscar la sonda en este Android', 'Needed to find the probe on this Android') : t('Opcional · Sin seguimiento en segundo plano', 'Optional · No background tracking'),
    },
    camera: {
      title: t('Cámara', 'Camera'),
      detail: t('Para escanear el QR de invitación a un equipo compartido. Si vas a configurar una sonda nueva, puedes permitirla después.', 'To scan an invitation QR for a shared device. If you are setting up a new probe, you can allow it later.'),
      requirement: t('Sólo para escanear QR', 'Only for scanning QR codes'),
    },
    notifications: {
      title: t('Notificaciones', 'Notifications'),
      detail: t('Para recibir avisos sobre tus equipos, solicitudes de acceso y alertas habilitadas. Puedes usar la app sin notificaciones.', 'To receive device updates, access requests and enabled alerts. You can use the app without notifications.'),
      requirement: t('Opcionales', 'Optional'),
    },
  };

  const statusLabel = (permission?: PermissionState) => {
    if (!permission) return t('Revisando…', 'Checking…');
    if (permission.poweredOff) return t('Permitido · Enciende el Bluetooth', 'Allowed · Turn Bluetooth on');
    if (permission.status === 'granted') return t('Permitido', 'Allowed');
    if (permission.status === 'unavailable') return t('No disponible en este dispositivo', 'Unavailable on this device');
    if (permission.status === 'error') return t('No se pudo consultar', 'Could not check');
    if (!permission.canAskAgain) return t('Desactivado · Puedes cambiarlo en Ajustes', 'Disabled · You can change it in Settings');
    if (permission.status === 'denied') return t('No permitido por ahora', 'Not allowed for now');
    return t('Pendiente de autorización', 'Awaiting permission');
  };

  return <AuthLayout>
    <AuthHeading eyebrow={t('PASO 3 · PERMISOS', 'STEP 3 · PERMISSIONS')} title={t('Prepara tu teléfono.', 'Get your phone ready.')}
      description={t('Tú decides qué permitir. Te contamos para qué sirve cada permiso antes de pedírtelo.', 'You choose what to allow. Here is why each permission helps before we ask for it.')} />
    <Animated.View layout={LinearTransition.springify().damping(14).reduceMotion(ReduceMotion.System)} style={{ gap: 16 }}>
      {PERMISSION_KINDS.map((kind, index) => {
        const state = permissions?.[kind];
        const card = copy[kind];
        const isGranted = state?.status === 'granted';
        
        return <Animated.View entering={FadeInDown.delay(index * 100).duration(300).reduceMotion(ReduceMotion.System)} key={kind} style={[styles.card, { backgroundColor: isGranted ? (isDark ? colors.card : colors.background) : colors.card, borderColor: isGranted ? colors.primary : colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text, flex: 1 }]}>{card.title}</Text>
            {isGranted && <Animated.View entering={FadeInDown.duration(180).reduceMotion(ReduceMotion.System)}><Text accessible={false} style={{ color: colors.primary, fontSize: 24 }}>✓</Text></Animated.View>}
          </View>
          <Text style={[authStyles.label, { color: colors.primary }]}>{card.requirement}</Text>
          <Text style={[authStyles.body, { color: colors.textSecondary }]}>{card.detail}</Text>
          <Text accessibilityLiveRegion="polite" style={[authStyles.label, { color: colors.textSecondary }]}>{statusLabel(state)}</Text>
          {!isGranted && state?.status !== 'unavailable' && <AuthButton secondary guideTitle={card.title} guide={card.detail}
            label={state && !state.canAskAgain ? t('Abrir ajustes', 'Open settings') : t('Permitir', 'Allow')}
            busy={busy === kind} disabled={!!busy || !permissions} onPress={() => { void ask(kind); }} />}
        </Animated.View>;
      })}
    </Animated.View>
    {error && <AuthMessage error>{error}</AuthMessage>}
    <Animated.View layout={LinearTransition.springify().damping(14).reduceMotion(ReduceMotion.System)}>
      <AuthButton label={saveFailed ? t('Continuar sin guardar', 'Continue without saving') : t('Continuar', 'Continue')}
        busy={busy === 'continue'} disabled={!!busy || !permissions} onPress={() => { void finish(); }} />
      <Text style={[authStyles.body, { color: colors.textSecondary, marginTop: 16 }]}>
        {t('Continuar no concede permisos. Puedes cambiarlos después en los ajustes del teléfono. Sin Bluetooth, podrás avanzar, pero no medir con la sonda.', 'Continuing does not grant permissions. You can change them later in your phone settings. Without Bluetooth you can continue, but you cannot measure with the probe.')}
      </Text>
    </Animated.View>
  </AuthLayout>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 20, padding: 24, gap: 12 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.5 },
});

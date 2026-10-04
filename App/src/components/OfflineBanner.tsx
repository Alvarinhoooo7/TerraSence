import { flushProbeContacts } from '../services/contactService';
import { syncPendingPreferences } from '../services/preferencesService';
import { flushPendingPushRevocation, getPushRegistrationStatus, registerPushToken } from '../services/notifications';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { useAppTheme } from '../hooks/useAppTheme';
import { Typography } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../hooks/useTranslation';
import { flushQueue, pendingCount } from '../services/measurementsService';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';

export const OfflineBanner = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const accountId = useAuthStore(s => s.session?.user.id);
  const wasOffline = useRef(false);

  useEffect(() => {
    let active = true;
    let checking = false;
    const check = async () => {
      if (checking || AppState.currentState !== 'active') return;
      checking = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        if (accountId) {
          const count = await pendingCount();
          if (active) useAppStore.getState().setPendingCount(count);
        }
        const response = await fetch('https://www.google.com/generate_204', { signal: controller.signal });
        if (active) { setIsConnected(response.ok); if (!response.ok) wasOffline.current = true; }
        // Una revocación que quedó pendiente al cerrar sesión sin red se confirma al volver la red.
        if (response.ok) void flushPendingPushRevocation().catch(() => undefined);
        if (response.ok && accountId && active) {
          // Recupera el registro push al volver la red o tras un fallo anterior, sin pedir permisos.
          if (wasOffline.current || getPushRegistrationStatus() === 'error') { wasOffline.current = false; void registerPushToken().catch(() => { wasOffline.current = true; }); }
          try {
            useAppStore.getState().setSyncing(true);
            await syncPendingPreferences().catch(() => undefined);
            await flushProbeContacts().catch(() => undefined);
            const result = await flushQueue();
            if (active) {
              useAppStore.getState().setPendingCount(result.remaining);
              if (result.sent > 0) useAppStore.getState().invalidateData();
            }
          } catch { /* Sin sesión o servidor no disponible: conservar la cola. */ }
          finally { if (active) useAppStore.getState().setSyncing(false); }
        }
      } catch {
        if (active) { setIsConnected(false); wasOffline.current = true; }
      } finally { clearTimeout(timeout); checking = false; }
    };
    void check();
    const timer = setInterval(() => void check(), 20_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      active = false;
      useAppStore.getState().setSyncing(false);
      clearInterval(timer);
      subscription.remove();
    };
  }, [accountId]);

  if (isConnected !== false) {
    return null; // Don't show if connected or unknown
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.warning, paddingTop: Math.max(insets.top, 10) }]}>
      <Text style={[styles.text, { color: colors.background }]}>
        {t('Trabajando sin conexión', 'Working offline')} - {t('Guardando en modo local', 'Saving locally')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999, // Ensure it sits on top of everything
  },
  text: {
    ...Typography.caption,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

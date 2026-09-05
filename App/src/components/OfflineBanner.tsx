import React, { useEffect, useState } from 'react';
import { AppState, View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { Typography } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../hooks/useTranslation';
import { flushQueue, pendingCount } from '../services/measurementsService';
import { useAppStore } from '../store/useAppStore';

export const OfflineBanner = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  useEffect(() => {
    let active = true;
    let checking = false;
    const check = async () => {
      if (checking || AppState.currentState !== 'active') return;
      checking = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch('https://www.google.com/generate_204', { signal: controller.signal });
        if (active) setIsConnected(response.ok);
        if (response.ok) {
          try {
            await flushQueue();
            if (active) useAppStore.getState().setPendingCount(await pendingCount());
          } catch { /* Sin sesión o servidor no disponible: conservar la cola. */ }
        }
      } catch {
        if (active) setIsConnected(false);
      } finally { clearTimeout(timeout); checking = false; }
    };
    void check();
    const timer = setInterval(() => void check(), 20_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

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

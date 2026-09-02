import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAppTheme } from '../hooks/useAppTheme';
import { Typography } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../hooks/useTranslation';

export const OfflineBanner = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Consider connected if both isConnected and isInternetReachable are true
      // or if isInternetReachable is null (sometimes happens on first load)
      const connected = state.isConnected && (state.isInternetReachable ?? true);
      setIsConnected(connected);
    });

    return () => unsubscribe();
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
    ...Typography.bodySmall,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './src/services/supabase';
import { registerPushToken } from './src/services/notifications';
import { AuthScreen } from './src/screens/AuthScreen';
import { MapScreen } from './src/screens/MapScreen';
import { MeasureScreen } from './src/screens/MeasureScreen';
import { FieldSettingsScreen } from './src/screens/FieldSettingsScreen';
import { DevicesScreen } from './src/screens/DevicesScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { PerimeterScreen } from './src/screens/PerimeterScreen';
import { Typography } from './src/constants/theme';
import { getOnboardingState } from './src/services/onboardingService';
import { loadPreferences } from './src/services/preferencesService';
import { useAppStore } from './src/store/useAppStore';
import { useAppTheme } from './src/hooks/useAppTheme';
import { useTranslation } from './src/hooks/useTranslation';
import { DEFAULT_APP_PREFERENCES } from './src/types/preferences';
import type { MapMeasurementPoint } from './src/types/app';
import { MeasurementDetailModal } from './src/components/MeasurementDetailModal';

type Route = 'map' | 'measure' | 'settings' | 'devices' | 'history' | 'perimeter';

export default function App() {
  const { isDark, colors } = useAppTheme();
  const { t } = useTranslation();

  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingRetry, setOnboardingRetry] = useState(0);
  const [route, setRoute] = useState<Route>('map');
  const [detailPoint, setDetailPoint] = useState<MapMeasurementPoint | null>(null);
  const setDevice = useAppStore((state) => state.setDevice);
  const setPreferences = useAppStore((state) => state.setPreferences);
  const setPreferencesLoaded = useAppStore((state) => state.setPreferencesLoaded);
  const preferences = useAppStore((state) => state.preferences);
  const preferencesLoaded = useAppStore((state) => state.preferencesLoaded);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;

    if (!session) {
      setCheckingOnboarding(false);
      setOnboardingComplete(false);
      setOnboardingError(null);
      setDevice(null);
      setPreferences(DEFAULT_APP_PREFERENCES);
      setPreferencesLoaded(false);
      return () => {
        active = false;
      };
    }

    setCheckingOnboarding(true);
    setOnboardingError(null);
    Promise.all([getOnboardingState(), loadPreferences()])
      .then(([state, preferences]) => {
        if (!active) return;
        setPreferences(preferences);
        setPreferencesLoaded(true);
        if (state.devices[0]) setDevice(state.devices[0]);
        setOnboardingComplete(state.completed);
      })
      .catch((error) => {
        if (!active) return;
        // Sólo llega aquí si el servidor falló y tampoco existe un estado
        // completo previamente verificado en la caché de esta cuenta.
        setOnboardingComplete(false);
        setOnboardingError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (active) setCheckingOnboarding(false);
      });

    return () => {
      active = false;
    };
  }, [
    onboardingRetry,
    session?.user.id,
    setDevice,
    setPreferences,
    setPreferencesLoaded,
  ]);

  // El token se registra tras iniciar sesión, no al arrancar: antes no hay
  // perfil donde guardarlo y la petición de permiso llegaría sin contexto.
  useEffect(() => {
    if (session && onboardingComplete && preferencesLoaded) void registerPushToken(preferences);
  }, [session, onboardingComplete, preferences, preferencesLoaded]);

  const handleOpenDetail = useCallback((p: MapMeasurementPoint) => {
    setDetailPoint(p);
  }, []);

  let content: React.ReactNode;

  if (checking || (session && checkingOnboarding)) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else if (!session) {
    content = <AuthScreen onAuthenticated={() => setRoute('map')} />;
  } else if (onboardingError) {
    content = (
      <View
        style={{
          flex: 1,
          padding: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ fontSize: 42, marginBottom: 16 }}>↻</Text>
        <Text style={{ ...Typography.titleLarge, color: colors.text, textAlign: 'center' }}>
          {t('No pudimos revisar tu cuenta', 'We could not check your account')}
        </Text>
        <Text
          style={{
            ...Typography.bodyRegular,
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: 10,
            marginBottom: 22,
          }}
        >
          {t('Comprueba tu conexión antes de continuar. Tus equipos y tu progreso siguen guardados.', 'Check your connection before continuing. Your devices and progress remain saved.')}
        </Text>
        <TouchableOpacity
          onPress={() => setOnboardingRetry((value) => value + 1)}
          style={{
            minHeight: 54,
            minWidth: 180,
            paddingHorizontal: 24,
            borderRadius: 16,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...Typography.button, color: '#FFFFFF' }}>{t('Reintentar', 'Try again')}</Text>
        </TouchableOpacity>
        {__DEV__ && (
          <Text style={{ ...Typography.caption, color: colors.textMuted, marginTop: 18 }}>
            {onboardingError}
          </Text>
        )}
      </View>
    );
  } else if (!onboardingComplete) {
    content = (
      <OnboardingScreen
        onComplete={(device) => {
          setDevice(device);
          setOnboardingComplete(true);
          setRoute('map');
        }}
      />
    );
  } else if (route === 'settings') {
    content = <FieldSettingsScreen onClose={() => setRoute('map')} onOpenDevices={() => setRoute('devices')} />;
  } else if (route === 'history') {
    content = (
      <HistoryScreen onClose={() => setRoute('map')} onOpenDetail={handleOpenDetail} />
    );
  } else if (route === 'perimeter') {
    content = <PerimeterScreen onClose={() => setRoute('map')} />;
  } else if (route === 'devices') {
    content = <DevicesScreen onClose={() => setRoute('map')} />;
  } else if (route === 'measure') {
    content = (
      <MeasureScreen onDone={() => setRoute('map')} onCancel={() => setRoute('map')} />
    );
  } else {
    content = (
      <MapScreen
        onOpenPerimeter={() => setRoute('perimeter')}
        onStartMeasurement={() => setRoute('measure')}
        onOpenSettings={() => setRoute('settings')}
        onOpenList={() => setRoute('history')}
        onOpenDetail={handleOpenDetail}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {content}
        <MeasurementDetailModal point={detailPoint} onClose={() => setDetailPoint(null)} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

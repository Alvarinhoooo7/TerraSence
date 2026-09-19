import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { useAuthStore } from './src/store/useAuthStore';
import { OfflineBanner } from './src/components/OfflineBanner';
import { supabase } from './src/services/supabase';
import { registerPushToken } from './src/services/notifications';
import { AuthScreen } from './src/screens/AuthScreen';
import { MapScreen } from './src/screens/MapScreen';
import { MeasureScreen } from './src/screens/MeasureScreen';
import { FieldSettingsScreen } from './src/screens/FieldSettingsScreen';
import { AdministrationScreen } from './src/screens/AdministrationScreen';
import { WaitingApprovalScreen } from './src/screens/WaitingApprovalScreen';
import { DevicesScreen } from './src/screens/DevicesScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { PerimeterScreen } from './src/screens/PerimeterScreen';
import { Typography } from './src/constants/theme';
import { getOnboardingState } from './src/services/onboardingService';
import { clearDevSkip, isDevSkipEnabled } from './src/utils/devSkipOnboarding';
import { loadPreferences } from './src/services/preferencesService';
import { useAppStore } from './src/store/useAppStore';
import { useAppTheme } from './src/hooks/useAppTheme';
import { useTranslation } from './src/hooks/useTranslation';
import { DEFAULT_APP_PREFERENCES } from './src/types/preferences';
import type { MapMeasurementPoint } from './src/types/app';
import { MeasurementDetailModal } from './src/components/MeasurementDetailModal';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { createRecoverySession } from './src/services/authDeepLink';
import { WelcomeCarouselScreen } from './src/screens/WelcomeCarouselScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BottomNavigation } from './src/components/BottomNavigation';

type Route = 'dashboard' | 'map' | 'measure' | 'settings' | 'devices' | 'history' | 'perimeter' | 'administration';
const WELCOME_KEY = '@terrasense/welcome-complete-v1';

export default function App() {
  const { isDark, colors } = useAppTheme();
  const { t } = useTranslation();

  const { session, setSession, isHydrated, recoveryUserId, setRecoveryUserId } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [checkingWelcome, setCheckingWelcome] = useState(true);
  const [welcomeComplete, setWelcomeComplete] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const recoveryActive = recovering || (!!session && session.user.id === recoveryUserId);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [awaitingDeviceApproval, setAwaitingDeviceApproval] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingRetry, setOnboardingRetry] = useState(0);
  const [route, setRoute] = useState<Route>('dashboard');
  const [notificationDeviceId, setNotificationDeviceId] = useState<string | null>(null);
  const [openAdminNotification, setOpenAdminNotification] = useState(false);
  useEffect(() => {
    const openRequest = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data;
      if (data?.event_type === 'access_request') {
        setNotificationDeviceId(typeof data.device_id === 'string' ? data.device_id : null);
        setOpenAdminNotification(true);
        void Notifications.clearLastNotificationResponseAsync();
      }
    };
    void Notifications.getLastNotificationResponseAsync().then(openRequest).catch(() => undefined);
    const listener = Notifications.addNotificationResponseReceivedListener(openRequest);
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (session && onboardingComplete && openAdminNotification) {
      setRoute('administration');
      setOpenAdminNotification(false);
    }
  }, [session, onboardingComplete, openAdminNotification]);
  const [detailPoint, setDetailPoint] = useState<MapMeasurementPoint | null>(null);
  const setDevice = useAppStore((state) => state.setDevice);
  const setPreferences = useAppStore((state) => state.setPreferences);
  const setPreferencesLoaded = useAppStore((state) => state.setPreferencesLoaded);
  const preferences = useAppStore((state) => state.preferences);
  const preferencesLoaded = useAppStore((state) => state.preferencesLoaded);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detailPoint) { setDetailPoint(null); return true; }
      if (route === 'measure') return false;
      if (route !== 'dashboard') { setRoute(route === 'perimeter' ? 'map' : 'dashboard'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [route, detailPoint]);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_KEY)
      .then((value) => setWelcomeComplete(value === 'true'))
      .finally(() => setCheckingWelcome(false));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      // `getSession` sólo lee el token guardado en el dispositivo: no pregunta al
      // servidor. Si la cuenta se borró en Supabase, el JWT sigue firmado y válido
      // hasta que caduque, así que la app arrancaba con una sesión fantasma: las
      // consultas corrían con un `uid` inexistente, devolvían cero equipos y el
      // onboarding no se pasaba nunca. `getUser` sí contrasta contra el servidor.
      if (data.session) {
        const { error } = await supabase.auth.getUser();
        // Sólo se cierra sesión cuando el servidor responde que la cuenta ya no
        // vale. Un fallo de red no debe expulsar a nadie en terreno.
        const cuentaInvalida = !!error && !/network|fetch|timeout/i.test(error.message);
        if (cuentaInvalida) {
          await clearDevSkip();
          await supabase.auth.signOut().catch(() => undefined);
          setSession(null);
          setChecking(false);
          return;
        }
      }
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryUserId(s?.user.id ?? null);
        setRecovering(true);
      } else if (event === 'SIGNED_OUT') {
        setRecoveryUserId(null);
      }
      setSession(s);
    });

    const handleUrl = (url: string) => {
      void createRecoverySession(url)
        .then((isRecovery) => {
          if (isRecovery) setRecovering(true);
        })
        .catch((error) => console.warn('[TerraSense] Enlace de recuperación inválido:', error));
    };
    void Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const linkSubscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => {
      sub.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!session) {
      setCheckingOnboarding(false);
      setOnboardingComplete(false);
      setAwaitingDeviceApproval(false);
      setOnboardingError(null);
      setDevice(null);
      useAppStore.getState().setPoints([]);
      useAppStore.getState().setPendingCount(0);
      setDetailPoint(null);
      setRoute('dashboard');
      setPreferences(DEFAULT_APP_PREFERENCES);
      setPreferencesLoaded(false);
      return () => {
        active = false;
      };
    }

    setCheckingOnboarding(true);
    setOnboardingError(null);
    Promise.all([getOnboardingState(), loadPreferences(), isDevSkipEnabled()])
      .then(([state, preferences, devSkip]) => {
        if (!active) return;
        setPreferences(preferences);
        setPreferencesLoaded(true);
        if (state.devices[0]) setDevice(state.devices[0]);
        setOnboardingComplete(state.completed || devSkip);
        setAwaitingDeviceApproval(state.hasPendingRequests ?? false);
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

  let content;

  if (checkingWelcome || checking || !isHydrated) {
    content = (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else if (!welcomeComplete) {
    content = (
      <WelcomeCarouselScreen
        onComplete={() => {
          setWelcomeComplete(true);
          void AsyncStorage.setItem(WELCOME_KEY, 'true');
        }}
      />
    );
  } else if (recoveryActive) {
    content = <ResetPasswordScreen onDone={() => { setRecoveryUserId(null); setRecovering(false); }} />;
  } else if (!session) {
    content = <AuthScreen onAuthenticated={() => setRoute('dashboard')} />;
  } else if (checkingOnboarding) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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
  } else if (awaitingDeviceApproval) {
    content = <WaitingApprovalScreen onApproved={device => {
      setDevice(device); setOnboardingComplete(true); setAwaitingDeviceApproval(false); setRoute('dashboard');
    }} onDismiss={() => { setAwaitingDeviceApproval(false); setOnboardingRetry(value => value + 1); }} />;
  } else if (!onboardingComplete) {
    content = (
      <OnboardingScreen
        onComplete={(device) => {
          setDevice(device);
          setOnboardingComplete(true);
          setRoute('dashboard');
        }}
        onDevSkip={() => {
          // Sin equipo: la app entra en modo demostración, con su cartel.
          setOnboardingComplete(true);
          setRoute('dashboard');
        }}
      />
    );
  } else if (route === 'settings') {
    content = <FieldSettingsScreen onClose={() => setRoute('dashboard')} onOpenDevices={() => setRoute('devices')} onOpenAdministration={() => setRoute('administration')} />;
  } else if (route === 'administration') {
    content = <AdministrationScreen initialDeviceId={notificationDeviceId} onClose={() => { setNotificationDeviceId(null); setRoute('settings'); }} />;
  } else if (route === 'history') {
    content = (
      <HistoryScreen onClose={() => setRoute('dashboard')} onOpenDetail={handleOpenDetail} />
    );
  } else if (route === 'perimeter') {
    content = <PerimeterScreen onClose={() => setRoute('map')} />;
  } else if (route === 'devices') {
    content = <DevicesScreen onClose={() => setRoute('dashboard')} />;
  } else if (route === 'measure') {
    content = (
      <MeasureScreen onDone={() => setRoute('dashboard')} onCancel={() => setRoute('dashboard')} />
    );
  } else if (route === 'map') {
    content = (
      <MapScreen
        onOpenPerimeter={() => setRoute('perimeter')}
        onStartMeasurement={() => setRoute('measure')}
        onOpenList={() => setRoute('history')}
        onOpenDetail={handleOpenDetail}
        onClose={() => setRoute('dashboard')}
      />
    );
  } else {
    content = (
      <DashboardScreen
        onStartMeasurement={() => setRoute('measure')}
        onOpenMap={() => setRoute('map')}
        onOpenHistory={() => setRoute('history')}
        onOpenSettings={() => setRoute('settings')}
        onOpenDevices={() => setRoute('devices')}
        onOpenDetail={handleOpenDetail}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OfflineBanner />
        {content}
        {session && onboardingComplete && !awaitingDeviceApproval && !checkingOnboarding && !onboardingError && !recoveryActive && welcomeComplete && !checking && ['dashboard', 'history', 'map', 'settings'].includes(route) && (
          <BottomNavigation route={route} onNavigate={setRoute} />
        )}
        <MeasurementDetailModal point={detailPoint} onClose={() => setDetailPoint(null)} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

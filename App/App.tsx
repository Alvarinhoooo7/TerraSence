import { ScreenGuide } from './src/components/ScreenGuide';
import React, { useCallback, useEffect, useState } from 'react';
import {
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
import { LoadingScreen } from './src/components/LoadingScreen';
import { supabase } from './src/services/supabase';
import { registerPushToken } from './src/services/notifications';
import { AuthScreen } from './src/screens/AuthScreen';
import { MeasureScreen } from './src/screens/MeasureScreen';
import { FieldSettingsScreen } from './src/screens/FieldSettingsScreen';
import { AdministrationScreen } from './src/screens/AdministrationScreen';
import { WaitingApprovalScreen } from './src/screens/WaitingApprovalScreen';
import { DevicesScreen } from './src/screens/DevicesScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { Typography } from './src/constants/theme';
import { getOnboardingState } from './src/services/onboardingService';
import { clearDevSkip, isDevSkipEnabled } from './src/utils/devSkipOnboarding';
import { loadPreferences } from './src/services/preferencesService';
import { useAppStore } from './src/store/useAppStore';
import { useAppTheme } from './src/hooks/useAppTheme';
import { useTranslation } from './src/hooks/useTranslation';
import { DEFAULT_APP_PREFERENCES } from './src/types/preferences';
import type { MeasurementPoint } from './src/types/app';
import { MeasurementDetailModal } from './src/components/MeasurementDetailModal';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { createRecoverySession } from './src/services/authDeepLink';
import { parseRecoveryTokens } from './src/services/authDeepLinkParser';
import { isInvalidSessionError } from './src/utils/authValidation';
import { resolveEntryRoute } from './src/utils/authFlow';
import { AuthLayout, AuthHeading, AuthButton } from './src/components/auth/AuthUI';
import { WelcomeCarouselScreen } from './src/screens/WelcomeCarouselScreen';
import { PermissionsScreen } from './src/screens/PermissionsScreen';
import { hasReviewedPermissions } from './src/utils/permissionState';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BottomNavigation } from './src/components/BottomNavigation';

type Route = 'dashboard' | 'measure' | 'settings' | 'devices' | 'history' | 'administration';
const WELCOME_KEY = '@terrasense/welcome-complete-v1';

export default function App() {
  const { isDark, colors } = useAppTheme();
  const { t } = useTranslation();

  const { session, setSession, isHydrated, recoveryUserId, setRecoveryUserId } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [checkingWelcome, setCheckingWelcome] = useState(true);
  const [welcomeComplete, setWelcomeComplete] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [checkingRecoveryLink, setCheckingRecoveryLink] = useState(true);
  const [recoveryLinkError, setRecoveryLinkError] = useState(false);
  const recoveryActive = recoveryLoading || (!session && recovering) || (!!session && session.user.id === recoveryUserId);
  const [permissionsReview, setPermissionsReview] = useState<{ userId: string; reviewed: boolean } | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingUserId, setOnboardingUserId] = useState<string | null>(null);
  const [awaitingDeviceApproval, setAwaitingDeviceApproval] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingRetry, setOnboardingRetry] = useState(0);
  const [route, setRoute] = useState<Route>('dashboard');
  const [devicesOrigin, setDevicesOrigin] = useState<'dashboard' | 'settings'>('dashboard');
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
  const dataRevision = useAppStore(s => s.dataRevision);
  useEffect(() => { setDetailPoint(null); }, [dataRevision]);
  const [detailPoint, setDetailPoint] = useState<MeasurementPoint | null>(null);
  const setDevice = useAppStore((state) => state.setDevice);
  const setPreferences = useAppStore((state) => state.setPreferences);
  const setPreferencesLoaded = useAppStore((state) => state.setPreferencesLoaded);
  const preferences = useAppStore((state) => state.preferences);
  const preferencesLoaded = useAppStore((state) => state.preferencesLoaded);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detailPoint) { setDetailPoint(null); return true; }
      if (route === 'measure') return false;
      if (route !== 'dashboard') { setRoute(route === 'devices' ? devicesOrigin : route === 'administration' ? 'settings' : 'dashboard'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [route, detailPoint, devicesOrigin]);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_KEY)
      .then((value) => setWelcomeComplete(value === 'true'))
      .catch(() => setWelcomeComplete(false))
      .finally(() => setCheckingWelcome(false));
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    let active = true;
    let authRevision = 0;
    let linkInFlight = false;
    const initialRevision = authRevision;
    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (sessionError) throw sessionError;
      // `getSession` sólo lee el token guardado en el dispositivo: no pregunta al
      // servidor. Si la cuenta se borró en Supabase, el JWT sigue firmado y válido
      // hasta que caduque, así que la app arrancaba con una sesión fantasma: las
      // consultas corrían con un `uid` inexistente, devolvían cero equipos y el
      // onboarding no se pasaba nunca. `getUser` sí contrasta contra el servidor.
      if (data.session) {
        const { error } = await supabase.auth.getUser();
        // Sólo se cierra sesión cuando el servidor responde que la cuenta ya no
        // vale. Un fallo de red no debe expulsar a nadie en terreno.
        if (!active || authRevision !== initialRevision) return;
        const cuentaInvalida = isInvalidSessionError(error);
        if (cuentaInvalida) {
          await clearDevSkip().catch(() => undefined);
          if (!active || authRevision !== initialRevision) return;
          await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
          if (active && authRevision === initialRevision) setSession(null);
          return;
        }
      }
      if (active && authRevision === initialRevision) setSession(data.session);
    }).catch((error) => {
      if (active && authRevision === initialRevision && isInvalidSessionError(error)) setSession(null);
    }).finally(() => { if (active) setChecking(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return;
      // INITIAL_SESSION es la misma lectura local; no invalida getUser pendiente.
      if (event === 'INITIAL_SESSION') return;
      authRevision += 1;
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryUserId(s?.user.id ?? null);
        setRecovering(true);
      } else if (event === 'SIGNED_OUT') {
        // Conserva la confirmación de cambio incluso tras restaurar una recuperación.
        if (useAuthStore.getState().recoveryUserId) setRecovering(true);
        setRecoveryUserId(null);
      } else if (event === 'SIGNED_IN' && !linkInFlight && s?.user.id !== useAuthStore.getState().recoveryUserId) {
        setRecovering(false);
        setRecoveryUserId(null);
      }
      setSession(s);
    });

    const handleUrl = (url: string) => {
      if (!active || linkInFlight || !parseRecoveryTokens(url)) return;
      linkInFlight = true;
      // Bloquea navegación antes de que setSession emita SIGNED_IN.
      setRecovering(true);
      setRecoveryLoading(true);
      setRecoveryLinkError(false);
      void createRecoverySession(url)
        .then((isRecovery) => {
          if (active && isRecovery) setRecovering(true);
        })
        .catch(() => { if (active) { setRecovering(false); setRecoveryLinkError(true); } })
        .finally(() => { linkInFlight = false; if (active) setRecoveryLoading(false); });
    };
    void Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    }).catch(() => undefined).finally(() => { if (active) setCheckingRecoveryLink(false); });
    const linkSubscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [isHydrated]);

  useEffect(() => {
    let active = true;
    const userId = session?.user.id;
    if (!userId) { setPermissionsReview(null); return; }
    if (checking || checkingRecoveryLink || !isHydrated || recoveryActive) return;
    setPermissionsReview(null);
    void hasReviewedPermissions(AsyncStorage, userId)
      .then(reviewed => { if (active) setPermissionsReview({ userId, reviewed }); })
      .catch(() => { if (active) setPermissionsReview({ userId, reviewed: false }); });
    return () => { active = false; };
  }, [session?.user.id, checking, checkingRecoveryLink, isHydrated, recoveryActive]);

  useEffect(() => {
    let active = true;

    if (recoveryActive || checking || checkingRecoveryLink || !isHydrated) return;

    if (!session) {
      setCheckingOnboarding(false);
      setOnboardingUserId(null);
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
    setOnboardingComplete(false);
    setAwaitingDeviceApproval(false);
    setOnboardingError(null);
    isDevSkipEnabled(session.user.id).then(devSkip => Promise.all([
      getOnboardingState().catch(error => {
        if (!devSkip) throw error;
        return { completed: false, hasPendingRequests: false, devices: [] };
      }),
      loadPreferences(),
      devSkip,
    ] as const))
      .then(([state, preferences, devSkip]) => {
        if (!active) return;
        setPreferences(preferences);
        setPreferencesLoaded(true);
        setDevice(state.devices[0] ?? null);
        setOnboardingComplete(state.completed || devSkip);
        setAwaitingDeviceApproval(!state.completed && (state.hasPendingRequests ?? false));
      })
      .catch((error) => {
        if (!active) return;
        // Sólo llega aquí si el servidor falló y tampoco existe un estado
        // completo previamente verificado en la caché de esta cuenta.
        setOnboardingComplete(false);
        setOnboardingError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (active) { setOnboardingUserId(session.user.id); setCheckingOnboarding(false); }
      });

    return () => {
      active = false;
    };
  }, [
    recoveryActive,
    checking,
    checkingRecoveryLink,
    isHydrated,
    onboardingRetry,
    session?.user.id,
    setDevice,
    setPreferences,
    setPreferencesLoaded,
  ]);

  // Sólo registra autorizaciones existentes, después de revisar la explicación.
  // Incluye cuentas esperando aprobación; nunca vuelve a solicitar al omitir permisos.
  useEffect(() => {
    if (session && permissionsReview?.userId === session.user.id && permissionsReview.reviewed &&
        onboardingUserId === session.user.id && preferencesLoaded && !recoveryActive) {
      void registerPushToken(preferences, { requestPermission: false });
    }
  }, [session, permissionsReview, onboardingUserId, preferences, preferencesLoaded, recoveryActive]);

  const handleOpenDetail = useCallback((p: MeasurementPoint) => {
    setDetailPoint(p);
  }, []);

  let content;
  const entry = resolveEntryRoute({
    loading: checkingWelcome || checking || !isHydrated || recoveryLoading || checkingRecoveryLink,
    recovery: recoveryActive, welcomeComplete, userId: session?.user.id ?? null,
    permissionsUserId: permissionsReview?.userId ?? null,
    permissionsReviewed: permissionsReview?.reviewed ?? false,
    onboardingUserId, checkingOnboarding, onboardingError: !!onboardingError,
    onboardingComplete, awaitingApproval: awaitingDeviceApproval,
  });

  if (entry === 'loading') {
    content = <LoadingScreen />;
  } else if (recoveryLinkError) {
    content = <AuthLayout>
      <AuthHeading eyebrow={t('RECUPERACIÓN DE CUENTA', 'ACCOUNT RECOVERY')}
        title={t('El enlace no está disponible.', 'This link is unavailable.')}
        description={t('Puede haber vencido o faltar conexión. Revisa tu internet y abre el correo de nuevo, o solicita otro código desde «Olvidé mi contraseña».', 'It may have expired or you may be offline. Check your connection and open the email again, or request a new code from “Forgot my password”.')} />
      <AuthButton label={t('Continuar', 'Continue')} onPress={() => setRecoveryLinkError(false)} />
    </AuthLayout>;
  } else if (entry === 'recovery') {
    content = <ResetPasswordScreen onDone={() => { setRecoveryUserId(null); setRecovering(false); }} />;
  } else if (entry === 'welcome') {
    content = (
      <WelcomeCarouselScreen
        onComplete={() => {
          setWelcomeComplete(true);
          void AsyncStorage.setItem(WELCOME_KEY, 'true').catch(() => undefined);
        }}
      />
    );
  } else if (entry === 'auth') {
    content = <AuthScreen onAuthenticated={() => setRoute('dashboard')} />;
  } else if (entry === 'permissions' && session) {
    const userId = session.user.id;
    content = <PermissionsScreen key={userId} userId={userId} onComplete={() => {
      if (useAuthStore.getState().session?.user.id === userId) setPermissionsReview({ userId, reviewed: true });
    }} />;
  } else if (entry === 'onboarding-error') {
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
  } else if (entry === 'approval') {
    content = <WaitingApprovalScreen onApproved={device => {
      setDevice(device); setOnboardingComplete(true); setAwaitingDeviceApproval(false); setRoute('dashboard');
    }} onDismiss={() => { setAwaitingDeviceApproval(false); setOnboardingRetry(value => value + 1); }} />;
  } else if (entry === 'onboarding') {
    content = (
      <OnboardingScreen
        onComplete={(device) => {
          setDevice(device);
          setOnboardingComplete(true);
          setRoute('dashboard');
        }}
        onDevSkip={() => {
          if (!__DEV__) return;
          setDevice(null);
          setOnboardingComplete(true);
          setRoute('dashboard');
        }}
      />
    );
  } else if (route === 'settings') {
    content = <FieldSettingsScreen onClose={() => setRoute('dashboard')} onOpenDevices={() => { setDevicesOrigin('settings'); setRoute('devices'); }} onOpenAdministration={() => setRoute('administration')} />;
  } else if (route === 'administration') {
    content = <AdministrationScreen initialDeviceId={notificationDeviceId} onClose={() => { setNotificationDeviceId(null); setRoute('settings'); }} />;
  } else if (route === 'history') {
    content = (
      <HistoryScreen onClose={() => setRoute('dashboard')} onOpenDetail={handleOpenDetail} />
    );
  } else if (route === 'devices') {
    content = <DevicesScreen onClose={() => setRoute(devicesOrigin)} />;
  } else if (route === 'measure') {
    content = (
      <MeasureScreen onDone={() => setRoute('dashboard')} onCancel={() => setRoute('dashboard')} />
    );
  } else {
    content = (
      <DashboardScreen
        onStartMeasurement={() => setRoute('measure')}
        onOpenHistory={() => setRoute('history')}
        onOpenDevices={() => { setDevicesOrigin('dashboard'); setRoute('devices'); }}
        onOpenDetail={handleOpenDetail}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={entry === 'loading' || isDark ? 'light' : 'dark'} />
        <OfflineBanner />
        <ScreenGuide enabled={!recoveryLinkError && ['app', 'permissions', 'onboarding', 'approval'].includes(entry)} scope={`${entry}:${route}`}>
        {content}
        {entry === 'app' && !recoveryLinkError && ['dashboard', 'history', 'settings'].includes(route) && (
          <BottomNavigation route={route} onNavigate={setRoute} />
        )}
        </ScreenGuide>
        <MeasurementDetailModal point={detailPoint} onClose={() => setDetailPoint(null)} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

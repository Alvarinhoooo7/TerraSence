import { ScreenGuide } from './src/components/ScreenGuide';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Appearance,
  BackHandler,
  Linking,
  Modal,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from './src/components/AppText';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';

import { useAuthStore } from './src/store/useAuthStore';
import { OfflineBanner } from './src/components/OfflineBanner';
import { LoadingScreen } from './src/components/LoadingScreen';
import { supabase } from './src/services/supabase';
import { registerPushToken, resumePushRegistration, revokePushInstallationForSignOut, setPushRegistrationUser } from './src/services/notifications';
import { listMyDevices, listMyDeviceMemberships } from './src/services/deviceService';
import { InboxShortcut, NotificationInboxScreen } from './src/screens/NotificationInboxScreen';
import { getMyNotification, type DeviceNotification } from './src/services/notificationInbox';
import { NotificationUnavailableError, notificationDestination, parseNotificationPayload, resolvePendingAlert } from './src/utils/notificationRoute';
import { AuthScreen } from './src/screens/AuthScreen';
import { TermsScreen } from './src/screens/TermsScreen';
import { MeasureScreen } from './src/screens/MeasureScreen';
import { FieldSettingsScreen } from './src/screens/FieldSettingsScreen';
import type { SettingsPageId } from './src/utils/settingsNavigation';
import { AdministrationScreen } from './src/screens/AdministrationScreen';
import { WaitingApprovalScreen } from './src/screens/WaitingApprovalScreen';
import { DevicesScreen } from './src/screens/DevicesScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { Typography } from './src/constants/theme';
import { getOnboardingState } from './src/services/onboardingService';
import { clearDevSkip, isDevSkipEnabled } from './src/utils/devSkipOnboarding';
import { cachedAccountPreferences, chooseEntryLanguage, loadEntryLanguage, reconcileAccountLanguage } from './src/services/preferencesService';
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
import { bindRegistrationConsent, registrationIdentity, retainConsentForIdentityChange, type RegistrationConsent, type RegistrationConsentDraft } from './src/utils/registrationConsent';
import { EntryLayout, EntryHeading, EntryButton } from './src/components/entry/EntryUI';
import { timedOperation } from './src/utils/timedOperation';
import { WelcomeCarouselScreen } from './src/screens/WelcomeCarouselScreen';
import { LanguageScreen } from './src/screens/LanguageScreen';
import { PermissionsScreen } from './src/screens/PermissionsScreen';
import { hasReviewedPermissions } from './src/utils/permissionState';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BottomNavigation } from './src/components/BottomNavigation';
import { rememberSelectedDevice, restoreSelectedDevice } from './src/services/deviceSelectionService';
import type { AppLanguage } from './src/types/preferences';

type Route = 'dashboard' | 'measure' | 'settings' | 'devices' | 'history' | 'administration' | 'link-device';
const WELCOME_KEY = '@terrasense/welcome-complete-v1';
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const { isDark, colors } = useAppTheme();
  const { t } = useTranslation();
  const themePreference = useAppStore((state) => state.preferences.theme);
  // El tema elegido en la app también manda en lo nativo: la franja de la barra de
  // navegación de Android, los diálogos del sistema y el fondo bajo la vista raíz.
  useEffect(() => {
    Appearance.setColorScheme(themePreference === 'system' ? 'unspecified' : themePreference);
  }, [themePreference]);
  useEffect(() => { void SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined); }, [colors.background]);

  const { session, setSession, isHydrated, recoveryUserId, setRecoveryUserId } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [checkingWelcome, setCheckingWelcome] = useState(true);
  const [welcomeComplete, setWelcomeComplete] = useState(false);
  const [legalPresented, setLegalPresented] = useState(false);
  const [legalFromRegistration, setLegalFromRegistration] = useState(false);
  const registrationDraft = useRef<RegistrationConsentDraft | null>(null);
  const pendingRegistrationIdentity = useRef<string | null>(null);
  const [languageSelected, setLanguageSelected] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const languageSaveInFlight = useRef(false);
  const [languageError, setLanguageError] = useState(false);
  const [preferencesUserId, setPreferencesUserId] = useState<string | null>(null);
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
  const [pendingDeviceIds, setPendingDeviceIds] = useState<string[]>([]);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingRetry, setOnboardingRetry] = useState(0);
  const [route, setRoute] = useState<Route>('dashboard');
  const [measureRun, setMeasureRun] = useState(0);
  const [devicesOrigin, setDevicesOrigin] = useState<'dashboard' | 'settings'>('dashboard');
  const [notificationDeviceId, setNotificationDeviceId] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null);
  const previousSessionId = useRef<string | null>(null);
  useEffect(() => {
    // Sólo recuerda el aviso: la bandeja se abre cuando la cuenta actual comprueba que es suyo.
    const openRequest = (response: Notifications.NotificationResponse | null) => {
      const payload = parseNotificationPayload(response?.notification.request.content.data);
      if (!payload) return;
      setPendingAlertId(payload.alertId);
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    void Notifications.getLastNotificationResponseAsync().then(openRequest).catch(() => undefined);
    const listener = Notifications.addNotificationResponseReceivedListener(openRequest);
    return () => listener.remove();
  }, []);
  useEffect(() => {
    const current = session?.user.id ?? null;
    if (previousSessionId.current && previousSessionId.current !== current) {
      setInboxOpen(false); setPendingAlertId(null); setDetailPoint(null);
      useAppStore.getState().setDevice(null);
      useAppStore.getState().setPoints([]);
      setRoute('dashboard'); setNotificationDeviceId(null);
    }
    if (current) { registrationDraft.current = null; pendingRegistrationIdentity.current = null; setLegalFromRegistration(false); }
    previousSessionId.current = current;
  }, [session?.user.id]);
  // Una push (con la app en primer plano, en segundo plano o cerrada) sólo abre la bandeja si el
  // aviso pertenece a la cuenta con sesión vigente. Una push de otra cuenta se descarta en silencio.
  useEffect(() => {
    const uid = session?.user.id;
    if (!pendingAlertId || !uid || recoveryActive) return;
    let active = true;
    void resolvePendingAlert(() => getMyNotification(pendingAlertId), () => active && useAuthStore.getState().session?.user.id === uid)
      .then(result => {
        if (result === 'discard') setPendingAlertId(null);
        // Con `error` (sin conexión) la bandeja muestra el estado y permite reintentar.
        else if (result === 'open' || result === 'error') setInboxOpen(true);
      });
    return () => { active = false; };
  }, [pendingAlertId, session?.user.id, recoveryActive]);
  const dataRevision = useAppStore(s => s.dataRevision);
  useEffect(() => { setDetailPoint(null); }, [dataRevision]);
  const [detailPoint, setDetailPoint] = useState<MeasurementPoint | null>(null);
  const [settingsReturn, setSettingsReturn] = useState<SettingsPageId | undefined>();
  const setDevice = useAppStore((state) => state.setDevice);
  const setPreferences = useAppStore((state) => state.setPreferences);
  const setPreferencesLoaded = useAppStore((state) => state.setPreferencesLoaded);
  const preferences = useAppStore((state) => state.preferences);
  const preferencesLoaded = useAppStore((state) => state.preferencesLoaded);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detailPoint) { setDetailPoint(null); return true; }
      if (inboxOpen && route !== 'measure') { setInboxOpen(false); setPendingAlertId(null); return true; }
      if (route === 'measure' || route === 'link-device') return false;
      if (route !== 'dashboard') { setRoute(route === 'devices' ? devicesOrigin : route === 'administration' ? 'settings' : 'dashboard'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [route, detailPoint, devicesOrigin, inboxOpen]);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(WELCOME_KEY), loadEntryLanguage()])
      .then(([welcome, entryLanguage]) => {
        setWelcomeComplete(welcome === 'true');
        setLegalPresented(welcome === 'true');
        // La bienvenida ya vista migra sin pedir una selección nueva.
        setLanguageSelected(entryLanguage.selected || welcome === 'true');
        setPreferences({ ...useAppStore.getState().preferences, language: entryLanguage.language });
      })
      .catch(() => { setWelcomeComplete(false); setLegalPresented(false); setLanguageSelected(false); })
      .finally(() => setCheckingWelcome(false));
  }, [setPreferences]);

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
        const { error } = await timedOperation(
          supabase.auth.getUser(data.session.access_token), 4000, () => {}, 'Sin respuesta del servidor',
        ).catch(error => ({ error }));
        // Sólo se cierra sesión cuando el servidor responde que la cuenta ya no
        // vale. Un fallo de red no debe expulsar a nadie en terreno.
        if (!active || authRevision !== initialRevision) return;
        const cuentaInvalida = isInvalidSessionError(error);
        if (cuentaInvalida) {
          await clearDevSkip().catch(() => undefined);
          if (!active || authRevision !== initialRevision) return;
          // Cuenta inválida: la revocación usa el secreto de instalación, no la sesión; si no
          // se confirma, queda pendiente y se reintenta al volver la red o el primer plano.
          await revokePushInstallationForSignOut();
          if (!active || authRevision !== initialRevision) { resumePushRegistration(); return; }
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
    const uid = session?.user.id;
    if (!uid) { setPreferencesUserId(null); return; }
    if (checking || checkingWelcome || checkingRecoveryLink || !isHydrated || recoveryActive) return;
    setPreferencesLoaded(false);
    void cachedAccountPreferences(uid)
      .then(value => { if (active) setPreferences(value ?? { ...DEFAULT_APP_PREFERENCES, language: useAppStore.getState().preferences.language }); })
      .catch(() => undefined)
      .then(() => reconcileAccountLanguage(uid))
      .then(value => { if (active) setPreferences(value); })
      .catch(() => undefined)
      .finally(() => { if (active) { setPreferencesUserId(uid); setPreferencesLoaded(true); } });
    return () => { active = false; };
  }, [session?.user.id, checking, checkingWelcome, checkingRecoveryLink, isHydrated, recoveryActive, setPreferences, setPreferencesLoaded]);

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

    if (recoveryActive || checking || checkingRecoveryLink || checkingWelcome || !isHydrated) return;

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
      // Cerrar sesión conserva el idioma elegido para esta instalación.
      setPreferences({ ...DEFAULT_APP_PREFERENCES, language: useAppStore.getState().preferences.language });
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
        return { completed: false, hasPendingRequests: false, pendingDeviceIds: [], devices: [] };
      }),
      devSkip,
    ] as const))
      .then(async ([state, devSkip]) => {
        const selected = await restoreSelectedDevice(session.user.id, state.devices);
        if (!active) return;
        setDevice(selected);
        setOnboardingComplete(state.completed || devSkip);
        setAwaitingDeviceApproval(!state.completed && (state.hasPendingRequests ?? false));
        setPendingDeviceIds(state.pendingDeviceIds ?? []);
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
    checkingWelcome,
    isHydrated,
    onboardingRetry,
    session?.user.id,
    setDevice,
  ]);

  // Sólo registra autorizaciones existentes, después de revisar la explicación.
  // Incluye cuentas esperando aprobación; nunca vuelve a solicitar al omitir permisos.
  const pushUserId = session?.user.id ?? null;
  useEffect(() => {
    const eligible = !!pushUserId && permissionsReview?.userId === pushUserId && permissionsReview.reviewed &&
      onboardingUserId === pushUserId && preferencesLoaded && !recoveryActive;
    // El servicio respeta esta puerta también en los reintentos por red, primer plano y token.
    setPushRegistrationUser(eligible ? pushUserId : null);
    if (eligible) void registerPushToken(preferences).catch(() => undefined);
  }, [pushUserId, permissionsReview, onboardingUserId, preferences.notifications.device, preferences.language, preferencesLoaded, recoveryActive]);

  const openNotification = async (notification: DeviceNotification) => {
    const uid = session?.user.id;
    if (!uid || useAuthStore.getState().session?.user.id !== uid) return;
    if (notification.event_type === 'access_rejected') return;
    const [devices, memberships] = await Promise.all([listMyDevices(), listMyDeviceMemberships()]);
    if (useAuthStore.getState().session?.user.id !== uid) return;
    const member = memberships.find(row => row.device_id === notification.device_id && row.is_authorized);
    const device = devices.find(row => row.id === notification.device_id);
    const destination = notificationDestination({ event: notification.event_type, active: notification.status === 'active',
      deviceId: notification.device_id, deviceVisible: !!device, authorized: !!member, role: member?.role ?? null, onboardingComplete });
    const close = () => { setInboxOpen(false); setPendingAlertId(null); };
    if (destination === 'administration' && device) { setNotificationDeviceId(device.id); setRoute('administration'); close(); return; }
    if (destination === 'onboarding') { setOnboardingRetry(value => value + 1); close(); return; }
    if (destination === 'devices' && device) { setNotificationDeviceId(device.id); setDevicesOrigin('dashboard'); setRoute('devices'); close(); return; }
    if (destination === 'stay') return;
    throw new NotificationUnavailableError();
  };

  const handleOpenDetail = useCallback((p: MeasurementPoint) => {
    setDetailPoint(p);
  }, []);

  const applyEntryLanguage = async (language: AppLanguage) => {
    if (languageSaveInFlight.current) return;
    languageSaveInFlight.current = true;
    setLanguageError(false);
    setSavingLanguage(true);
    try {
      await chooseEntryLanguage(language);
      if (language !== useAppStore.getState().preferences.language) {
        registrationDraft.current = null;
        pendingRegistrationIdentity.current = null;
        if (!welcomeComplete) setLegalPresented(false);
        setLegalFromRegistration(false);
      }
      setPreferences({ ...useAppStore.getState().preferences, language });
      setLanguageSelected(true);
    } catch { setLanguageError(true); }
    finally { languageSaveInFlight.current = false; setSavingLanguage(false); }
  };

  const bindConsent = (name: string, email: string) => {
    registrationDraft.current = bindRegistrationConsent(registrationDraft.current, name, email);
    return registrationDraft.current?.consent ?? null;
  };
  const authScreen = () => <AuthScreen onAuthenticated={() => setRoute('dashboard')}
    onChangeLanguage={language => void applyEntryLanguage(language)} languageBusy={savingLanguage}
    onRequireConsent={(name, email) => {
      pendingRegistrationIdentity.current = registrationIdentity(name, email);
      setLegalFromRegistration(true);
    }}
    onBindConsent={bindConsent}
    onIdentityChange={(name, email) => { registrationDraft.current = retainConsentForIdentityChange(registrationDraft.current, name, email); }}
    onDiscardConsent={() => { registrationDraft.current = null; }} />;

  let content;
  const entry = resolveEntryRoute({
    loading: checkingWelcome || checking || !isHydrated || recoveryLoading || checkingRecoveryLink ||
      (!!session && !recoveryActive && (!preferencesLoaded || preferencesUserId !== session.user.id)),
    recovery: recoveryActive, welcomeComplete, languageSelected, legalPresented, legalFromRegistration,
    userId: session?.user.id ?? null,
    permissionsUserId: permissionsReview?.userId ?? null,
    permissionsReviewed: permissionsReview?.reviewed ?? false,
    onboardingUserId, checkingOnboarding, onboardingError: !!onboardingError,
    onboardingComplete, awaitingApproval: awaitingDeviceApproval,
  });

  if (entry === 'loading') {
    content = <LoadingScreen />;
  } else if (recoveryLinkError) {
    content = <EntryLayout footer={<EntryButton label={t('Continuar', 'Continue')} onPress={() => setRecoveryLinkError(false)} />}>
      <EntryHeading eyebrow={t('RECUPERACIÓN DE CUENTA', 'ACCOUNT RECOVERY')}
        title={t('El enlace no está disponible.', 'This link is unavailable.')}
        description={t('Puede haber vencido o faltar conexión. Revisa tu internet y abre el correo de nuevo, o solicita otro código desde «Olvidé mi contraseña».', 'It may have expired or you may be offline. Check your connection and open the email again, or request a new code from “Forgot my password”.')} />
    </EntryLayout>;
  } else if (entry === 'recovery') {
    content = <ResetPasswordScreen onDone={() => { setRecoveryUserId(null); setRecovering(false); }} />;
  } else if (entry === 'language') {
    content = <LanguageScreen initialLanguage={preferences.language} onContinue={language => { void applyEntryLanguage(language); }} busy={savingLanguage} error={languageError} />;
  } else if (entry === 'terms' && !legalFromRegistration) {
    content = <TermsScreen key={preferences.language} onBack={() => {
      registrationDraft.current = null;
      setLanguageSelected(false);
    }} onContinue={consent => {
      registrationDraft.current = { consent, identity: null };
      setLegalPresented(true);
    }} />;
  } else if (entry === 'terms' && legalFromRegistration) {
    // Auth permanece montado bajo la pantalla legal para conservar el formulario.
    content = authScreen();
  } else if (entry === 'welcome') {
    content = (
      <WelcomeCarouselScreen
        onChangeLanguage={language => void applyEntryLanguage(language)} languageBusy={savingLanguage}
        onComplete={() => {
          setWelcomeComplete(true);
          void AsyncStorage.setItem(WELCOME_KEY, 'true').catch(() => undefined);
        }}
      />
    );
  } else if (entry === 'auth') {
    content = authScreen();
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
  } else if (inboxOpen && session && ['approval', 'onboarding'].includes(entry) ||
             inboxOpen && session && entry === 'app' && route !== 'measure') {
    content = <NotificationInboxScreen key={session.user.id} initialAlertId={pendingAlertId} onInitialHandled={() => setPendingAlertId(null)}
      onBack={() => { setInboxOpen(false); setPendingAlertId(null); }} onOpen={openNotification} />;
  } else if (entry === 'approval') {
    content = <WaitingApprovalScreen initialPendingDeviceIds={pendingDeviceIds} onApproved={device => {
      if (session) void rememberSelectedDevice(session.user.id, device.id).catch(() => undefined);
      setDevice(device); setOnboardingComplete(true); setAwaitingDeviceApproval(false); setRoute('dashboard');
    }} onDismiss={() => { setAwaitingDeviceApproval(false); setOnboardingRetry(value => value + 1); }} />;
  } else if (entry === 'onboarding') {
    content = (
      <OnboardingScreen
        onComplete={(device) => {
          if (session) void rememberSelectedDevice(session.user.id, device.id).catch(() => undefined);
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
  } else if (route === 'link-device') {
    content = <OnboardingScreen addingDevice onCancel={() => setRoute('dashboard')} onComplete={() => {
      useAppStore.getState().invalidateData(); setRoute('dashboard');
    }} />;
  } else if (route === 'settings') {
    // Al volver de Administración, Configuración reabre la categoría de origen (Equipos y datos).
    content = <FieldSettingsScreen key={session?.user.id} initialPage={settingsReturn} onClose={() => setRoute('dashboard')} onOpenInbox={() => setInboxOpen(true)} onOpenAdministration={() => { setSettingsReturn('equipment'); setRoute('administration'); }} />;
  } else if (route === 'administration') {
    content = <AdministrationScreen key={session?.user.id} initialDeviceId={notificationDeviceId} onClose={() => { setNotificationDeviceId(null); setRoute('settings'); }} />;
  } else if (route === 'history') {
    content = (
      <HistoryScreen onClose={() => setRoute('dashboard')} onOpenDetail={handleOpenDetail} />
    );
  } else if (route === 'devices') {
    content = <DevicesScreen key={`${session?.user.id}:${notificationDeviceId ?? ''}`} initialDeviceId={notificationDeviceId} onLinkDevice={() => setRoute('link-device')} onClose={() => { setNotificationDeviceId(null); setRoute(devicesOrigin); }} />;
  } else if (route === 'measure') {
    content = (
      // Una medición nueva monta la pantalla de nuevo: no hereda etapa ni especie de la anterior.
      <MeasureScreen key={measureRun} onDone={() => setRoute('dashboard')} onCancel={() => setRoute('dashboard')} onMeasureAgain={() => setMeasureRun(run => run + 1)} />
    );
  } else {
    content = (
      <DashboardScreen
        onStartMeasurement={() => setRoute('measure')}
        onLinkDevice={() => setRoute('link-device')}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={() => { void SplashScreen.hideAsync().catch(() => undefined); }}>
      <SafeAreaProvider>
        <StatusBar style={entry === 'loading' || isDark ? 'light' : 'dark'} />
        <View style={{ display: ['loading', 'language', 'terms', 'welcome', 'auth', 'recovery'].includes(entry) ? 'none' : 'flex' }}>
          <OfflineBanner />
        </View>
        <ScreenGuide enabled={!recoveryLinkError && entry === 'app' && route !== 'link-device'} scope={`${entry}:${route}`}>
        {/* Sólo mientras espera aprobación: ahí llega el aviso de la respuesta. En la primera
            vinculación no hay avisos que revisar y la franja desplazaba la pantalla hacia abajo. */}
        {session && !inboxOpen && entry === 'approval' && <InboxShortcut onPress={() => setInboxOpen(true)} />}
        {content}
        {entry === 'app' && !inboxOpen && !recoveryLinkError && ['dashboard', 'devices', 'history', 'settings', 'administration'].includes(route) && (
          <BottomNavigation route={route} onNavigate={next => { setNotificationDeviceId(null); setDevicesOrigin('dashboard'); setSettingsReturn(undefined); setRoute(next); }} />
        )}
        {/* El detalle sólo existe dentro de Mediciones de la cuenta con sesión: con las
            mismas barreras que esa pantalla (entrada completa y sin error de recuperación). */}
        {entry === 'app' && !!session && !recoveryLinkError && route === 'history' &&
          <MeasurementDetailModal point={detailPoint} onClose={() => setDetailPoint(null)} />}
        </ScreenGuide>
        <Modal visible={entry === 'terms' && legalFromRegistration} animationType="slide" presentationStyle="fullScreen"
          onRequestClose={() => { registrationDraft.current = null; pendingRegistrationIdentity.current = null; setLegalFromRegistration(false); }}>
          <SafeAreaProvider>{entry === 'terms' && legalFromRegistration && <TermsScreen key={preferences.language} onBack={() => {
            registrationDraft.current = null; pendingRegistrationIdentity.current = null; setLegalFromRegistration(false);
          }} onContinue={(consent: RegistrationConsent) => {
            registrationDraft.current = { consent, identity: pendingRegistrationIdentity.current };
            pendingRegistrationIdentity.current = null;
            setLegalFromRegistration(false);
          }} />}</SafeAreaProvider>
        </Modal>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

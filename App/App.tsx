import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, useColorScheme, View } from 'react-native';
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
import { HistoryScreen } from './src/screens/HistoryScreen';
import { PerimeterScreen } from './src/screens/PerimeterScreen';
import { Colors } from './src/constants/theme';
import type { MapMeasurementPoint } from './src/types/app';

type Route = 'map' | 'measure' | 'settings' | 'devices' | 'history' | 'perimeter';

export default function App() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [route, setRoute] = useState<Route>('map');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // El token se registra tras iniciar sesión, no al arrancar: antes no hay
  // perfil donde guardarlo y la petición de permiso llegaría sin contexto.
  useEffect(() => {
    if (session) void registerPushToken();
  }, [session]);

  const notImplemented = useCallback((what: string) => {
    Alert.alert(what, 'Funcionalidad en desarrollo.');
  }, []);

  const handleOpenDetail = useCallback((p: MapMeasurementPoint) => {
    Alert.alert(p.title, p.action ?? 'Sin acciones correctivas para esta medición.');
  }, []);

  let content: React.ReactNode;

  if (checking) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else if (!session) {
    content = <AuthScreen onAuthenticated={() => setRoute('map')} />;
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

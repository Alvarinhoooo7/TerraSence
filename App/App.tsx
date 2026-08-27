import React, { useCallback } from 'react';
import { Alert, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MapScreen } from './src/screens/MapScreen';
import type { MapMeasurementPoint } from './src/types/app';

export default function App() {
  const isDark = useColorScheme() === 'dark';

  // Pantallas aún por portar desde Akura (tareas C7 a C9 del plan de migración).
  const notImplemented = useCallback((what: string) => {
    Alert.alert(what, 'Pantalla pendiente de portar desde el proyecto Akura.');
  }, []);

  const handleOpenDetail = useCallback((p: MapMeasurementPoint) => {
    Alert.alert(p.title, p.action ?? 'Sin acciones correctivas para esta medición.');
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <MapScreen
          onStartMeasurement={() => notImplemented('Medición')}
          onOpenSettings={() => notImplemented('Ajustes')}
          onOpenList={() => notImplemented('Historial')}
          onOpenDetail={handleOpenDetail}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

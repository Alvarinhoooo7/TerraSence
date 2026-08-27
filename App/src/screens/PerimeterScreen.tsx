// src/screens/PerimeterScreen.tsx
//
// Dibujo del perímetro del predio. Dos formas de trabajar, porque en terreno
// sirven cosas distintas:
//
//   · Tocar el mapa      — rápido si el predio se distingue en la imagen satelital.
//   · Caminar el borde   — el agricultor recorre la linde y añade su posición GPS
//                          en cada esquina. Es lo único que funciona con nubes,
//                          bajo dosel arbóreo o cuando la imagen está desfasada.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as Location from 'expo-location';

import { Colors, Spacing, Typography } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import {
  MIN_VERTICES,
  deletePerimeter,
  getPerimeter,
  savePerimeter,
  type LatLng,
} from '../services/perimeterService';

interface Props {
  onClose: () => void;
}

export const PerimeterScreen: React.FC<Props> = ({ onClose }) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { fieldName } = useAppStore();

  const [points, setPoints] = useState<LatLng[]>([]);
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const existing = await getPerimeter(fieldName);
      if (existing && existing.coordinates.length >= MIN_VERTICES) {
        setPoints(existing.coordinates);
        setAreaHa(existing.areaHa);
        const lats = existing.coordinates.map((c) => c.latitude);
        const lngs = existing.coordinates.map((c) => c.longitude);
        setRegion({
          latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
          longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
          latitudeDelta: Math.max(0.004, (Math.max(...lats) - Math.min(...lats)) * 1.6),
          longitudeDelta: Math.max(0.004, (Math.max(...lngs) - Math.min(...lngs)) * 1.6),
        });
      } else {
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setRegion({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.006,
            longitudeDelta: 0.006,
          });
        } catch {
          setRegion({
            latitude: -35.4264,
            longitude: -71.6554,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
        }
      }
      setLoading(false);
    })();
  }, [fieldName]);

  const addHere = useCallback(async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setPoints((p) => [...p, { latitude: pos.coords.latitude, longitude: pos.coords.longitude }]);
    } catch {
      Alert.alert('Sin señal GPS', 'No se pudo obtener tu posición. Sal a cielo abierto e inténtalo otra vez.');
    }
  }, []);

  const undo = useCallback(() => setPoints((p) => p.slice(0, -1)), []);

  const save = useCallback(async () => {
    if (points.length < MIN_VERTICES) {
      Alert.alert(
        'Faltan puntos',
        `Hacen falta al menos ${MIN_VERTICES} esquinas para cerrar el predio. Llevas ${points.length}.`,
      );
      return;
    }
    setBusy(true);
    try {
      const saved = await savePerimeter(fieldName, points);
      setAreaHa(saved.areaHa);
      Alert.alert(
        'Perímetro guardado',
        saved.areaHa != null
          ? `Superficie calculada: ${saved.areaHa.toFixed(2)} ha.`
          : 'Perímetro guardado.',
        [{ text: 'Listo', onPress: onClose }],
      );
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [points, fieldName, onClose]);

  const remove = useCallback(() => {
    Alert.alert('Borrar perímetro', `Se eliminará el perímetro de "${fieldName}".`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await deletePerimeter(fieldName).catch(() => undefined);
          setPoints([]);
          setAreaHa(null);
        },
      },
    ]);
  }, [fieldName]);

  if (loading || !region) {
    return (
      <SafeAreaView style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        mapType="hybrid"
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={(e) => setPoints((p) => [...p, e.nativeEvent.coordinate])}
      >
        {points.length >= MIN_VERTICES && (
          <Polygon
            coordinates={points}
            fillColor={isDark ? 'rgba(79,183,131,0.22)' : 'rgba(31,91,63,0.20)'}
            strokeColor={colors.primary}
            strokeWidth={3}
          />
        )}
        {points.map((c, i) => (
          <Marker
            key={`${c.latitude}-${c.longitude}-${i}`}
            coordinate={c}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={[styles.vertex, { backgroundColor: colors.primary }]}>
              <Text style={styles.vertexText}>{i + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <SafeAreaView edges={['top']} style={styles.topSafe} pointerEvents="box-none">
        <View style={[styles.banner, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}>
          <Text style={[styles.bannerTitle, { color: colors.text }]} numberOfLines={1}>
            Perímetro de {fieldName}
          </Text>
          <Text style={[styles.bannerHint, { color: colors.textSecondary }]}>
            {points.length === 0
              ? 'Toca el mapa en cada esquina, o camina la linde y usa «Estoy aquí».'
              : `${points.length} punto${points.length === 1 ? '' : 's'}` +
                (areaHa != null ? ` · ${areaHa.toFixed(2)} ha guardadas` : '')}
          </Text>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.bottomSafe} pointerEvents="box-none">
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.secondary, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryText, { color: colors.text }]}>Volver</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={undo}
            disabled={points.length === 0}
            style={[
              styles.secondary,
              { backgroundColor: colors.mapOverlay, borderColor: colors.border, opacity: points.length ? 1 : 0.4 },
            ]}
          >
            <Text style={[styles.secondaryText, { color: colors.text }]}>Deshacer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={addHere}
            style={[styles.primary, { backgroundColor: colors.secondary }]}
          >
            <Text style={styles.primaryText}>📍 Estoy aquí</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          {points.length > 0 && (
            <TouchableOpacity
              onPress={remove}
              style={[styles.secondary, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryText, { color: colors.danger }]}>Borrar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={save}
            disabled={busy}
            style={[styles.primary, { backgroundColor: colors.primary, flex: 1, opacity: busy ? 0.6 : 1 }]}
          >
            <Text style={styles.primaryText}>
              {busy ? 'Guardando…' : `Guardar perímetro (${points.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  banner: {
    margin: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
  },
  bannerTitle: { ...Typography.bodyBold },
  bannerHint: { ...Typography.caption, marginTop: 2 },
  bottomSafe: { position: 'absolute', bottom: 0, left: 0, right: 0, gap: Spacing.sm },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  secondary: {
    height: Spacing.touchTarget,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...Typography.captionBold },
  primary: {
    flex: 1,
    height: Spacing.touchTarget,
    borderRadius: Spacing.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { ...Typography.button, color: '#FFFFFF' },
  vertex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vertexText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
});

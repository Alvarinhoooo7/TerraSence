// src/screens/MapScreen.tsx
//
// PANTALLA PRINCIPAL de TerraSense: mapa satelital a pantalla completa.
// Adaptado de DashboardScreen.tsx del proyecto Akura.
//
// Diferencias respecto al original de Akura:
//   · Akura pinta UN marcador (el adulto mayor) + N geocercas fijas.
//     TerraSense pinta N mediciones, cada una con su propio círculo.
//   · El color del círculo ya no es fijo: es el veredicto del semáforo.
//   · El radio sale de `radius_m` de cada medición (20 m por defecto).
//   · Se añade botón flotante de medición y selector de etapa fenológica.
//
// Accesibilidad (WCAG 2.2 AA): el veredicto NUNCA se codifica sólo por color.
// Cada círculo lleva un marcador central con icono (✓ / ! / ✕).

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as Location from 'expo-location';

import { Colors, Spacing, Typography, VERDICT_META } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { StageSelector } from '../components/StageSelector';
import { MeasurementBottomSheet } from '../components/MeasurementBottomSheet';
import { fetchMeasurements, flushQueue, pendingCount } from '../services/measurementsService';
import type { MapMeasurementPoint } from '../types/app';

/** Precisión GPS por encima de la cual se advierte antes de guardar. */
const GPS_ACCURACY_WARN_M = 15;

const FALLBACK_REGION: Region = {
  // Valle Central, Región del Maule: encuadre por defecto sin ubicación aún.
  latitude: -35.4264,
  longitude: -71.6554,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

interface Props {
  onStartMeasurement: () => void;
  onOpenSettings: () => void;
  onOpenList: () => void;
  onOpenDetail: (p: MapMeasurementPoint) => void;
}

export const MapScreen: React.FC<Props> = ({
  onStartMeasurement,
  onOpenSettings,
  onOpenList,
  onOpenDetail,
}) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const mapRef = useRef<MapView>(null);
  const {
    stage,
    setStage,
    fieldName,
    device,
    points,
    setPoints,
    selectedPointId,
    selectPoint,
    pendingCount: pending,
    setPendingCount,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  const selected = points.find((p) => p.id === selectedPointId) ?? null;

  // ── Ubicación ───────────────────────────────────────────────────────────
  const centerOnUser = useCallback(async () => {
    if (!hasLocationPermission) return;
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setGpsAccuracy(pos.coords.accuracy ?? null);
      mapRef.current?.animateToRegion(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        600,
      );
    } catch {
      // Sin señal GPS todavía: el mapa se queda donde está, sin bloquear nada.
    }
  }, [hasLocationPermission]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasLocationPermission(granted);
      if (granted) await centerOnUser();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Carga de mediciones + vaciado de la cola offline ────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { sent } = await flushQueue();
      if (sent > 0) setPendingCount(await pendingCount());
      const rows = await fetchMeasurements(fieldName);
      setPoints(rows);
    } catch {
      // Sin cobertura: se conservan los puntos ya cargados en memoria y la app
      // sigue siendo plenamente operativa. La nube nunca bloquea la medición.
      setPendingCount(await pendingCount());
    } finally {
      setLoading(false);
    }
  }, [fieldName, setPoints, setPendingCount]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Acción de medir ─────────────────────────────────────────────────────
  const handleMeasure = useCallback(() => {
    if (gpsAccuracy != null && gpsAccuracy > GPS_ACCURACY_WARN_M) {
      Alert.alert(
        'Señal GPS imprecisa',
        `La precisión actual es de ±${Math.round(gpsAccuracy)} m. El punto puede quedar ` +
          'desplazado en el mapa. Espera unos segundos a cielo abierto o mide igualmente.',
        [
          { text: 'Esperar', style: 'cancel' },
          { text: 'Medir igual', onPress: onStartMeasurement },
        ],
      );
      return;
    }
    onStartMeasurement();
  }, [gpsAccuracy, onStartMeasurement]);

  return (
    <View style={styles.root}>
      {/* ── 1. MAPA A PANTALLA COMPLETA ─────────────────────────────────── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={FALLBACK_REGION}
        mapType="hybrid"
        showsUserLocation={hasLocationPermission}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={() => selectPoint(null)}
      >
        {points.map((p) => {
          const meta = VERDICT_META[p.verdict];
          const fill = isDark ? meta.fillDark : meta.fillLight;
          const stroke = isDark ? meta.strokeDark : meta.strokeLight;
          const isSel = p.id === selectedPointId;

          return (
            <React.Fragment key={p.id}>
              <Circle
                center={{ latitude: p.latitude, longitude: p.longitude }}
                radius={p.radiusM}
                fillColor={fill}
                strokeColor={stroke}
                strokeWidth={isSel ? 4 : 2}
                zIndex={1}
              />
              {/* Marcador central con ICONO: el color no es el único código */}
              <Marker
                coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={2}
                tracksViewChanges={false}
                onPress={() => selectPoint(p.id)}
                accessibilityLabel={`Medición ${meta.label}. ${p.title}`}
              >
                <View style={[styles.pointIcon, { backgroundColor: stroke }]}>
                  <Text style={styles.pointIconText}>{meta.icon}</Text>
                </View>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapView>

      {/* ── 2. BARRA SUPERIOR FLOTANTE ──────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.topSafe} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ajustes"
            onPress={onOpenSettings}
            style={[styles.iconBtn, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>

          <StageSelector value={stage} onChange={setStage} colors={colors} />

          <View
            style={[styles.statusPill, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}
          >
            <Text style={[styles.statusText, { color: colors.text }]}>
              {device ? `🔋 ${device.battery_level}%` : '📡 Sin equipo'}
            </Text>
          </View>
        </View>

        <View style={styles.subBar} pointerEvents="box-none">
          <View style={[styles.fieldPill, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}>
            <Text style={[styles.fieldText, { color: colors.text }]} numberOfLines={1}>
              📍 {fieldName}
            </Text>
          </View>
          {pending > 0 && (
            <View style={[styles.pendingPill, { backgroundColor: colors.warning }]}>
              <Text style={styles.pendingText}>{pending} sin sincronizar</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* ── 3. BURBUJA DE DETALLE ───────────────────────────────────────── */}
      <MeasurementBottomSheet
        point={selected}
        colors={colors}
        isDark={isDark}
        onClose={() => selectPoint(null)}
        onOpenDetail={onOpenDetail}
      />

      {/* ── 4. CONTROLES INFERIORES ─────────────────────────────────────── */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe} pointerEvents="box-none">
        <View style={styles.bottomBar} pointerEvents="box-none">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Centrar en mi ubicación"
            onPress={centerOnUser}
            style={[styles.iconBtn, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 20 }}>🎯</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Realizar una medición ahora"
            onPress={handleMeasure}
            style={[styles.measureBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.measureText}>⊕  MEDIR AHORA</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ver mediciones en lista"
            onPress={onOpenList}
            style={[styles.iconBtn, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 20 }}>🗂️</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading && (
        <View style={[styles.loading, { backgroundColor: colors.mapOverlay }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Cargando mediciones…</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  topSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  subBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  iconBtn: {
    width: Spacing.touchTarget,
    height: Spacing.touchTarget,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    height: Spacing.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
  },
  statusText: { ...Typography.captionBold },
  fieldPill: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    maxWidth: '65%',
  },
  fieldText: { ...Typography.captionBold },
  pendingPill: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius,
  },
  pendingText: { ...Typography.badge, color: '#FFFFFF' },
  pointIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointIconText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  bottomSafe: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  measureBtn: {
    flex: 1,
    height: 56,
    borderRadius: Spacing.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  measureText: { ...Typography.button, color: '#FFFFFF', fontSize: 17 },
  loading: {
    position: 'absolute',
    top: '46%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.borderRadius,
  },
  loadingText: { ...Typography.caption },
});

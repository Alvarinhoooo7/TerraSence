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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Circle, Marker, Polygon, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as Location from 'expo-location';

import { Spacing, Typography, VERDICT_META } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppStore } from '../store/useAppStore';
import { StageSelector } from '../components/StageSelector';
import { FieldPicker } from '../components/FieldPicker';
import { MeasurementBottomSheet } from '../components/MeasurementBottomSheet';
import { ScreenGuide } from '../components/ScreenGuide';
import { useTranslation } from '../hooks/useTranslation';
import {
  fetchMeasurements,
  flushQueue,
  pendingCount,
  pendingMeasurementPoints,
} from '../services/measurementsService';
import { getPerimeter, type LatLng } from '../services/perimeterService';
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
  onOpenPerimeter: () => void;
  onStartMeasurement: () => void;
  onOpenSettings: () => void;
  onOpenList: () => void;
  onOpenDetail: (p: MapMeasurementPoint) => void;
}

export const MapScreen: React.FC<Props> = ({
  onOpenPerimeter,
  onStartMeasurement,
  onOpenSettings,
  onOpenList,
  onOpenDetail,
}) => {
  const { isDark, colors } = useAppTheme();
  const { t } = useTranslation();

  const mapRef = useRef<MapView>(null);
  const {
    stage,
    setStage,
    fieldName,
    setFieldName,
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
  // Degradación grácil: sin cobertura las teselas satelitales no llegan y NO
  // pueden precargarse (los Términos de Google Maps Platform lo prohíben).
  // Se pasa a fondo neutro conservando círculos, escala y posición: son capas
  // vectoriales locales y se dibujan siempre.
  const [offline, setOffline] = useState(false);
  const [perimeter, setPerimeter] = useState<LatLng[]>([]);

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
      const [rows, localPoints] = await Promise.all([
        fetchMeasurements(fieldName, device?.id),
        pendingMeasurementPoints(fieldName, device?.id),
      ]);
      const remoteIds = new Set(rows.map((point) => point.id));
      setPoints(
        [...localPoints.filter((point) => !remoteIds.has(point.id)).map(p => ({ ...p, isPending: true })), ...rows].sort(
          (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
        ),
      );
      setOffline(false);
      const per = await getPerimeter(fieldName);
      setPerimeter(per?.coordinates ?? []);
    } catch {
      // Sin cobertura: se conservan los puntos ya cargados en memoria y la app
      // sigue siendo plenamente operativa. La nube nunca bloquea la medición.
      setOffline(true);
      setPendingCount(await pendingCount());
      const localPoints = await pendingMeasurementPoints(fieldName, device?.id);
      if (localPoints.length > 0) {
        const current = useAppStore.getState().points;
        const localIds = new Set(localPoints.map((point) => point.id));
        setPoints([...localPoints.map(p => ({ ...p, isPending: true })), ...current.filter((point) => !localIds.has(point.id))]);
      }
    } finally {
      setLoading(false);
    }
  }, [device?.id, fieldName, setPoints, setPendingCount]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Auto-Encuadre (Bounding Box) ────────────────────────────────────────
  useEffect(() => {
    if (perimeter.length > 0 || points.length > 0) {
      const coords = [...perimeter, ...points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))];
      if (coords.length > 0) {
        // Retraso ligero para permitir que el mapa termine de renderizarse
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 120, right: 40, bottom: 120, left: 40 },
            animated: true,
          });
        }, 800);
      }
    }
  }, [perimeter, points]);

  // ── Acción de medir ─────────────────────────────────────────────────────
  const handleMeasure = useCallback(() => {
    if (gpsAccuracy != null && gpsAccuracy > GPS_ACCURACY_WARN_M) {
      Alert.alert(
        t('Señal GPS imprecisa', 'Inaccurate GPS signal'),
        t(
          `La precisión actual es de ±${Math.round(gpsAccuracy)} m. El punto puede quedar desplazado en el mapa. Espera unos segundos a cielo abierto o mide igualmente.`,
          `Current accuracy is ±${Math.round(gpsAccuracy)} m. The point may be displaced on the map. Wait outdoors for a few seconds or measure anyway.`,
        ),
        [
          { text: t('Esperar', 'Wait'), style: 'cancel' },
          { text: t('Medir igual', 'Measure anyway'), onPress: onStartMeasurement },
        ],
      );
      return;
    }
    onStartMeasurement();
  }, [gpsAccuracy, onStartMeasurement, t]);

  return (
    <View style={styles.root}>
      {/* ── 1. MAPA A PANTALLA COMPLETA ─────────────────────────────────── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={FALLBACK_REGION}
        // Sin cobertura se renuncia a la imagen satelital y se conserva la capa
        // vectorial, que sí funciona offline. No se cachea nada por nuestra cuenta.
        mapType={offline ? 'none' : 'hybrid'}
        showsUserLocation={hasLocationPermission}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={() => selectPoint(null)}
      >
        {perimeter.length >= 3 && (
          <Polygon
            coordinates={perimeter}
            fillColor={isDark ? 'rgba(79,183,131,0.10)' : 'rgba(31,91,63,0.10)'}
            strokeColor={colors.primary}
            strokeWidth={2}
            zIndex={0}
          />
        )}

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
            accessibilityLabel={t('Ajustes', 'Settings')}
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
              {device ? `🔋 ${device.battery_level}%` : t('📡 Sin equipo', '📡 No device')}
            </Text>
          </View>
        </View>

        <View style={styles.subBar} pointerEvents="box-none">
          <FieldPicker value={fieldName} onChange={setFieldName} colors={colors} />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('Dibujar el perímetro del predio', 'Draw field perimeter')}
            onPress={onOpenPerimeter}
            style={[styles.pendingPill, { backgroundColor: colors.mapOverlay, borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={[styles.fieldText, { color: colors.text }]}>⬡ {t('Perímetro', 'Perimeter')}</Text>
          </TouchableOpacity>
          {offline && (
            <View style={[styles.pendingPill, { backgroundColor: colors.secondary }]}>
              <Text style={styles.pendingText}>{t('Modo campo · sin señal', 'Field mode · offline')}</Text>
            </View>
          )}
          {pending > 0 && (
            <View style={[styles.pendingPill, { backgroundColor: colors.warning }]}>
              <Text style={styles.pendingText}>{pending} {t('sin sincronizar', 'not synced')}</Text>
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
            accessibilityLabel={t('Centrar en mi ubicación', 'Center on my location')}
            onPress={centerOnUser}
            style={[styles.iconBtn, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 20 }}>🎯</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('Realizar una medición ahora', 'Take a measurement now')}
            onPress={handleMeasure}
            style={[styles.measureBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.measureText}>⊕  {t('MEDIR AHORA', 'MEASURE NOW')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('Ver mediciones en lista', 'View readings as a list')}
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
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('Cargando mediciones…', 'Loading readings…')}</Text>
        </View>
      )}
      <ScreenGuide guideId="map" style={{ top: 166 }} />
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

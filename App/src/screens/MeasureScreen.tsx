// src/screens/MeasureScreen.tsx
//
// Flujo de medición: captura → motor de inferencia → georreferencia → guardado.
//
// El motor corre LOCALMENTE en el teléfono: el veredicto se produce sin una
// sola petición de red. La nube sólo archiva después (store & forward).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { Spacing, Typography, VERDICT_META } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { ScreenGuide } from '../components/ScreenGuide';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { evaluateForStage, type StageAwareEvaluation } from '../engine/stageEvaluator';
import { readSoilProbe } from '../services/probeService';
import { newClientUuid, saveMeasurement } from '../services/measurementsService';
import { PHENOLOGICAL_STAGES, mapRowToPoint } from '../types/app';
import type { SoilMeasurementInsert } from '../types/app';
import type { SoilMeasurement } from '../types/agronomy';
import { formatEngineMetric } from '../utils/units';

const ENGINE_VERSION = '1.0.0';
const CROP_CATALOG_VERSION = '1.0.0';

type Phase = 'idle' | 'reading' | 'result' | 'saving';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

export const MeasureScreen: React.FC<Props> = ({ onDone, onCancel }) => {
  const { isDark, colors } = useAppTheme();
  const { language, t } = useTranslation();

  const { stage, cropId, textureId, fieldName, device, preferences, addPoint, setPendingCount } =
    useAppStore();

  const [phase, setPhase] = useState<Phase>('idle');
  const [raw, setRaw] = useState<SoilMeasurement | null>(null);
  const [evaluation, setEvaluation] = useState<StageAwareEvaluation | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [coords, setCoords] = useState<Location.LocationObjectCoords | null>(null);
  const clientUuid = useRef<string>(newClientUuid());

  const stageMeta = PHENOLOGICAL_STAGES.find((s) => s.id === stage);

  const runMeasurement = useCallback(async () => {
    setPhase('reading');
    try {
      // GPS y sonda en paralelo: ambos tardan y no dependen entre sí.
      const [pos, probe] = await Promise.all([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        }).catch(() => null),
        readSoilProbe(device?.device_code ?? null),
      ]);

      setCoords(pos?.coords ?? null);
      setRaw(probe.data);
      setSimulated(probe.simulated);
      setEvaluation(evaluateForStage(probe.data, stage, cropId, textureId, preferences.language));
      setPhase('result');
    } catch (err) {
      setPhase('idle');
      Alert.alert(
        t('No se pudo medir', 'Could not measure'),
        err instanceof Error ? err.message : t('Error desconocido al leer la sonda.', 'Unknown error while reading the probe.'),
      );
    }
  }, [device, stage, cropId, textureId, preferences.language, t]);

  useEffect(() => {
    void runMeasurement();
  }, [runMeasurement]);

  const save = useCallback(async () => {
    if (!evaluation || !raw) return;
    if (!coords) {
      Alert.alert(
        t('Sin posición GPS', 'No GPS position'),
        t('No se pudo obtener la ubicación. La medición necesita coordenadas para aparecer en el mapa.', 'Location could not be obtained. A reading needs coordinates to appear on the map.'),
      );
      return;
    }

    setPhase('saving');
    const row: SoilMeasurementInsert = {
      device_id: device?.id ?? '',
      user_id: null,
      crop_id: cropId,
      field_name: fieldName,
      quadrant: null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      gps_accuracy_m: coords.accuracy ?? null,
      radius_m: 20,
      phenological_stage: stage,
      vwc_percent: raw.vwc,
      soil_temp_c: raw.temp,
      ec_us_cm: raw.ec,
      ph: raw.ph,
      nitrogen: raw.nitrogen,
      phosphorus: raw.phosphorus,
      potassium: raw.potassium,
      soil_texture: textureId,
      canopy_temp_c: null,
      canopy_humidity_pct: null,
      vpd_kpa: null,
      verdict: evaluation.verdict,
      verdict_title: evaluation.verdictTitle,
      action_summary: evaluation.actionSummary,
      diagnosis: { alerts: evaluation.alerts, drivers: evaluation.drivers },
      engine_version: ENGINE_VERSION,
      crop_catalog_version: CROP_CATALOG_VERSION,
      firmware_version: device?.firmware_version ?? null,
      client_uuid: clientUuid.current,
    };

    const { synced, point } = await saveMeasurement(row);

    if (synced && point) {
      addPoint(point);
    } else {
      // Se muestra igualmente en el mapa aunque aún no haya viajado a la nube:
      // el dato ya existe y está en cola. No se le miente al usuario sobre esto.
      addPoint(
        mapRowToPoint({
          ...row,
          id: clientUuid.current,
          measured_at: new Date().toISOString(),
        } as never),
      );
      const { pendingCount } = await import('../services/measurementsService');
      setPendingCount(await pendingCount());
    }

    onDone();
  }, [
    evaluation, raw, coords, device, cropId, fieldName, stage, textureId,
    addPoint, setPendingCount, onDone, t,
  ]);

  const meta = evaluation ? VERDICT_META[evaluation.verdict] : null;
  const stroke = meta ? (isDark ? meta.strokeDark : meta.strokeLight) : colors.primary;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} hitSlop={12} style={styles.back}>
          <Text style={{ color: colors.primary, ...Typography.bodyBold }}>‹ {t('Volver', 'Back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {stageMeta
            ? `${stageMeta.emoji} ${language === 'en' ? stageMeta.labelEn : stageMeta.label}`
            : t('Medición', 'Measurement')}
        </Text>
        <View style={styles.back} />
      </View>

      {phase === 'reading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.readingText, { color: colors.text }]}>
            {t('Leyendo la sonda…', 'Reading the probe…')}
          </Text>
          <Text style={[styles.readingHint, { color: colors.textSecondary }]}>
            {t('Mantén la sonda insertada y quieta hasta que termine.', 'Keep the probe inserted and still until it finishes.')}
          </Text>
        </View>
      )}

      {phase !== 'reading' && evaluation && (
        <ScrollView contentContainerStyle={styles.scroll}>
          {simulated && (
            <View style={[styles.simBanner, { backgroundColor: colors.warning }]}>
              <Text style={styles.simText}>
                {t('DATOS SIMULADOS · no hay sonda emparejada', 'SIMULATED DATA · no paired probe')}
              </Text>
            </View>
          )}

          <View style={[styles.verdictCard, { backgroundColor: stroke }]}>
            <Text style={styles.verdictIcon}>{meta?.icon}</Text>
            <Text style={styles.verdictLabel}>{meta?.label}</Text>
            <Text style={styles.verdictTitle}>{evaluation.verdictTitle}</Text>
          </View>

          <Text style={[styles.section, { color: colors.textMuted }]}>
            {t('QUÉ HACER EN ESTA ETAPA', 'WHAT TO DO AT THIS STAGE')}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.actionText, { color: colors.text }]}>
              {evaluation.actionSummary}
            </Text>
          </View>

          {evaluation.alerts.length > 0 && (
            <>
              <Text style={[styles.section, { color: colors.textMuted }]}>{t('ALERTAS', 'ALERTS')}</Text>
              {evaluation.alerts.map((a, i) => (
                <View
                  key={`${a.param}-${i}`}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderLeftWidth: 3,
                      borderLeftColor: a.type === 'danger' ? colors.danger : colors.warning,
                    },
                  ]}
                >
                  <Text style={[styles.alertTitle, { color: colors.text }]}>{a.title}</Text>
                  <Text style={[styles.alertAction, { color: colors.textSecondary }]}>
                    {a.action}
                  </Text>
                </View>
              ))}
            </>
          )}

          <Text style={[styles.section, { color: colors.textMuted }]}>{t('LECTURAS', 'READINGS')}</Text>
          <View style={styles.grid}>
            {Object.entries(evaluation.metrics).map(([key, m]) => {
              const display = formatEngineMetric(
                key,
                m.val,
                m.unit,
                preferences.measurementSystem,
              );
              return (
                <View
                  key={key}
                  style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.metricKey, { color: colors.textMuted }]}>
                    {key.toUpperCase()}
                  </Text>
                  <Text style={[styles.metricVal, { color: colors.text }]}>
                    {display.value.toFixed(1)} {display.unit}
                  </Text>
                </View>
              );
            })}
          </View>

          {coords && (
            <Text style={[styles.gps, { color: colors.textMuted }]}>
              📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              {coords.accuracy != null ? ` · ±${Math.round(coords.accuracy)} m` : ''}
            </Text>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            onPress={save}
            disabled={phase === 'saving'}
            style={[styles.cta, { backgroundColor: colors.primary, opacity: phase === 'saving' ? 0.6 : 1 }]}
          >
            {phase === 'saving' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>{t('Guardar en el mapa', 'Save to map')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={runMeasurement} style={styles.retry}>
            <Text style={[styles.retryText, { color: colors.primary }]}>{t('Volver a medir', 'Measure again')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      <ScreenGuide guideId="measure" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: Spacing.touchTarget + 8,
  },
  back: { minWidth: 80, minHeight: Spacing.touchTarget, justifyContent: 'center' },
  headerTitle: { ...Typography.titleMedium },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  readingText: { ...Typography.titleMedium },
  readingHint: { ...Typography.caption, textAlign: 'center', paddingHorizontal: Spacing.xl },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  simBanner: { borderRadius: Spacing.borderRadius, padding: Spacing.sm },
  simText: { ...Typography.badge, color: '#FFFFFF', textAlign: 'center' },
  verdictCard: {
    borderRadius: Spacing.cardRadius,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  verdictIcon: { fontSize: 40, color: '#FFFFFF', fontWeight: '700' },
  verdictLabel: { ...Typography.badge, color: '#FFFFFF' },
  verdictTitle: { ...Typography.titleLarge, color: '#FFFFFF', textAlign: 'center' },
  section: { ...Typography.badge, marginTop: Spacing.md },
  card: { borderRadius: Spacing.borderRadius, borderWidth: 1, padding: Spacing.md },
  actionText: { ...Typography.bodyRegular },
  alertTitle: { ...Typography.bodyBold, marginBottom: 4 },
  alertAction: { ...Typography.caption },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  metric: {
    minWidth: 100,
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  metricKey: { ...Typography.badge },
  metricVal: { ...Typography.bodyBold, marginTop: 2 },
  gps: { ...Typography.caption, marginTop: Spacing.sm, textAlign: 'center' },
  cta: {
    height: 56,
    borderRadius: Spacing.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  ctaText: { ...Typography.button, color: '#FFFFFF', fontSize: 17 },
  retry: { minHeight: Spacing.touchTarget, alignItems: 'center', justifyContent: 'center' },
  retryText: { ...Typography.bodyBold },
});

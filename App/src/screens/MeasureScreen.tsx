import { useResetGuide } from '../components/guide/GuideContext';
import { useTranslation } from '../hooks/useTranslation';
import { GuideTouchable as TouchableOpacity, GuideScrollView as ScrollView } from '../components/guide/GuideControls';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppStore } from '../store/useAppStore';
import { evaluateForStage, type StageAwareEvaluation } from '../engine/stageEvaluator';
import { buildContextualAdvice, type ContextualAdvice } from '../engine/contextualAdvice';
import { computeVpdKpa, CROPS_DB, SOIL_TEXTURES } from '../engine/agronomyEngine';
import { readSoilProbe, verifySoilProbe } from '../services/probeService';
import { fetchCurrentWeather, type CurrentWeather } from '../services/weatherService';
import { newClientUuid, saveMeasurement } from '../services/measurementsService';
import { PHENOLOGICAL_STAGES, mapRowToPoint, type PhenologicalStage, type SoilMeasurementInsert } from '../types/app';
import type { SoilMeasurement } from '../types/agronomy';
import { formatEngineMetric } from '../utils/units';
import { MeasurementExplorer } from '../components/MeasurementExplorer';
import { buildMeasurementPresentation } from '../engine/measurementPresentation';
import { CalibrationReminderModal } from '../components/CalibrationReminderModal';
import { RadarScan } from '../components/RadarScan';

const ENGINE_VERSION = '1.2.0';
const CROP_CATALOG_VERSION = '1.0.0';
type Phase = 'connecting' | 'connection_error' | 'stage' | 'reading' | 'result' | 'saving';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

export const MeasureScreen: React.FC<Props> = ({ onDone, onCancel }) => {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const {
    setStage,
    cropId,
    textureId,
    fieldName,
    device,
    preferences,
    addPoint,
    setPendingCount,
  } = useAppStore();

  const [phase, setPhase] = useState<Phase>('stage');
  const [stage, selectStage] = useState<PhenologicalStage | null>(null);
  const context = useRef({ cropId, textureId, fieldName, device });
  const saving = useRef(false);
  const reading = useRef(false);
  const saved = useRef(false);
  useResetGuide(phase);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [raw, setRaw] = useState<SoilMeasurement | null>(null);
  const [evaluation, setEvaluation] = useState<StageAwareEvaluation | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const weatherRequest = useRef(0);
  useEffect(() => () => { weatherRequest.current += 1; }, []);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [coords, setCoords] = useState<Location.LocationObjectCoords | null>(null);
  const [advice, setAdvice] = useState<ContextualAdvice | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const clientUuid = useRef(newClientUuid());

  const cancel = useCallback(() => {
    if (saving.current) return;
    const leave = () => { weatherRequest.current += 1; onCancel(); };
    if (raw && !saved.current) Alert.alert('Lectura sin guardar', '¿Descartar esta lectura y volver al dashboard?', [
      { text: 'Seguir revisando', style: 'cancel' }, { text: 'Descartar', style: 'destructive', onPress: leave },
    ]);
    else leave();
  }, [raw, onCancel]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { cancel(); return true; });
    return () => listener.remove();
  }, [cancel]);

  const runMeasurement = useCallback(async () => {
    if (!stage || saving.current || reading.current) return;
    reading.current = true;
    context.current = { cropId, textureId, fieldName, device };
    saved.current = false;
    setPhase('connecting');
    clientUuid.current = newClientUuid();
    const request = ++weatherRequest.current;
    setWeather(null);
    setWeatherLoading(false);
    try {
      const connection = await verifySoilProbe(context.current.device?.device_code ?? null);
      if (request !== weatherRequest.current) return;
      if (!connection.connected) throw new Error(connection.message ?? 'No se pudo conectar con la sonda.');
      setDemoMode(connection.simulated);
      setPhase('reading');
      const [position, probe] = await Promise.all([
        Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null), new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))]),
        readSoilProbe(context.current.device?.device_code ?? null).then(probe => ({ ...probe, capturedAt: new Date().toISOString() })),
      ]);
      const nextCoords = position?.coords ?? null;
      const nextWeather = null;
      if (request !== weatherRequest.current) return;
      setCapturedAt(probe.capturedAt);
      const nextEvaluation = evaluateForStage(probe.data, stage, context.current.cropId, context.current.textureId, preferences.language);
      setCoords(nextCoords);
      setRaw(probe.data);
      setDemoMode((current) => current || probe.simulated);
      setWeather(nextWeather);
      setEvaluation(nextEvaluation);
      setAdvice(buildContextualAdvice(stage, nextEvaluation, probe.data, nextWeather));
      setPhase('result');
      if (nextCoords) {
        setWeatherLoading(true);
        void fetchCurrentWeather(nextCoords.latitude, nextCoords.longitude).then((forecast) => {
          if (request !== weatherRequest.current) return;
          setWeather(forecast);
          setAdvice(buildContextualAdvice(stage, nextEvaluation, probe.data, forecast));
          setWeatherLoading(false);
        }).catch(() => { if (request === weatherRequest.current) setWeatherLoading(false); });
      }
    } catch (error) {
      if (request !== weatherRequest.current) return;
      setConnectionError(error instanceof Error ? error.message : 'No se pudo leer la sonda.');
      setPhase('connection_error');
    } finally {
      reading.current = false;
    }
  }, [cropId, device, fieldName, phase, preferences.language, stage, textureId]);

  const presentation = useMemo(() => raw && evaluation && advice ? buildMeasurementPresentation(raw, evaluation, advice) : null, [raw, evaluation, advice]);

  const save = useCallback(async () => {
    if (!evaluation || !raw || !stage || saving.current || saved.current) return;
    if (demoMode) {
      Alert.alert('Demostración', 'Los datos simulados no se guardan como mediciones reales.');
      return;
    }
    saving.current = true;
    weatherRequest.current += 1;
    setWeatherLoading(false);
    setPhase('saving');
    try {
    const row: SoilMeasurementInsert = {
      measured_at: capturedAt ?? new Date().toISOString(),
      device_id: context.current.device?.id ?? '',
      data_generation: context.current.device?.data_generation ?? 0,
      user_id: null,
      crop_id: context.current.cropId,
      field_name: context.current.fieldName,
      quadrant: null,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      gps_accuracy_m: coords?.accuracy ?? null,
      phenological_stage: stage,
      vwc_percent: raw.vwc,
      soil_temp_c: raw.temp,
      ec_us_cm: raw.ec,
      ph: raw.ph,
      nitrogen: raw.nitrogen,
      phosphorus: raw.phosphorus,
      potassium: raw.potassium,
      battery_percent: raw.battery,
      soil_texture: context.current.textureId,
      // Ambiente del BME280 del equipo, no de la API del clima: esa da pronóstico de
      // días para complementar la recomendación, no una medición de este punto y este
      // instante. Si el sensor no entregó dato, va NULL y no se rellena con nada.
      canopy_temp_c: raw.airTemp,
      canopy_humidity_pct: raw.airHumidity,
      air_pressure_hpa: raw.airPressure,
      vpd_kpa: computeVpdKpa(raw.airTemp, raw.airHumidity),
      verdict: evaluation.verdict,
      verdict_title: evaluation.verdictTitle,
      action_summary: advice?.summary ?? evaluation.actionSummary,
      diagnosis: { presentation, localSource: 'probe-bme280-v1', capturedAt, connectionAtCapture: 'ble-response', alerts: evaluation.alerts, drivers: evaluation.drivers, advice, weather },
      engine_version: ENGINE_VERSION,
      crop_catalog_version: CROP_CATALOG_VERSION,
      firmware_version: context.current.device?.firmware_version ?? null,
      client_uuid: clientUuid.current,
    };
    const { synced, point } = await saveMeasurement(row);
    {
      if (synced && point) addPoint(point);
      else {
        const localPoint = mapRowToPoint({
          ...row,
          id: clientUuid.current,
          measured_at: row.measured_at,
        } as never);
        addPoint({ ...localPoint, isPending: true });
      }
    }
    if (!synced) {
      const { pendingCount } = await import('../services/measurementsService');
      setPendingCount(await pendingCount());
    }
    saved.current = true;
    setShowCalibration(true);
    } catch (error) {
      Alert.alert('No se pudo confirmar el guardado', error instanceof Error ? error.message : 'Reintenta sin cerrar esta lectura.');
    } finally {
      saving.current = false;
      setPhase('result');
    }
  }, [capturedAt, advice, addPoint, coords, cropId, demoMode, device, evaluation, fieldName, raw, setPendingCount, stage, textureId, weather, presentation]);

  const header = (
    <View style={styles.header}>
      <TouchableOpacity disabled={phase === 'saving'} onPress={cancel} style={styles.headerSide}>
        <Text style={[styles.backText, { color: colors.primary }]}>‹ Volver</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Nueva medición</Text>
      <View style={styles.headerSide} />
    </View>
  );

  if (phase === 'connecting') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        {header}
        <View style={styles.center}>
          <RadarScan size={180}>
            <Text style={styles.connectionGlyph}>⌁</Text>
          </RadarScan>
          <Text style={[styles.centerTitle, { color: colors.text, marginTop: Spacing.lg }]}>Buscando TerraSense</Text>
          <Text style={[styles.centerBody, { color: colors.textSecondary }]}>La conexión es automática. Mantén el equipo encendido y cerca.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'connection_error') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        {header}
        <View style={styles.center}>
          <View style={[styles.connectionIcon, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}><Text style={[styles.connectionGlyph, { color: colors.primary }]}>!</Text></View>
          <Text style={[styles.centerTitle, { color: colors.text }]}>No se pudo completar la medición</Text>
          <Text style={[styles.centerBody, { color: colors.textSecondary }]}>Comprueba que esté encendido, con batería y cerca del teléfono.</Text>
          {connectionError && <Text style={[styles.errorDetail, { color: colors.textMuted }]}>{connectionError}</Text>}
          <TouchableOpacity disabled={!stage} onPress={runMeasurement} style={[styles.cta, { backgroundColor: colors.primary, opacity: stage ? 1 : 0.4 }]}>
            <Text style={styles.ctaText}>Reintentar medición</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'stage') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        {header}
        <ScrollView contentContainerStyle={styles.scroll}>
          {demoMode && <View style={[styles.demoBanner, { backgroundColor: colors.warning }]}><Text style={styles.demoText}>MODO DEMOSTRACIÓN · SIN SONDA REAL</Text></View>}
          <Text style={[styles.eyebrow, { color: colors.primary }]}>PREPARAR MEDICIÓN</Text>
          <Text style={[styles.source, { color: colors.textSecondary }]}>{fieldName} · {CROPS_DB[cropId].name} · {SOIL_TEXTURES[textureId].name}</Text>
          <Text style={[styles.pageTitle, { color: colors.text }]}>¿En qué fase quieres medir?</Text>
          <Text style={[styles.pageBody, { color: colors.textSecondary }]}>La fase cambia la interpretación y las recomendaciones, no los datos capturados.</Text>
          <View style={styles.stageGrid}>
            {PHENOLOGICAL_STAGES.map((item) => {
              const selected = item.id === stage;
              return (
                <TouchableOpacity
                  key={item.id}
                  guideTitle={language === "en" ? item.labelEn : item.label}
                  guide={t("Selecciona esta etapa para interpretar la lectura según el desarrollo del cultivo. No cambia los valores medidos.", "Selects this stage to interpret readings for crop development. Does not change measured values.")}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => { selectStage(item.id); setStage(item.id); }}
                  style={[
                    styles.stageCard,
                    {
                      backgroundColor: selected ? colors.primaryDark : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.stageEmoji}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stageTitle, { color: selected ? '#FFFFFF' : colors.text }]}>{language === "en" ? item.labelEn : item.label}</Text>
                    <Text style={[styles.stageFocus, { color: selected ? '#D8E8DF' : colors.textSecondary }]}>{item.focus}</Text>
                  </View>
                  <Text style={{ color: selected ? '#C5E8AF' : colors.textMuted, fontSize: 22 }}>{selected ? '●' : '○'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: Spacing.md }]}>
            <Text style={[styles.detailTitle, { color: colors.text }]}>{t('Antes de medir', 'Before measuring')}</Text>
            <Text style={[styles.detailBody, { color: colors.textSecondary }]}>{t('Inserta la sonda en suelo representativo, evitando piedras y bolsas de aire. Mantén el equipo quieto durante la lectura.', 'Insert the probe into representative soil, avoiding stones and air pockets. Keep it still during the reading.')}</Text>
            <Text style={[styles.source, { color: colors.textSecondary }]}>{device?.alias || device?.name || t('Demostración sin equipo', 'Demo without device')} · {t('El guardado se realiza después de revisar el resultado.', 'Save after reviewing the result.')}</Text>
          </View>
          <TouchableOpacity disabled={!stage} onPress={runMeasurement} style={[styles.cta, { backgroundColor: colors.primary, opacity: stage ? 1 : 0.4 }]}>
            <Text style={styles.ctaText}>{stage ? 'Medir en esta fase' : 'Selecciona una fase para continuar'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'reading') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        {header}
        <Text style={{ textAlign: 'center', color: colors.textSecondary }}>{PHENOLOGICAL_STAGES.find(item => item.id === stage)?.label}</Text>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.centerTitle, { color: colors.text }]}>Leyendo el suelo</Text>
          <Text style={[styles.centerBody, { color: colors.textSecondary }]}>Mantén la sonda insertada y quieta. Buscando ubicación en paralelo; el pronóstico se consulta después.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {header}
      <ScrollView contentContainerStyle={styles.scroll}>
        {demoMode && <View style={[styles.demoBanner, { backgroundColor: colors.warning }]}><Text style={styles.demoText}>DATOS SIMULADOS · NO USAR PARA DECISIONES REALES</Text></View>}
        <Text style={[styles.eyebrow, { color: colors.primary }]}>RESULTADOS · {PHENOLOGICAL_STAGES.find((item) => item.id === stage)?.label}</Text>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Explora cada lectura</Text>
        <Text style={[styles.pageBody, { color: colors.textSecondary }]}>Toca una tarjeta para entender el dato y ver un consejo breve.</Text>

        <Text style={[styles.source, { color: colors.textSecondary }]}>
          {demoMode ? 'Conexión simulada' : 'Respuesta BLE recibida; conexión cerrada para reposo'}{'\n'}
          Captura: {capturedAt ? new Date(capturedAt).toLocaleString() : 'Sin dato' } · Batería: {raw?.battery ?? '—'} %
          {'\n'}Ambiente: {[raw?.airTemp, raw?.airHumidity, raw?.airPressure].filter(v => v != null).length}/3 variables · N/P/K sin validación química
        </Text>
        {presentation && <MeasurementExplorer presentation={presentation} />}

        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: Spacing.md }]}>
          <Text style={[styles.detailTitle, { color: colors.text }]}>Pronóstico · próximos cinco días</Text>
          <Text style={[styles.source, { color: colors.textSecondary }]}>{weatherLoading ? 'Consultando pronóstico; ya puedes guardar la lectura local.' : weather ? `Open-Meteo · ${weather.timezone} · ${new Date(weather.fetchedAt).toLocaleString()}` : 'Pronóstico no disponible. El diagnóstico local se conserva.'}</Text>
          {weather?.forecast.map(day => {
            const temp = (value: number | null) => { if (value == null) return 'Sin dato'; const f = formatEngineMetric('temp', value, '°C', preferences.measurementSystem); return `${f.value.toFixed(1)} ${f.unit}`; };
            return <Text key={day.date} style={[styles.action, { color: colors.text }]}>{day.date}: {temp(day.minimumTemperatureC)} / {temp(day.maximumTemperatureC) } · Lluvia: {day.precipitationMm == null ? 'Sin dato' : `${day.precipitationMm} mm`}</Text>;
          })}
        </View>
        <TouchableOpacity onPress={save} disabled={phase === 'saving'} style={[styles.cta, { backgroundColor: colors.primary, opacity: phase === 'saving' ? 0.6 : 1 }]}>
          {phase === 'saving' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Guardar resultado</Text>}
        </TouchableOpacity>
        <TouchableOpacity disabled={phase === 'saving'} onPress={() => Alert.alert('Nueva medición', '¿Descartar esta lectura y elegir otra fase?', [{ text: 'Seguir revisando', style: 'cancel' }, { text: 'Continuar', onPress: () => { weatherRequest.current += 1; setRaw(null); selectStage(null); setPhase('stage'); } }])} style={styles.secondaryButton}>
          <Text style={[styles.secondaryText, { color: colors.primary }]}>Cambiar fase y volver a medir</Text>
        </TouchableOpacity>
      </ScrollView>
      <CalibrationReminderModal visible={showCalibration} onClose={() => { setShowCalibration(false); onDone(); }} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { height: 62, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSide: { minWidth: 86, minHeight: Spacing.touchTarget, justifyContent: 'center' },
  backText: { ...Typography.bodyBold },
  headerTitle: { ...Typography.titleMedium },
  center: { flex: 1, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  connectionIcon: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  connectionGlyph: { color: '#FFFFFF', fontSize: 42, fontWeight: '700' },
  centerTitle: { ...Typography.titleLarge, textAlign: 'center', marginTop: Spacing.lg },
  centerBody: { ...Typography.bodyRegular, textAlign: 'center', marginTop: Spacing.sm, maxWidth: 360 },
  errorDetail: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.md },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  demoBanner: { borderRadius: Spacing.borderRadius, padding: Spacing.sm, marginBottom: Spacing.md },
  demoText: { ...Typography.badge, color: '#FFFFFF', textAlign: 'center' },
  eyebrow: { ...Typography.badge, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  pageTitle: { ...Typography.titleLarge, fontSize: 28 },
  pageBody: { ...Typography.bodyRegular, marginTop: Spacing.sm, marginBottom: Spacing.lg },
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stageCard: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 110, borderRadius: Spacing.cardRadius, borderWidth: 1, padding: 20 },
  stageEmoji: { fontSize: 31, marginBottom: Spacing.sm },
  stageTitle: { ...Typography.titleMedium },
  stageFocus: { ...Typography.bodyRegular, marginTop: Spacing.sm },
  cta: { minHeight: 56, borderRadius: Spacing.borderRadius, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  ctaText: { ...Typography.button, color: '#FFFFFF', fontSize: 17 },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.lg },
  resultCard: { width: '48%', flexGrow: 1, minHeight: 96, borderRadius: 12, borderWidth: 1, borderTopWidth: 4, padding: Spacing.sm },
  resultLabel: { ...Typography.badge },
  resultValue: { ...Typography.bodyBold, marginTop: Spacing.sm },
  detailCard: { borderRadius: Spacing.cardRadius, borderWidth: 1, padding: Spacing.md },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  detailCounter: { ...Typography.caption },
  detailStatus: { ...Typography.badge },
  detailTitle: { ...Typography.titleMedium, marginBottom: Spacing.xs },
  source: { ...Typography.caption, marginBottom: Spacing.sm },
  detailBody: { ...Typography.bodyRegular, marginBottom: Spacing.md },
  tipBox: { borderRadius: 12, padding: Spacing.md },
  tipLabel: { ...Typography.badge, marginBottom: Spacing.xs },
  tipText: { ...Typography.bodyRegular },
  action: { ...Typography.bodyRegular, marginBottom: Spacing.sm },
  weather: { ...Typography.caption, marginTop: Spacing.sm },
  cropBox: { borderRadius: 12, padding: Spacing.md, marginTop: Spacing.md },
  cropLabel: { ...Typography.badge, marginBottom: Spacing.sm },
  cropNames: { ...Typography.bodyBold },
  carouselActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  carouselButton: { flex: 1, minHeight: Spacing.touchTarget, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  carouselText: { ...Typography.bodyBold },
  secondaryButton: { minHeight: Spacing.touchTarget, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  secondaryText: { ...Typography.bodyBold },
});

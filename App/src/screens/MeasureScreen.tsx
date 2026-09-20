import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppStore } from '../store/useAppStore';
import { evaluateForStage, type StageAwareEvaluation } from '../engine/stageEvaluator';
import { buildContextualAdvice, type ContextualAdvice } from '../engine/contextualAdvice';
import { computeVpdKpa } from '../engine/agronomyEngine';
import { readSoilProbe, verifySoilProbe } from '../services/probeService';
import { fetchCurrentWeather, type CurrentWeather } from '../services/weatherService';
import { newClientUuid, saveMeasurement } from '../services/measurementsService';
import { PHENOLOGICAL_STAGES, mapRowToPoint, type PhenologicalStage, type SoilMeasurementInsert } from '../types/app';
import type { MetricDetail, SoilMeasurement } from '../types/agronomy';
import { formatEngineMetric } from '../utils/units';
import { CalibrationReminderModal } from '../components/CalibrationReminderModal';
import { RadarScan } from '../components/RadarScan';

const ENGINE_VERSION = '1.2.0';
const CROP_CATALOG_VERSION = '1.0.0';
type Phase = 'connecting' | 'connection_error' | 'stage' | 'reading' | 'result' | 'saving';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

interface ResultCard {
  key: string;
  label: string;
  value: string;
  status: MetricDetail['status'] | 'INFO';
  explanation: string;
  tip: string;
  source: 'Sonda' | 'BME280' | 'Sonda (registro derivado de CE, sin validar)';
}

const STATUS_COPY = {
  OPTIMAL: 'Condición favorable',
  WARNING: 'Requiere atención',
  CRITICAL: 'Condición limitante',
  INFO: 'Dato de contexto',
} as const;

export const MeasureScreen: React.FC<Props> = ({ onDone, onCancel }) => {
  const { colors } = useAppTheme();
  const {
    stage,
    setStage,
    cropId,
    textureId,
    fieldName,
    device,
    preferences,
    addPoint,
    setPendingCount,
  } = useAppStore();

  const [phase, setPhase] = useState<Phase>('connecting');
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
  const [detailIndex, setDetailIndex] = useState(0);
  const [showCalibration, setShowCalibration] = useState(false);
  const clientUuid = useRef(newClientUuid());

  const connect = useCallback(async () => {
    setPhase('connecting');
    setConnectionError(null);
    const result = await verifySoilProbe(device?.device_code ?? null);
    if (!result.connected) {
      setConnectionError(result.message ?? 'No encontramos el equipo.');
      setPhase('connection_error');
      return;
    }
    setDemoMode(result.simulated);
    setPhase('stage');
  }, [device?.device_code]);

  useEffect(() => {
    void connect();
  }, [connect]);

  const runMeasurement = useCallback(async () => {
    setPhase('reading');
    clientUuid.current = newClientUuid();
    const request = ++weatherRequest.current;
    setWeather(null);
    setWeatherLoading(false);
    try {
      const [position, probe] = await Promise.all([
        Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null), new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))]),
        readSoilProbe(device?.device_code ?? null).then(probe => ({ ...probe, capturedAt: new Date().toISOString() })),
      ]);
      const nextCoords = position?.coords ?? null;
      const nextWeather = null;
      if (request !== weatherRequest.current) return;
      setCapturedAt(probe.capturedAt);
      const nextEvaluation = evaluateForStage(probe.data, stage, cropId, textureId, preferences.language);
      setCoords(nextCoords);
      setRaw(probe.data);
      setDemoMode((current) => current || probe.simulated);
      setWeather(nextWeather);
      setEvaluation(nextEvaluation);
      setAdvice(buildContextualAdvice(stage, nextEvaluation, probe.data, nextWeather));
      setDetailIndex(0);
      setPhase('result');
      if (nextCoords) {
        setWeatherLoading(true);
        void fetchCurrentWeather(nextCoords.latitude, nextCoords.longitude).then((forecast) => {
          if (request !== weatherRequest.current) return;
          setWeather(forecast);
          setAdvice(buildContextualAdvice(stage, nextEvaluation, probe.data, forecast));
          setWeatherLoading(false);
        });
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'No se pudo leer la sonda.');
      setPhase('connection_error');
    }
  }, [cropId, device?.device_code, preferences.language, stage, textureId]);

  const cards = useMemo<ResultCard[]>(() => {
    if (!evaluation || !raw) return [];
    const metricCard = (
      key: keyof StageAwareEvaluation['metrics'],
      label: string,
      explanation: string,
      tip: string,
    ): ResultCard => {
      const metric = evaluation.metrics[key];
      const formatted = formatEngineMetric(key, metric.val, metric.derived ? 'mg/kg' : metric.unit, preferences.measurementSystem);
      return {
        key,
        label,
        value: `${formatted.value.toFixed(1)} ${formatted.unit}${metric.derived ? ' · Sin validar' : ''}`,
        status: metric.derived ? 'INFO' : metric.status,
        explanation,
        tip: metric.confidenceNote ?? tip,
        source: metric.derived ? 'Sonda (registro derivado de CE, sin validar)' : 'Sonda',
      };
    };
    const ambient = (key: 'airTemp' | 'airHumidity' | 'airPressure', label: string, unit: string): ResultCard => {
      const value = raw[key];
      const formatted = value == null ? null : formatEngineMetric(key, value, unit, preferences.measurementSystem);
      return { key, label, value: formatted ? `${formatted.value.toFixed(1)} ${formatted.unit}` : 'Sin dato',
        status: 'INFO', source: 'BME280', explanation: 'Lectura ambiental local del equipo en el instante de captura.',
        tip: value == null ? 'El sensor no entregó esta variable. No se sustituye por datos de internet.' : 'Dato local informativo; su validación física sigue pendiente.' };
    };
    return [
      metricCard('vwc', 'Humedad del suelo', 'Agua en el volumen de suelo.', 'Compara varios puntos antes de ajustar riego.'),
      metricCard('ec', 'Conductividad del suelo', 'Conductividad eléctrica del suelo.', 'No identifica nutrientes individuales.'),
      metricCard('temp', 'Temperatura del suelo', 'Temperatura de contacto de la sonda.', 'Compara con el rango del cultivo.'),
      metricCard('nitrogen', 'Nitrógeno (N)', 'Registro informativo derivado de CE, sin validación química.', 'No usar para dosificar fertilizantes.'),
      metricCard('phosphorus', 'Fósforo (P)', 'Registro informativo derivado de CE, sin validación química.', 'No usar para dosificar fertilizantes.'),
      metricCard('potassium', 'Potasio (K)', 'Registro informativo derivado de CE, sin validación química.', 'No usar para dosificar fertilizantes.'),
      metricCard('ph', 'pH del suelo', 'Acidez o alcalinidad del suelo.', 'Confirma correcciones importantes con laboratorio.'),
      ambient('airTemp', 'Temperatura ambiente', '°C'),
      ambient('airHumidity', 'Humedad relativa ambiente', '%'),
      ambient('airPressure', 'Presión atmosférica', 'hPa'),
    ];
  }, [evaluation, preferences.measurementSystem, raw]);

  const tone = (status: ResultCard['status']) => {
    if (status === 'CRITICAL') return colors.danger;
    if (status === 'WARNING') return colors.warning;
    if (status === 'OPTIMAL') return colors.success;
    return colors.primary;
  };

  const save = useCallback(async () => {
    if (!evaluation || !raw) return;
    if (demoMode) {
      Alert.alert('Demostración', 'Los datos simulados no se guardan como mediciones reales.');
      return;
    }
    weatherRequest.current += 1;
    setWeatherLoading(false);
    setPhase('saving');
    try {
    const row: SoilMeasurementInsert = {
      measured_at: capturedAt ?? new Date().toISOString(),
      device_id: device?.id ?? '',
      data_generation: device?.data_generation ?? 0,
      user_id: null,
      crop_id: cropId,
      field_name: fieldName,
      quadrant: null,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      gps_accuracy_m: coords?.accuracy ?? null,
      radius_m: 20,
      phenological_stage: stage,
      vwc_percent: raw.vwc,
      soil_temp_c: raw.temp,
      ec_us_cm: raw.ec,
      ph: raw.ph,
      nitrogen: raw.nitrogen,
      phosphorus: raw.phosphorus,
      potassium: raw.potassium,
      battery_percent: raw.battery,
      soil_texture: textureId,
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
      diagnosis: { localSource: 'probe-bme280-v1', capturedAt, connectionAtCapture: 'ble-response', alerts: evaluation.alerts, drivers: evaluation.drivers, advice, weather },
      engine_version: ENGINE_VERSION,
      crop_catalog_version: CROP_CATALOG_VERSION,
      firmware_version: device?.firmware_version ?? null,
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
    setShowCalibration(true);
    } catch (error) {
      Alert.alert('No se pudo confirmar el guardado', error instanceof Error ? error.message : 'Reintenta sin cerrar esta lectura.');
    } finally {
      setPhase('result');
    }
  }, [capturedAt, advice, addPoint, coords, cropId, demoMode, device, evaluation, fieldName, raw, setPendingCount, stage, textureId, weather]);

  const header = (
    <View style={styles.header}>
      <TouchableOpacity disabled={phase === 'saving'} onPress={onCancel} style={styles.headerSide}>
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
          <Text style={[styles.centerTitle, { color: colors.text }]}>No encontramos el equipo</Text>
          <Text style={[styles.centerBody, { color: colors.textSecondary }]}>Comprueba que esté encendido, con batería y a menos de 30 metros.</Text>
          {connectionError && <Text style={[styles.errorDetail, { color: colors.textMuted }]}>{connectionError}</Text>}
          <TouchableOpacity onPress={connect} style={[styles.cta, { backgroundColor: colors.primary }]}>
            <Text style={styles.ctaText}>Reintentar conexión</Text>
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
          <Text style={[styles.eyebrow, { color: colors.primary }]}>EQUIPO DISPONIBLE</Text>
          <Text style={[styles.pageTitle, { color: colors.text }]}>¿En qué fase quieres medir?</Text>
          <Text style={[styles.pageBody, { color: colors.textSecondary }]}>La fase cambia la interpretación y las recomendaciones, no los datos capturados.</Text>
          <View style={styles.stageGrid}>
            {PHENOLOGICAL_STAGES.map((item) => {
              const selected = item.id === stage;
              return (
                <TouchableOpacity
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setStage(item.id)}
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
                    <Text style={[styles.stageTitle, { color: selected ? '#FFFFFF' : colors.text }]}>{item.label}</Text>
                    <Text style={[styles.stageFocus, { color: selected ? '#D8E8DF' : colors.textSecondary }]}>{item.focus}</Text>
                  </View>
                  <Text style={{ color: selected ? '#C5E8AF' : colors.textMuted, fontSize: 22 }}>{selected ? '●' : '○'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity onPress={runMeasurement} style={[styles.cta, { backgroundColor: colors.primary }]}>
            <Text style={styles.ctaText}>Medir en esta fase</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'reading') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.centerTitle, { color: colors.text }]}>Leyendo el suelo</Text>
          <Text style={[styles.centerBody, { color: colors.textSecondary }]}>Mantén la sonda insertada y quieta. También estamos consultando clima y ubicación.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showingAdvice = detailIndex === cards.length;
  const activeCard = cards[Math.min(detailIndex, cards.length - 1)];

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
        <View style={styles.resultGrid}>
          {cards.map((card, index) => (
            <TouchableOpacity
              key={card.key}
              accessibilityRole="button"
              accessibilityState={{ selected: detailIndex === index }}
              onPress={() => setDetailIndex(index)}
              style={[
                styles.resultCard,
                {
                  backgroundColor: colors.card,
                  borderColor: detailIndex === index ? tone(card.status) : colors.border,
                  borderTopColor: tone(card.status),
                },
              ]}
            >
              <Text style={[styles.resultLabel, { color: colors.textMuted }]}>{card.label}</Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>{card.value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.detailHeader}>
            <Text style={[styles.detailCounter, { color: colors.textMuted }]}>{detailIndex + 1} de {cards.length + 1}</Text>
            <Text style={[styles.detailStatus, { color: showingAdvice ? colors.primary : tone(activeCard.status) }]}>
              {showingAdvice ? 'RECOMENDACIÓN INTEGRAL' : STATUS_COPY[activeCard.status]}
            </Text>
          </View>
          {showingAdvice && advice ? (
            <>
              <Text style={[styles.detailTitle, { color: colors.text }]}>{advice.title}</Text>
              <Text style={[styles.detailBody, { color: colors.textSecondary }]}>{advice.summary}</Text>
              {advice.actions.map((action, index) => <Text key={index} style={[styles.action, { color: colors.text }]}>• {action}</Text>)}
              <Text style={[styles.weather, { color: colors.textSecondary }]}>Clima: {advice.weatherNote}</Text>
              {stage === 'pre_siembra' && (
                <View style={[styles.cropBox, { backgroundColor: colors.background }]}>
                  <Text style={[styles.cropLabel, { color: colors.textMuted }]}>COMPATIBLES CON LA LECTURA ACTUAL</Text>
                  <Text style={[styles.cropNames, { color: colors.text }]}>{advice.suggestedCrops.join('   ') || 'No hay coincidencias claras; corrige primero el suelo.'}</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.detailTitle, { color: colors.text }]}>{activeCard.label} · {activeCard.value}</Text>
              <Text style={[styles.source, { color: colors.textMuted }]}>Fuente: {activeCard.source}</Text>
              <Text style={[styles.detailBody, { color: colors.textSecondary }]}>{activeCard.explanation}</Text>
              <View style={[styles.tipBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.tipLabel, { color: colors.primary }]}>CONSEJO</Text>
                <Text style={[styles.tipText, { color: colors.text }]}>{activeCard.tip}</Text>
              </View>
            </>
          )}
          <View style={styles.carouselActions}>
            <TouchableOpacity
              disabled={detailIndex === 0}
              onPress={() => setDetailIndex((value) => Math.max(0, value - 1))}
              style={[styles.carouselButton, { borderColor: colors.border, opacity: detailIndex === 0 ? 0.35 : 1 }]}
            >
              <Text style={[styles.carouselText, { color: colors.text }]}>‹ Anterior</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={showingAdvice}
              onPress={() => setDetailIndex((value) => Math.min(cards.length, value + 1))}
              style={[styles.carouselButton, { borderColor: colors.border, opacity: showingAdvice ? 0.35 : 1 }]}
            >
              <Text style={[styles.carouselText, { color: colors.text }]}>Siguiente ›</Text>
            </TouchableOpacity>
          </View>
        </View>

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
        <TouchableOpacity disabled={phase === 'saving'} onPress={() => { weatherRequest.current += 1; setPhase('stage'); }} style={styles.secondaryButton}>
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

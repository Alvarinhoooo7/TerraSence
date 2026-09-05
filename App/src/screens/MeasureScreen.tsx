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
import { readSoilProbe, verifySoilProbe } from '../services/probeService';
import { fetchCurrentWeather, type CurrentWeather } from '../services/weatherService';
import { newClientUuid, saveMeasurement } from '../services/measurementsService';
import { PHENOLOGICAL_STAGES, mapRowToPoint, type PhenologicalStage, type SoilMeasurementInsert } from '../types/app';
import type { MetricDetail, SoilMeasurement } from '../types/agronomy';
import { formatEngineMetric } from '../utils/units';
import { CalibrationReminderModal } from '../components/CalibrationReminderModal';

const ENGINE_VERSION = '1.1.0';
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
  source: 'Sonda' | 'Clima' | 'Sonda (registro derivado de CE, sin validar)';
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
    try {
      const [position, probe] = await Promise.all([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }).catch(() => null),
        readSoilProbe(device?.device_code ?? null),
      ]);
      const nextCoords = position?.coords ?? null;
      const nextWeather = nextCoords
        ? await fetchCurrentWeather(nextCoords.latitude, nextCoords.longitude)
        : null;
      const nextEvaluation = evaluateForStage(probe.data, stage, cropId, textureId, preferences.language);
      setCoords(nextCoords);
      setRaw(probe.data);
      setDemoMode((current) => current || probe.simulated);
      setWeather(nextWeather);
      setEvaluation(nextEvaluation);
      setAdvice(buildContextualAdvice(stage, nextEvaluation, probe.data, nextWeather));
      setDetailIndex(0);
      setPhase('result');
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
      const formatted = formatEngineMetric(key, metric.val, metric.unit, preferences.measurementSystem);
      return {
        key,
        label,
        value: metric.derived ? 'Sin validar' : `${formatted.value.toFixed(1)} ${formatted.unit}`,
        status: metric.derived ? 'INFO' : metric.status,
        explanation,
        tip: metric.confidenceNote ?? tip,
        source: metric.derived ? 'Sonda (registro derivado de CE, sin validar)' : 'Sonda',
      };
    };
    return [
      metricCard('vwc', 'Humedad', 'Cantidad de agua disponible en el volumen de suelo.', 'Evita corregir riego por una sola lectura; compara varios puntos.'),
      metricCard('temp', 'Temp. suelo', 'Temperatura en la zona de contacto de la sonda.', 'En pre-siembra compárala con el mínimo de germinación del cultivo.'),
      metricCard('ec', 'Conductividad', 'Concentración global de sales disueltas.', 'Una CE alta puede indicar salinidad, no necesariamente fertilidad.'),
      metricCard('ph', 'pH', 'Nivel de acidez o alcalinidad que condiciona nutrientes.', 'Corrige de forma gradual y confirma cambios importantes con laboratorio.'),
      metricCard('nitrogen', 'Nitrógeno', 'Estimación asociada al crecimiento vegetativo.', 'Esta sonda lo deriva de CE; úsalo como tendencia, no como análisis químico.'),
      metricCard('phosphorus', 'Fósforo', 'Estimación vinculada a raíces, floración y energía.', 'Un pH fuera de rango puede bloquearlo aunque la lectura parezca suficiente.'),
      metricCard('potassium', 'Potasio', 'Estimación relacionada con regulación hídrica y fruto.', 'Contrasta con laboratorio antes de una corrección de alto costo.'),
      {
        key: 'air_temperature',
        label: 'Temp. ambiente',
        value: weather ? `${weather.temperatureC.toFixed(1)} °C` : 'Sin conexión',
        status: 'INFO',
        explanation: 'Temperatura actual obtenida desde el servicio climático.',
        tip: 'Compárala con la temperatura del suelo antes de sembrar o regar.',
        source: 'Clima',
      },
      {
        key: 'precipitation',
        label: 'Lluvia 24 h',
        value: weather?.dailyPrecipitationMm != null ? `${weather.dailyPrecipitationMm.toFixed(1)} mm` : 'Sin conexión',
        status: weather && ((weather.rainProbabilityPct ?? 0) >= 60 || (weather.dailyPrecipitationMm ?? 0) >= 5) ? 'WARNING' : 'INFO',
        explanation: 'Precipitación prevista para hoy en la ubicación.',
        tip: 'Si hay lluvia relevante, posterga riego y evita compactar el suelo.',
        source: 'Clima',
      },
    ];
  }, [evaluation, preferences.measurementSystem, raw, weather]);

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
    setPhase('saving');
    try {
    const row: SoilMeasurementInsert = {
      device_id: device?.id ?? '',
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
      soil_texture: textureId,
      canopy_temp_c: weather?.temperatureC ?? null,
      canopy_humidity_pct: null,
      vpd_kpa: null,
      verdict: evaluation.verdict,
      verdict_title: evaluation.verdictTitle,
      action_summary: advice?.summary ?? evaluation.actionSummary,
      diagnosis: { alerts: evaluation.alerts, drivers: evaluation.drivers, advice, weather },
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
          measured_at: new Date().toISOString(),
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
  }, [advice, addPoint, coords, cropId, demoMode, device, evaluation, fieldName, raw, setPendingCount, stage, textureId, weather]);

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={onCancel} style={styles.headerSide}>
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
          <View style={[styles.connectionIcon, { backgroundColor: colors.primaryDark }]}><Text style={styles.connectionGlyph}>⌁</Text></View>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.centerTitle, { color: colors.text }]}>Buscando TerraSense</Text>
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
                  <Text style={[styles.stageTitle, { color: selected ? '#FFFFFF' : colors.text }]}>{item.label}</Text>
                  <Text style={[styles.stageFocus, { color: selected ? '#D8E8DF' : colors.textSecondary }]}>{item.focus}</Text>
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

        <View style={styles.resultGrid}>
          {cards.map((card, index) => (
            <TouchableOpacity
              key={card.key}
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
              <Text style={[styles.resultLabel, { color: colors.textMuted }]} numberOfLines={1}>{card.label}</Text>
              <Text style={[styles.resultValue, { color: colors.text }]} numberOfLines={2}>{card.value}</Text>
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
              <Text style={[styles.mapNote, { color: colors.textSecondary }]}>
                {advice.mapEligible ? 'Esta medición puede aparecer como burbuja tonal en el mapa de pre-siembra.' : 'Esta fase se guarda en el historial y no genera una burbuja en el mapa.'}
              </Text>
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

        <TouchableOpacity onPress={save} disabled={phase === 'saving'} style={[styles.cta, { backgroundColor: colors.primary, opacity: phase === 'saving' ? 0.6 : 1 }]}>
          {phase === 'saving' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Guardar resultado</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPhase('stage')} style={styles.secondaryButton}>
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
  stageCard: { width: '48.5%', minHeight: 178, borderRadius: Spacing.cardRadius, borderWidth: 1, padding: Spacing.md },
  stageEmoji: { fontSize: 31, marginBottom: Spacing.sm },
  stageTitle: { ...Typography.titleMedium },
  stageFocus: { ...Typography.caption, marginTop: Spacing.sm },
  cta: { minHeight: 56, borderRadius: Spacing.borderRadius, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  ctaText: { ...Typography.button, color: '#FFFFFF', fontSize: 17 },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.lg },
  resultCard: { width: '31.8%', minHeight: 96, borderRadius: 12, borderWidth: 1, borderTopWidth: 4, padding: Spacing.sm },
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
  mapNote: { ...Typography.caption, marginTop: Spacing.md },
  carouselActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  carouselButton: { flex: 1, minHeight: Spacing.touchTarget, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  carouselText: { ...Typography.bodyBold },
  secondaryButton: { minHeight: Spacing.touchTarget, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  secondaryText: { ...Typography.bodyBold },
});

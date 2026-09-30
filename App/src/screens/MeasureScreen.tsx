import { useResetGuide } from '../components/guide/GuideContext';
import { useTranslation } from '../hooks/useTranslation';
import { GuideTouchable as TouchableOpacity, GuideScrollView as ScrollView } from '../components/guide/GuideControls';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppStore } from '../store/useAppStore';
import { evaluateForStage, type StageAwareEvaluation } from '../engine/stageEvaluator';
import { buildContextualAdvice, type ContextualAdvice } from '../engine/contextualAdvice';
import { computeVpdKpa } from '../engine/agronomyEngine';
import { cropName, textureName } from '../engine/catalogNames';
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
import { askForAccess } from '../components/permissionPrompt';
import { isLegacyAndroidBluetooth, readPermission } from '../services/permissionsService';
import { PERMISSION_COPY, pick } from '../utils/permissionCopy';
import { createAccountOperation } from '../utils/accountOperation';
import { useAuthStore } from '../store/useAuthStore';
import { localizeProbeError } from '../utils/probeErrors';

// Elección de incluir coordenadas y pronóstico, por instalación. Es distinta del permiso:
// en Android anterior a 12 la ubicación también se concede para buscar la sonda.
const LOCATION_CHOICE_KEY = '@terrasense/measure-location-v1';

const ENGINE_VERSION = '1.2.0';
const CROP_CATALOG_VERSION = '1.0.0';
type Phase = 'connecting' | 'connection_error' | 'stage' | 'reading' | 'result' | 'saving';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

export const MeasureScreen: React.FC<Props> = ({ onDone, onCancel }) => {
  const { colors } = useAppTheme();
  const { t, language, locale } = useTranslation();
  const {
    setStage,
    cropId,
    textureId,
    device,
    preferences,
    addPoint,
    setPendingCount,
  } = useAppStore();

  const [phase, setPhase] = useState<Phase>('stage');
  const [stage, selectStage] = useState<PhenologicalStage | null>(null);
  const context = useRef({ cropId, textureId, device });
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
  // Cuenta y generación de lo que espera un permiso o la sonda: al salir, cancelar o cambiar de
  // cuenta, ninguna continuación inicia BLE ni escribe estado, coordenadas o lecturas.
  const accountOperation = useRef(createAccountOperation(useAuthStore.getState().session?.user.id, () => useAuthStore.getState().session?.user.id));
  useEffect(() => { accountOperation.current.mount(); const unsubscribe = useAuthStore.subscribe(() => accountOperation.current.cancelIfAccountChanged()); return () => { weatherRequest.current += 1; unsubscribe(); accountOperation.current.unmount(); }; }, []);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [coords, setCoords] = useState<Location.LocationObjectCoords | null>(null);
  const [advice, setAdvice] = useState<ContextualAdvice | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const clientUuid = useRef(newClientUuid());
  const [includeLocation, setIncludeLocation] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([AsyncStorage.getItem(LOCATION_CHOICE_KEY).catch(() => null), readPermission('location')]).then(([choice, state]) => {
      if (!active) return;
      const granted = state.status === 'granted';
      // Sin elección guardada se conserva lo anterior: coordenadas si la ubicación ya estaba
      // autorizada, salvo en Android antiguo, donde ese permiso existe por el Bluetooth.
      const wanted = choice === null ? granted && !isLegacyAndroidBluetooth() : choice === 'on';
      setIncludeLocation(wanted && granted);
    });
    return () => { active = false; };
  }, []);

  const toggleLocation = useCallback(async (value: boolean) => {
    if (locationBusy) return;
    setLocationNote(null);
    if (!value) {
      setIncludeLocation(false);
      AsyncStorage.setItem(LOCATION_CHOICE_KEY, 'off').catch(() => undefined);
      return;
    }
    setLocationBusy(true);
    const active = accountOperation.current.begin();
    try {
      // El permiso se pide al activar esta opción, no al abrir la pantalla ni al medir.
      const access = await askForAccess('location', language, active);
      if (!active()) return;
      setIncludeLocation(access.ok);
      if (access.ok) {
        AsyncStorage.setItem(LOCATION_CHOICE_KEY, 'on').catch(() => undefined);
        if (access.state.approximate) setLocationNote(t('Ubicación aproximada: las coordenadas serán menos precisas.', 'Approximate location: coordinates will be less precise.'));
      } else if (access.deniedNow) {
        setLocationNote(pick(PERMISSION_COPY.location.denied, language));
      }
    } finally { setLocationBusy(false); }
  }, [language, locationBusy, t]);

  const cancel = useCallback(() => {
    if (saving.current) return;
    const leave = () => { weatherRequest.current += 1; accountOperation.current.cancel(); onCancel(); };
    if (raw && !saved.current) Alert.alert(t('Lectura sin guardar', 'Unsaved reading'), t('¿Descartar esta lectura y volver al dashboard?', 'Discard this reading and go back to the dashboard?'), [
      { text: t('Seguir revisando', 'Keep reviewing'), style: 'cancel' }, { text: t('Descartar', 'Discard'), style: 'destructive', onPress: leave },
    ]);
    else leave();
  }, [raw, onCancel, t]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { cancel(); return true; });
    return () => listener.remove();
  }, [cancel]);

  const runMeasurement = useCallback(async () => {
    if (!stage || saving.current || reading.current) return;
    reading.current = true;
    // El contexto se fija al tocar «Medir» y vale sólo para esta lectura: lo que cambie en el
    // store mientras el permiso o la sonda responden no se mezcla con ella.
    const snapshot = { cropId, textureId, device };
    const active = accountOperation.current.begin();
    if (device) {
      // Bluetooth se pide al tocar «Medir». Un estado que no se pudo consultar no es un
      // rechazo: la conexión informa el error real (o simula en desarrollo sin módulo nativo).
      let access: Awaited<ReturnType<typeof askForAccess>>;
      try { access = await askForAccess('bluetooth', language, active); }
      catch (error) { reading.current = false; throw error; }
      if (!active()) { reading.current = false; return; }
      if (!access.ok && !access.unknown) {
        reading.current = false;
        if (access.deniedNow) Alert.alert(pick(PERMISSION_COPY.bluetooth.name, language), pick(PERMISSION_COPY.bluetooth.denied, language));
        return;
      }
    }
    context.current = snapshot;
    saved.current = false;
    setPhase('connecting');
    clientUuid.current = newClientUuid();
    const request = ++weatherRequest.current;
    const current = () => request === weatherRequest.current && active();
    setWeather(null);
    setWeatherLoading(false);
    try {
      const connection = await verifySoilProbe(snapshot.device?.device_code ?? null, active, active.signal);
      if (!current()) return;
      if (!connection.connected) throw new Error(connection.message ?? t('No se pudo conectar con la sonda.', 'Could not connect to the probe.'));
      setDemoMode(connection.simulated);
      setPhase('reading');
      const [position, probe] = await Promise.all([
        includeLocation
          ? Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null), new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))])
          : Promise.resolve(null),
        readSoilProbe(snapshot.device?.device_code ?? null, active, active.signal).then(probe => ({ ...probe, capturedAt: new Date().toISOString() })),
      ]);
      const nextCoords = position?.coords ?? null;
      const nextWeather = null;
      if (!current()) return;
      setCapturedAt(probe.capturedAt);
      const nextEvaluation = evaluateForStage(probe.data, stage, snapshot.cropId, snapshot.textureId, preferences.language);
      setCoords(nextCoords);
      setRaw(probe.data);
      setDemoMode((current) => current || probe.simulated);
      setWeather(nextWeather);
      setEvaluation(nextEvaluation);
      setAdvice(buildContextualAdvice(stage, nextEvaluation, probe.data, nextWeather, preferences.language));
      setPhase('result');
      if (nextCoords) {
        setWeatherLoading(true);
        void fetchCurrentWeather(nextCoords.latitude, nextCoords.longitude).then((forecast) => {
          if (!current()) return;
          setWeather(forecast);
          setAdvice(buildContextualAdvice(stage, nextEvaluation, probe.data, forecast, preferences.language));
          setWeatherLoading(false);
        }).catch(() => { if (current()) setWeatherLoading(false); });
      }
    } catch (error) {
      if (!current()) return;
      const fallback = t('No se pudo leer la sonda.', 'Could not read the probe.');
      setConnectionError(error instanceof Error ? localizeProbeError(error.message, language, fallback) : fallback);
      setPhase('connection_error');
    } finally {
      reading.current = false;
    }
  }, [cropId, device, includeLocation, language, preferences.language, stage, t, textureId]);

  const presentation = useMemo(() => raw && evaluation && advice ? buildMeasurementPresentation(raw, evaluation, advice, language) : null, [raw, evaluation, advice, language]);

  const save = useCallback(async () => {
    if (!evaluation || !raw || !stage || saving.current || saved.current) return;
    if (demoMode) {
      Alert.alert(t('Demostración', 'Demo'), t('Los datos simulados no se guardan como mediciones reales.', 'Simulated data is not saved as real readings.'));
      return;
    }
    saving.current = true;
    // Cuenta de esta lectura: si cambia mientras se guarda, el resultado no se escribe en el store de otra.
    const active = accountOperation.current.begin();
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
      // Compatibilidad con el esquema existente; la app ya no agrupa por campo.
      field_name: '',
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
    if (!active()) return;
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
      const pending = await pendingCount();
      if (!active()) return;
      setPendingCount(pending);
    }
    saved.current = true;
    setShowCalibration(true);
    } catch (error) {
      if (active()) {
        const fallback = t('Reintenta sin cerrar esta lectura.', 'Retry without closing this reading.');
        Alert.alert(t('No se pudo confirmar el guardado', 'Could not confirm the save'), error instanceof Error ? localizeProbeError(error.message, language, fallback) : fallback);
      }
    } finally {
      saving.current = false;
      if (active()) setPhase('result');
    }
  }, [capturedAt, advice, addPoint, coords, cropId, demoMode, device, evaluation, language, raw, setPendingCount, stage, t, textureId, weather, presentation]);

  const stageLabel = (id: PhenologicalStage | null) => {
    const item = PHENOLOGICAL_STAGES.find(candidate => candidate.id === id);
    return item ? (language === 'en' ? item.labelEn : item.label) : '';
  };
  const noData = t('Sin dato', 'No data');
  const header = (
    <View style={styles.header}>
      <TouchableOpacity disabled={phase === 'saving'} onPress={cancel} style={styles.headerSide}>
        <Text style={[styles.backText, { color: colors.primary }]}>{t('‹ Volver', '‹ Back')}</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Nueva medición', 'New measurement')}</Text>
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
          <Text style={[styles.centerTitle, { color: colors.text, marginTop: Spacing.lg }]}>{t('Buscando TerraSense', 'Looking for TerraSense')}</Text>
          <Text style={[styles.centerBody, { color: colors.textSecondary }]}>{t('La conexión es automática. Mantén el equipo encendido y cerca.', 'The connection is automatic. Keep the device on and nearby.')}</Text>
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
          <Text style={[styles.centerTitle, { color: colors.text }]}>{t('No se pudo completar la medición', 'Could not complete the measurement')}</Text>
          <Text style={[styles.centerBody, { color: colors.textSecondary }]}>{t('Comprueba que esté encendido, con batería y cerca del teléfono.', 'Check that it is on, has battery and is near the phone.')}</Text>
          {connectionError && <Text style={[styles.errorDetail, { color: colors.textMuted }]}>{connectionError}</Text>}
          <TouchableOpacity disabled={!stage} onPress={runMeasurement} style={[styles.cta, { backgroundColor: colors.primary, opacity: stage ? 1 : 0.4 }]}>
            <Text style={styles.ctaText}>{t('Reintentar medición', 'Retry measurement')}</Text>
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
          {demoMode && <View style={[styles.demoBanner, { backgroundColor: colors.warning }]}><Text style={styles.demoText}>{t('MODO DEMOSTRACIÓN · SIN SONDA REAL', 'DEMO MODE · NO REAL PROBE')}</Text></View>}
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t('PREPARAR MEDICIÓN', 'PREPARE MEASUREMENT')}</Text>
          <Text style={[styles.source, { color: colors.textSecondary }]}>{cropName(cropId, language)} · {textureName(textureId, language)}</Text>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{t('¿En qué fase quieres medir?', 'Which stage do you want to measure?')}</Text>
          <Text style={[styles.pageBody, { color: colors.textSecondary }]}>{t('Elige la etapa en que se encuentra tu cultivo.', 'Choose the stage your crop is in.')}</Text>
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
                    <Text style={[styles.stageFocus, { color: selected ? '#D8E8DF' : colors.textSecondary }]}>{language === "en" ? item.focusEn : item.focus}</Text>
                  </View>
                  <Text style={{ color: selected ? '#C5E8AF' : colors.textMuted, fontSize: 22 }}>{selected ? '●' : '○'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: Spacing.md }]}>
            <Text style={[styles.detailTitle, { color: colors.text }]}>{t('Antes de medir', 'Before measuring')}</Text>
            <Text style={[styles.detailBody, { color: colors.textSecondary }]}>{t('Inserta la sonda en suelo representativo, evitando piedras y bolsas de aire. Mantén el equipo quieto durante la lectura.', 'Insert the probe into representative soil, avoiding stones and air pockets. Keep it still during the reading.')}</Text>
            <Text style={[styles.source, { color: colors.textSecondary }]}>{device?.alias || device?.name || t('Demostración sin equipo', 'Demo without device')}</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: Spacing.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: colors.text }]}>{t('Añadir ubicación y pronóstico', 'Add location and forecast')}</Text>
                <Text style={[styles.detailBody, { color: colors.textSecondary }]}>{t('Guarda las coordenadas de la lectura y consulta el pronóstico con Open-Meteo. Sin esta opción, la lectura se guarda igual.', 'Saves the reading coordinates and gets the forecast from Open-Meteo. Without this option, the reading is saved anyway.')}</Text>
              </View>
              <Switch value={includeLocation} disabled={locationBusy} onValueChange={value => { void toggleLocation(value); }}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel={t('Añadir ubicación y pronóstico', 'Add location and forecast')} />
            </View>
            {!!locationNote && <Text accessibilityLiveRegion="polite" style={[styles.source, { color: colors.textSecondary, marginTop: Spacing.sm }]}>{locationNote}</Text>}
          </View>
          <TouchableOpacity disabled={!stage} onPress={runMeasurement} style={[styles.cta, { backgroundColor: colors.primary, opacity: stage ? 1 : 0.4 }]}>
            <Text style={styles.ctaText}>{stage ? t('Medir en esta fase', 'Measure at this stage') : t('Selecciona una fase para continuar', 'Select a stage to continue')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'reading') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        {header}
        <Text style={{ textAlign: 'center', color: colors.textSecondary }}>{stageLabel(stage)}</Text>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.centerTitle, { color: colors.text }]}>{t('Leyendo el suelo', 'Reading the soil')}</Text>
          <Text style={[styles.centerBody, { color: colors.textSecondary }]}>{t('Mantén la sonda insertada y quieta. Buscando ubicación en paralelo; el pronóstico se consulta después.', 'Keep the probe inserted and still. Location is searched in parallel; the forecast is requested afterwards.')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {header}
      <ScrollView contentContainerStyle={styles.scroll}>
        {demoMode && <View style={[styles.demoBanner, { backgroundColor: colors.warning }]}><Text style={styles.demoText}>{t('DATOS SIMULADOS · NO USAR PARA DECISIONES REALES', 'SIMULATED DATA · DO NOT USE FOR REAL DECISIONS')}</Text></View>}
        <Text style={[styles.eyebrow, { color: colors.primary }]}>{t('RESULTADOS', 'RESULTS')} · {stageLabel(stage)}</Text>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{t('Explora cada lectura', 'Explore each reading')}</Text>
        <Text style={[styles.pageBody, { color: colors.textSecondary }]}>{t('Toca una tarjeta para entender el dato y ver un consejo breve.', 'Tap a card to understand the value and see brief advice.')}</Text>

        <Text style={[styles.source, { color: colors.textSecondary }]}>
          {demoMode ? t('Conexión simulada', 'Simulated connection') : t('Respuesta BLE recibida; conexión cerrada para reposo', 'BLE response received; connection closed to rest')}{'\n'}
          {t('Captura', 'Captured')}: {capturedAt ? new Date(capturedAt).toLocaleString(locale) : noData} · {t('Batería', 'Battery')}: {raw?.battery ?? '—'} %
          {'\n'}{t('Ambiente', 'Ambient')}: {[raw?.airTemp, raw?.airHumidity, raw?.airPressure].filter(v => v != null).length}/3 {t('variables · N/P/K sin validación química', 'variables · N/P/K without chemical validation')}
        </Text>
        {presentation && <MeasurementExplorer presentation={presentation} />}

        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: Spacing.md }]}>
          <Text style={[styles.detailTitle, { color: colors.text }]}>{t('Pronóstico · próximos cinco días', 'Forecast · next five days')}</Text>
          <Text style={[styles.source, { color: colors.textSecondary }]}>{weatherLoading ? t('Consultando pronóstico; ya puedes guardar la lectura local.', 'Requesting the forecast; you can already save the local reading.') : weather ? `Open-Meteo · ${weather.timezone} · ${new Date(weather.fetchedAt).toLocaleString(locale)}` : t('Pronóstico no disponible. El diagnóstico local se conserva.', 'Forecast unavailable. The local diagnosis is kept.')}</Text>
          {weather?.forecast.map(day => {
            const temp = (value: number | null) => { if (value == null) return noData; const f = formatEngineMetric('temp', value, '°C', preferences.measurementSystem); return `${f.value.toFixed(1)} ${f.unit}`; };
            return <Text key={day.date} style={[styles.action, { color: colors.text }]}>{day.date}: {temp(day.minimumTemperatureC)} / {temp(day.maximumTemperatureC) } · {t('Lluvia', 'Rain')}: {day.precipitationMm == null ? noData : `${day.precipitationMm} mm`}</Text>;
          })}
        </View>
        <TouchableOpacity onPress={save} disabled={phase === 'saving'} style={[styles.cta, { backgroundColor: colors.primary, opacity: phase === 'saving' ? 0.6 : 1 }]}>
          {phase === 'saving' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>{t('Guardar resultado', 'Save result')}</Text>}
        </TouchableOpacity>
        <TouchableOpacity disabled={phase === 'saving'} onPress={() => Alert.alert(t('Nueva medición', 'New measurement'), t('¿Descartar esta lectura y elegir otra fase?', 'Discard this reading and choose another stage?'), [{ text: t('Seguir revisando', 'Keep reviewing'), style: 'cancel' }, { text: t('Continuar', 'Continue'), onPress: () => { weatherRequest.current += 1; setRaw(null); selectStage(null); setPhase('stage'); } }])} style={styles.secondaryButton}>
          <Text style={[styles.secondaryText, { color: colors.primary }]}>{t('Cambiar fase y volver a medir', 'Change stage and measure again')}</Text>
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

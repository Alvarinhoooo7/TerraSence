import { useResetGuide } from '../components/guide/GuideContext';
import { useTranslation } from '../hooks/useTranslation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Switch, View } from 'react-native';
import { Text } from '../components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { useAppTheme } from '../hooks/useAppTheme';
import { useAppStore } from '../store/useAppStore';
import { evaluateReadingForStage, type StageAwareEvaluation } from '../engine/stageEvaluator';
import { buildContextualAdvice, type ContextualAdvice } from '../engine/contextualAdvice';
import { computeVpdKpa } from '../engine/agronomyEngine';
import { readSoilProbe, verifySoilProbe } from '../services/probeService';
import { fetchCurrentWeather, type CurrentWeather } from '../services/weatherService';
import { newClientUuid, saveMeasurement } from '../services/measurementsService';
import { PHENOLOGICAL_STAGES, mapRowToPoint, type PhenologicalStage, type SoilMeasurementInsert } from '../types/app';
import type { SoilMeasurement } from '../types/agronomy';
import { MeasurementResultFlow } from '../components/MeasurementResultFlow';
import { ScreenCard, ScreenLayout, ScreenText } from '../components/screen/ScreenUI';
import { buildMeasurementPresentation } from '../engine/measurementPresentation';
import { CalibrationReminderModal } from '../components/CalibrationReminderModal';
import { MeasurementLoading } from '../components/MeasurementLoading';
import { ProbeInsertArt } from '../components/ProbeInsertArt';
import { StageArt, StageCards } from '../components/StageCards';
import { AppIcon } from '../components/AppIcon';
import Animated from 'react-native-reanimated';
import { enterDown } from '../constants/motion';
import { EntryButton } from '../components/entry/EntryUI';
import { askForAccess } from '../components/permissionPrompt';
import { isLegacyAndroidBluetooth, readPermission } from '../services/permissionsService';
import { PERMISSION_COPY, pick } from '../utils/permissionCopy';
import { createAccountOperation } from '../utils/accountOperation';
import { useAuthStore } from '../store/useAuthStore';
import { localizeProbeError } from '../utils/probeErrors';
import { checkLowBattery } from '../utils/batteryWarning';
import { captureLocation, initialIncludeLocation, revalidateIncludeLocation, type LocationChoice } from '../utils/measureLocation';

// Elección de incluir coordenadas y pronóstico, por instalación. Es distinta del permiso:
// en Android anterior a 12 la ubicación también se concede para buscar la sonda.
const LOCATION_CHOICE_KEY = '@terrasense/measure-location-v1';

const ENGINE_VERSION = '1.3.0';
const CROP_CATALOG_VERSION = '1.0.0';
type Phase = 'connecting' | 'connection_error' | 'stage' | 'steps' | 'prepare' | 'reading' | 'result' | 'saving';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

export const MeasureScreen: React.FC<Props> = ({ onDone, onCancel }) => {
  const { colors, isDark } = useAppTheme();
  const { t, language } = useTranslation();
  const {
    setStage,
    device,
    preferences,
    addPoint,
    setPendingCount,
  } = useAppStore();

  const [phase, setPhase] = useState<Phase>('stage');
  const [stage, selectStage] = useState<PhenologicalStage | null>(null);
  const context = useRef({ device });
  const saving = useRef(false);
  const reading = useRef(false);
  const saved = useRef(false);
  useResetGuide(phase);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [saveSynced, setSaveSynced] = useState(false);
  const [lowBattery, setLowBattery] = useState<number | null>(null);
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
      setIncludeLocation(initialIncludeLocation(choice as LocationChoice, state.status === 'granted', isLegacyAndroidBluetooth()));
    });
    return () => { active = false; };
  }, []);

  // El permiso puede revocarse en Ajustes del teléfono con esta pantalla abierta: al volver
  // y antes de cada lectura se comprueba, y la opción se apaga con una nota en vez de
  // quedar encendida sin efecto.
  const includeLocationRef = useRef(includeLocation);
  includeLocationRef.current = includeLocation;
  const revalidateLocation = useCallback(async (): Promise<boolean> => {
    if (!includeLocationRef.current) return false;
    const state = await readPermission('location').catch(() => null);
    const { include, lost } = revalidateIncludeLocation(includeLocationRef.current, state?.status === 'granted');
    if (lost) {
      setIncludeLocation(false);
      setLocationNote(t('Se retiró el permiso de ubicación: esta lectura se guardará sin coordenadas.', 'Location permission was removed: this reading will be saved without coordinates.'));
    }
    return include;
  }, [t]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') void revalidateLocation(); });
    return () => subscription.remove();
  }, [revalidateLocation]);

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
    if (raw && !saved.current) Alert.alert(t('Lectura sin guardar', 'Unsaved reading'), t('¿Descartar esta lectura y volver al inicio?', 'Discard this reading and go back home?'), [
      { text: t('Seguir revisando', 'Keep reviewing'), style: 'cancel' }, { text: t('Descartar', 'Discard'), style: 'destructive', onPress: leave },
    ]);
    else leave();
  }, [raw, onCancel, t]);
  useEffect(() => {
    // Con el resultado a la vista, el Atrás lo maneja MeasurementResultFlow, paso a paso.
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      const current = phaseRef.current;
      if (current === 'result' || current === 'saving') return false;
      // Antes de medir, Atrás retrocede una pantalla: pasos → etapa, medir → pasos.
      if (current === 'steps') { setPhase('stage'); return true; }
      if (current === 'prepare') { setPhase('steps'); return true; }
      cancel(); return true;
    });
    return () => listener.remove();
  }, [cancel]);

  const runMeasurement = useCallback(async () => {
    if (!stage || saving.current || reading.current) return;
    reading.current = true;
    // El contexto se fija al tocar «Medir» y vale sólo para esta lectura: lo que cambie en el
    // store mientras el permiso o la sonda responden no se mezcla con ella.
    const snapshot = { device };
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
    const withLocation = await revalidateLocation();
    if (!active()) { reading.current = false; return; }
    context.current = snapshot;
    saved.current = false;
    setPhase('connecting');
    clientUuid.current = newClientUuid();
    const request = ++weatherRequest.current;
    const current = () => request === weatherRequest.current && active();
    setWeather(null);
    setWeatherLoading(false);
    setLowBattery(null);
    try {
      const connection = await verifySoilProbe(snapshot.device?.device_code ?? null, active, active.signal);
      if (!current()) return;
      if (!connection.connected) throw new Error(connection.message ?? t('No se pudo conectar con la sonda.', 'Could not connect to the probe.'));
      setDemoMode(connection.simulated);
      setPhase('reading');
      const [nextCoords, probe] = await Promise.all([
        captureLocation(withLocation, () => Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })),
        readSoilProbe(snapshot.device?.device_code ?? null, active, active.signal).then(probe => ({ ...probe, capturedAt: new Date().toISOString() })),
      ]);
      const nextWeather = null;
      if (!current()) return;
      setCapturedAt(probe.capturedAt);
      const nextEvaluation = evaluateReadingForStage(probe.data, stage, preferences.language);
      setCoords(nextCoords);
      setRaw(probe.data);
      setDemoMode((current) => current || probe.simulated);
      setWeather(nextWeather);
      setEvaluation(nextEvaluation);
      setAdvice(buildContextualAdvice(stage, nextEvaluation, probe.data, nextWeather, preferences.language));
      setPhase('result');
      // Batería baja: aviso dentro de la app, una vez por equipo (utils/batteryWarning).
      // Una lectura simulada no informa la batería real.
      if (!connection.simulated && !probe.simulated) {
        const battery = probe.data.battery;
        void checkLowBattery(AsyncStorage, useAuthStore.getState().session?.user.id, snapshot.device?.device_code, battery)
          .then((warn) => { if (warn && current()) setLowBattery(battery); });
      }
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
  }, [device, language, preferences.language, revalidateLocation, stage, t]);

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
      // Columnas de texto NOT NULL del esquema vigente: ausencia explícita, sin cultivar ficticio.
      crop_id: 'sin_especificar',
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
      soil_texture: 'sin_especificar',
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
    setSaveSynced(synced);
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
  }, [capturedAt, advice, addPoint, coords, demoMode, device, evaluation, language, raw, setPendingCount, stage, t, weather, presentation]);

  const stageLabel = (id: PhenologicalStage | null) => {
    const item = PHENOLOGICAL_STAGES.find(candidate => candidate.id === id);
    return item ? (language === 'en' ? item.labelEn : item.label) : '';
  };
  const deviceName = context.current.device?.alias || context.current.device?.name || device?.alias || device?.name || 'TerraSense';
  const restart = () => Alert.alert(t('Nueva medición', 'New measurement'), t('¿Descartar esta lectura y elegir otra etapa?', 'Discard this reading and choose another stage?'), [
    { text: t('Seguir revisando', 'Keep reviewing'), style: 'cancel' },
    { text: t('Descartar', 'Discard'), style: 'destructive', onPress: () => { weatherRequest.current += 1; setRaw(null); selectStage(null); setPhase('stage'); } },
  ]);
  const demoNotice = demoMode && <ScreenCard accent={colors.warning}>
    <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>{t('DATOS SIMULADOS', 'SIMULATED DATA')}</Text>
    <ScreenText>{t('No hay una sonda real conectada. No uses esta lectura para decidir.', 'No real probe is connected. Do not use this reading to make decisions.')}</ScreenText>
  </ScreenCard>;

  if (phase === 'connecting' || phase === 'reading') {
    return <MeasurementLoading reading={phase === 'reading'} deviceName={deviceName} onCancel={cancel} />;
  }

  if (phase === 'connection_error') {
    return <ScreenLayout align="center" onBack={cancel} backLabel={t('Inicio', 'Home')} eyebrow={t('MEDICIÓN', 'MEASUREMENT')}
      title={t('No se pudo completar la medición', 'Could not complete the measurement')}
      description={t('Comprueba que la sonda esté encendida, con batería y cerca del teléfono.', 'Check that the probe is on, has battery and is near the phone.')}
      footer={<>
        <EntryButton disabled={!stage} label={t('Reintentar medición', 'Retry measurement')} onPress={() => void runMeasurement()} />
        <EntryButton secondary label={t('Cambiar etapa', 'Change stage')} onPress={() => setPhase('stage')} />
      </>}>
      {!!connectionError && <ScreenCard accent={colors.danger}><ScreenText>{connectionError}</ScreenText></ScreenCard>}
    </ScreenLayout>;
  }

  if (phase === 'stage') {
    return <ScreenLayout onBack={cancel} backLabel={t('Inicio', 'Home')} eyebrow={t('MEDIR · PASO 1 DE 3', 'MEASURE · STEP 1 OF 3')}
      title={t('¿En qué etapa está tu cultivo?', 'What stage is your crop in?')}
      description={t('La lectura se interpreta según la etapa. No cambia los valores medidos.', 'The reading is interpreted for the stage. It does not change the measured values.')}
      footer={<EntryButton disabled={!stage} label={t('Continuar', 'Continue')} onPress={() => setPhase('steps')} />}>
      {demoNotice}
      <StageCards value={stage} onChange={id => { selectStage(id); setStage(id); }} />
    </ScreenLayout>;
  }

  if (phase === 'steps') {
    const steps: [string, string][] = [
      [t('Enciende la sonda', 'Turn the probe on'), t('Déjala cerca del teléfono, a menos de 2 metros.', 'Keep it near the phone, within 2 meters.')],
      [t('Límpiala antes de insertarla', 'Clean it before inserting it'), t('Electrodos limpios y secos: la tierra pegada de otra medición altera la lectura.', 'Clean, dry electrodes: soil left from another reading skews the result.')],
      [t('Entiérrala en el suelo', 'Insert it into the soil'), t('Hasta cubrir los electrodos, en suelo representativo, sin piedras ni bolsas de aire.', 'Until the electrodes are covered, in representative soil, without stones or air pockets.')],
      [t('Mantenla recta y quieta', 'Keep it straight and still'), t('Vertical y sin moverla mientras se lee.', 'Upright and without moving it while it reads.')],
    ];
    return <ScreenLayout onBack={() => setPhase('stage')} backLabel={t('Etapa', 'Stage')} eyebrow={t('MEDIR · PASO 2 DE 3', 'MEASURE · STEP 2 OF 3')}
      title={t('Antes de medir', 'Before measuring')}
      footer={<EntryButton label={t('Listo, continuar', 'Done, continue')} onPress={() => setPhase('prepare')} />}>
      <ProbeInsertArt />
      {steps.map(([title, body], i) => <Animated.View key={i} entering={enterDown(120 + i * 110)}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 4 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
            <Text style={{ color: isDark ? colors.background : '#FFFFFF', fontSize: 15, fontWeight: '800' }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{title}</Text>
            <ScreenText>{body}</ScreenText>
          </View>
        </View>
      </Animated.View>)}
    </ScreenLayout>;
  }

  if (phase === 'prepare') {
    const badge = (icon: 'bluetooth' | 'location') => <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#17392C', alignItems: 'center', justifyContent: 'center' }}>
      <AppIcon name={icon} color="#C6DFB4" size={24} />
    </View>;
    return <ScreenLayout onBack={() => setPhase('steps')} backLabel={t('Pasos', 'Steps')} eyebrow={t('MEDIR · PASO 3 DE 3', 'MEASURE · STEP 3 OF 3')}
      title={t('Todo listo', 'All set')}
      footer={<EntryButton disabled={locationBusy} label={t('Medir', 'Measure')} onPress={() => void runMeasurement()} />}>
      {demoNotice}
      {/* Resumen de lo elegido: la etapa con su ilustración y la sonda. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 10 }}>
        {stage && <View style={{ width: 96, aspectRatio: 120 / 90, borderRadius: 12, overflow: 'hidden', backgroundColor: '#17392C' }}><StageArt stage={stage} /></View>}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>{t('ETAPA', 'STAGE')}</Text>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{stageLabel(stage)}</Text>
          <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 14 }}>{t(`Sonda ${deviceName}`, `Probe ${deviceName}`)}</Text>
        </View>
      </View>
      <ScreenCard>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
          {badge('bluetooth')}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{t('Bluetooth', 'Bluetooth')}</Text>
            <ScreenText>{t('Al tocar Medir, el teléfono se conecta con la sonda. Si es la primera vez, te pedirá permiso para usar Bluetooth.', 'When you tap Measure, the phone connects to the probe. The first time, it will ask for permission to use Bluetooth.')}</ScreenText>
          </View>
        </View>
      </ScreenCard>
      <ScreenCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {badge('location')}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{t('Ubicación y pronóstico', 'Location and forecast')}</Text>
            <ScreenText>{t('Guarda las coordenadas y consulta el pronóstico. Sin esto, la lectura se guarda igual.', 'Saves the coordinates and gets the forecast. Without it, the reading is still saved.')}</ScreenText>
          </View>
          <Switch value={includeLocation} disabled={locationBusy} onValueChange={value => { void toggleLocation(value); }}
            trackColor={{ true: colors.primary, false: colors.border }} accessibilityLabel={t('Ubicación y pronóstico', 'Location and forecast')} />
        </View>
        {!!locationNote && <ScreenText>{locationNote}</ScreenText>}
      </ScreenCard>
    </ScreenLayout>;
  }

  if (!presentation) return null;
  return <>
    <MeasurementResultFlow presentation={presentation} onExit={cancel} exitLabel={t('Salir', 'Exit')} onRestart={restart}
      save={{ onSave: () => void save(), busy: phase === 'saving' }}
      notices={<>
        {demoNotice}
        {lowBattery != null && <ScreenCard accent={colors.warning}>
          <Text accessibilityRole="alert" style={{ color: colors.warning, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>{t(`BATERÍA BAJA · ${lowBattery} %`, `LOW BATTERY · ${lowBattery}%`)}</Text>
          <ScreenText>{t('Carga la sonda antes de la próxima salida.', 'Charge the probe before your next trip.')}</ScreenText>
        </ScreenCard>}
      </>}
      forecast={{ days: weather?.forecast ?? [], loading: weatherLoading, capturedAt, battery: raw?.battery, latitude: coords?.latitude, longitude: coords?.longitude, accuracy: coords?.accuracy }} />
    <CalibrationReminderModal synced={saveSynced} visible={showCalibration} onClose={() => { setShowCalibration(false); onDone(); }} />
  </>;
};


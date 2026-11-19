import React, { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Text } from './AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { ProbeGlyph } from './art/ProbeGlyph';
import { AppIcon } from './AppIcon';
import { PAIR_BLUE } from './pairing/PairingArt';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { EntryButton } from './entry/EntryUI';
import { SPLASH_BACKGROUND } from './LoadingScreen';
import { useTranslation } from '../hooks/useTranslation';
import { useAppTheme } from '../hooks/useAppTheme';

const LEAF = '#C6DFB4';
/** LED de la sonda mientras conecta y mide. */
const MEASURE_GREEN = '#22C55E';
const RINGS = [0, 1, 2];
const CYCLE_MS = 2400;
// La sonda única dentro del viewBox de 240; el LED animado se alinea con el de ProbeGlyph (-10, 14, radio 4).
const PROBE_X = 120, PROBE_Y = 72, PROBE_SCALE = 0.92;
const LED_DX = -10, LED_DY = 14, LED_R = 4;

/** Una onda que nace en el centro y se desvanece al crecer. */
function Ring({ progress, size, ellipse, color }: { progress: SharedValue<number>; size: number; ellipse: boolean; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 1], [0, 0.8, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.25, 1]) }],
  }));
  const h = ellipse ? size * 0.42 : size;
  return <Animated.View style={[{ position: 'absolute', width: size, height: h, left: -size / 2, top: -h / 2 }, style]}>
    <Svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}>
      {ellipse
        ? <Ellipse cx={size / 2} cy={h / 2} rx={size / 2 - 2} ry={h / 2 - 2} fill="none" stroke={color} strokeWidth="2" />
        : <Path d={`M${size * 0.18} ${size * 0.42}A${size * 0.4} ${size * 0.4} 0 0 1 ${size * 0.82} ${size * 0.42}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />}
    </Svg>
  </Animated.View>;
}

function useWaves(reduced: boolean) {
  const a = useSharedValue(0); const b = useSharedValue(0); const c = useSharedValue(0);
  const all = [a, b, c];
  useEffect(() => {
    all.forEach((value, i) => {
      if (reduced) { value.value = 0.45 + i * 0.2; return; }
      value.value = 0;
      value.value = withDelay(i * (CYCLE_MS / RINGS.length), withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.out(Easing.quad) }), -1, false));
    });
  }, [reduced]);
  return all;
}

/** Gotas de humedad en el suelo (viewBox de 240) que se encienden y apagan mientras se lee. */
const DROPS = [{ x: 70, y: 162, r: 3.6, delay: 0 }, { x: 174, y: 182, r: 3.6, delay: 600 }, { x: 88, y: 200, r: 3, delay: 600 }, { x: 160, y: 152, r: 3, delay: 0 }];
const WATER = '#6FB7F0';

function Drop({ x, y, r, delay, u, reduced }: { x: number; y: number; r: number; delay: number; u: number; reduced: boolean }) {
  const glow = useSharedValue(0.6);
  useEffect(() => {
    if (reduced) { glow.value = 0.8; return; }
    glow.value = 0.3;
    glow.value = withDelay(delay, withRepeat(withTiming(0.95, { duration: 800, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduced]);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return <Animated.View style={[{ position: 'absolute', left: (x - r) * u, top: (y - r) * u, width: 2 * r * u, height: 2 * r * u, borderRadius: r * u, backgroundColor: WATER }, style]} />;
}

/**
 * Sonda enterrada vista en corte. Al conectar, ondas de Bluetooth salen de la cabeza
 * hacia arriba; al leer, ondas azules y verdes recorren el suelo alrededor de los
 * electrodos y se encienden gotas de humedad. El LED parpadea en `led` (verde al
 * medir, azul mientras se busca una sonda en modo PAIR). Con «reducir movimiento»
 * todo queda quieto.
 */
function ProbeReadingArt({ reading, size, led: ledColor }: { reading: boolean; size: number; led: string }) {
  const reduced = useReducedMotion();
  const waves = useWaves(reduced);
  const led = useSharedValue(1);
  useEffect(() => {
    if (reduced) { led.value = 1; return; }
    led.value = withRepeat(withTiming(0.15, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduced]);
  const ledStyle = useAnimatedStyle(() => ({ opacity: led.value }));
  const u = size / 240;
  // Centro de las ondas: sobre la cabeza de la sonda al conectar, entre los electrodos al leer.
  const center = reading ? { x: 120 * u, y: 172 * u } : { x: 120 * u, y: 60 * u };
  const ringColor = (i: number) => reading ? (i % 2 ? LEAF : WATER) : LEAF;
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Circle cx="120" cy="120" r="116" fill="#17392C" />
      <Circle cx="120" cy="120" r="116" fill="none" stroke="#3B5646" strokeWidth="1" />
      <Path d="M8 132Q64 118 120 132T232 128A116 116 0 0 1 8 132Z" fill="#355B41" />
      <Path d="M18 166Q70 154 120 168T224 162A116 116 0 0 1 18 166Z" fill="#6B6A45" />
      <Path d="M44 204Q84 194 120 206T198 202A116 116 0 0 1 44 204Z" fill="#8A6A4A" />
      {[[52, 150], [176, 146], [70, 186], [168, 190], [96, 214], [150, 222]].map(([x, y]) => <Circle key={`${x}`} cx={x} cy={y} r="2" fill="#A08661" />)}
      {/* LED apagado en el dibujo: el que parpadea encima lleva el color. */}
      <ProbeGlyph x={PROBE_X} y={PROBE_Y} scale={PROBE_SCALE} pinLength={72} pinOpacity={0.85} />
      <Path d="M58 128l7-11 7 11M170 124l6-10 6 10" stroke={LEAF} strokeWidth="2" fill="none" strokeLinecap="round" />
    </Svg>
    {reading && DROPS.map(drop => <Drop key={`${drop.x}`} {...drop} u={u} reduced={reduced} />)}
    <Animated.View style={[{ position: 'absolute', left: (PROBE_X + LED_DX * PROBE_SCALE - LED_R * PROBE_SCALE) * u, top: (PROBE_Y + LED_DY * PROBE_SCALE - LED_R * PROBE_SCALE) * u,
      width: 2 * LED_R * PROBE_SCALE * u, height: 2 * LED_R * PROBE_SCALE * u, borderRadius: LED_R * PROBE_SCALE * u, backgroundColor: ledColor }, ledStyle]} />
    <View style={{ position: 'absolute', left: center.x, top: center.y }}>
      {RINGS.map(i => <Ring key={i} progress={waves[i]} size={(reading ? 190 : 150) * u} ellipse={reading} color={ringColor(i)} />)}
    </View>
  </View>;
}

/** Fichas de avance de la medición: «Conectando» y después «Conectada → Leyendo». */
function MeasureSteps({ reading }: { reading: boolean }) {
  const { t } = useTranslation();
  const { isDark, colors } = useAppTheme();
  const reduced = useReducedMotion();
  const dot = useSharedValue(1);
  useEffect(() => {
    if (reduced) { dot.value = 1; return; }
    dot.value = withRepeat(withTiming(0.2, { duration: 500, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduced]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value }));
  const activeBg = isDark ? LEAF : colors.primary;
  const activeFg = isDark ? '#12281F' : '#FFFFFF';
  const chip = { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 } as const;
  const active = (label: string) => <View style={[chip, { backgroundColor: activeBg }]}>
    <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: activeFg }, dotStyle]} />
    <Text style={{ fontSize: 13, fontWeight: '700', color: activeFg }}>{label}</Text>
  </View>;
  const label = reading ? t('Paso 2 de 2: leyendo', 'Step 2 of 2: reading') : t('Paso 1 de 2: conectando', 'Step 1 of 2: connecting');
  return <View accessible accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
    {reading ? <>
      <View style={[chip, { backgroundColor: isDark ? '#1C3528' : colors.tintSuccess }]}>
        <AppIcon name="check" size={14} color={isDark ? '#7FD1A0' : colors.primary} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#C4D4C9' : colors.primary }}>{t('Conectada', 'Connected')}</Text>
      </View>
      <View style={{ width: 18, height: 2, backgroundColor: isDark ? '#3B5646' : colors.border }} />
      {active(t('Leyendo', 'Reading'))}
    </> : active(t('Conectando', 'Connecting'))}
  </View>;
}

/** Conexión y lectura de la sonda: la sonda en corte, qué pasa y una salida (Cancelar). */
export function MeasurementLoading({ reading, deviceName, onCancel }: { reading: boolean; deviceName: string; onCancel: () => void }) {
  const { t } = useTranslation();
  return <ProbeWait reading={reading} eyebrow={deviceName} onCancel={onCancel} steps={<MeasureSteps reading={reading} />}
    title={reading ? t('Leyendo el suelo', 'Reading the soil') : t('Conectando con la sonda', 'Connecting to the probe')}
    detail={reading ? t('Mantén la sonda enterrada, recta y quieta.', 'Keep the probe in the soil, straight and still.') : t('Mantenla encendida y a menos de 2 metros del teléfono.', 'Keep it on and within 2 meters of the phone.')} />;
}

/**
 * Espera con la sonda animada: ondas de Bluetooth (conectar, buscar) o en el suelo (leer).
 * `pairing` pinta el LED en azul, como el de la sonda con la ventana PAIR abierta.
 */
export function ProbeWait({ reading, pairing = false, eyebrow, title, detail, steps, onCancel }: {
  reading: boolean; pairing?: boolean; eyebrow: string; title: string; detail: string; steps?: React.ReactNode; onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const { isDark, colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const size = Math.max(160, Math.min(width - 96, height * 0.36, 300));
  // La ilustración conserva su verde; el fondo y los textos siguen el tema.
  return <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? SPLASH_BACKGROUND : colors.background }}>
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLabel={title}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 28 }}>
      <ProbeReadingArt reading={reading} size={size} led={pairing ? PAIR_BLUE : MEASURE_GREEN} />
      <View style={{ gap: 8, maxWidth: 360 }}>
        {steps && <View style={{ marginBottom: 6 }}>{steps}</View>}
        <Text style={{ color: isDark ? '#6EE7B7' : colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.6, textAlign: 'center' }}>{eyebrow.toUpperCase()}</Text>
        <Text accessibilityLiveRegion="polite" style={{ color: isDark ? '#FFFFFF' : colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
        <Text style={{ color: isDark ? '#C4D4C9' : colors.textSecondary, fontSize: 16, lineHeight: 24, textAlign: 'center' }}>{detail}</Text>
      </View>
    </View>
    {onCancel && <View style={{ paddingHorizontal: 24, paddingBottom: 16, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
      <EntryButton secondary label={t('Cancelar', 'Cancel')} onPress={onCancel} />
    </View>}
  </SafeAreaView>;
}

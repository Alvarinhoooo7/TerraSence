import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { EntryButton } from './entry/EntryUI';
import { SPLASH_BACKGROUND } from './LoadingScreen';
import { useTranslation } from '../hooks/useTranslation';

const LEAF = '#C6DFB4';
const RINGS = [0, 1, 2];
const CYCLE_MS = 2400;

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

/**
 * Sonda enterrada vista en corte. Al conectar, ondas de Bluetooth salen de la cabeza
 * hacia arriba; al leer, ondas recorren el suelo alrededor de los electrodos. Con
 * «reducir movimiento» las ondas quedan quietas.
 */
function ProbeReadingArt({ reading, size }: { reading: boolean; size: number }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => listener.remove();
  }, []);
  const waves = useWaves(reduced);
  const led = useSharedValue(1);
  useEffect(() => {
    if (reduced) { led.value = 1; return; }
    led.value = withRepeat(withTiming(0.25, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduced]);
  const ledStyle = useAnimatedStyle(() => ({ opacity: led.value }));
  const u = size / 240;
  // Centro de las ondas: sobre la cabeza de la sonda al conectar, entre los electrodos al leer.
  const center = reading ? { x: 120 * u, y: 172 * u } : { x: 120 * u, y: 60 * u };
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Circle cx="120" cy="120" r="116" fill="#17392C" />
      <Circle cx="120" cy="120" r="116" fill="none" stroke="#3B5646" strokeWidth="1" />
      <Path d="M8 132Q64 118 120 132T232 128A116 116 0 0 1 8 132Z" fill="#355B41" />
      <Path d="M18 166Q70 154 120 168T224 162A116 116 0 0 1 18 166Z" fill="#6B6A45" />
      <Path d="M44 204Q84 194 120 206T198 202A116 116 0 0 1 44 204Z" fill="#8A6A4A" />
      {[[52, 150], [176, 146], [70, 186], [168, 190], [96, 214], [150, 222]].map(([x, y]) => <Circle key={`${x}`} cx={x} cy={y} r="2" fill="#A08661" />)}
      <Path d="M108 120V190M120 120V194M132 120V190" stroke={LEAF} strokeWidth="4" strokeLinecap="round" opacity={0.85} />
      <Rect x="98" y="72" width="44" height="50" rx="13" fill={LEAF} />
      <Rect x="109" y="82" width="22" height="14" rx="4" fill="#1F5B3F" />
      <Path d="M58 128l7-11 7 11M170 124l6-10 6 10" stroke={LEAF} strokeWidth="2" fill="none" strokeLinecap="round" />
    </Svg>
    <Animated.View style={[{ position: 'absolute', left: 114 * u, top: 103 * u, width: 12 * u, height: 12 * u, borderRadius: 6 * u, backgroundColor: '#22C55E' }, ledStyle]} />
    <View style={{ position: 'absolute', left: center.x, top: center.y }}>
      {RINGS.map(i => <Ring key={i} progress={waves[i]} size={(reading ? 190 : 150) * u} ellipse={reading} color={reading ? '#6EE7B7' : LEAF} />)}
    </View>
  </View>;
}

/** Conexión y lectura de la sonda: la sonda en corte, qué pasa y una salida (Cancelar). */
export function MeasurementLoading({ reading, deviceName, onCancel }: { reading: boolean; deviceName: string; onCancel: () => void }) {
  const { t } = useTranslation();
  return <ProbeWait reading={reading} eyebrow={deviceName} onCancel={onCancel}
    title={reading ? t('Leyendo el suelo', 'Reading the soil') : t('Conectando con la sonda', 'Connecting to the probe')}
    detail={reading ? t('Mantén la sonda enterrada, recta y quieta.', 'Keep the probe in the soil, straight and still.') : t('Mantenla encendida y a menos de 2 metros del teléfono.', 'Keep it on and within 2 meters of the phone.')} />;
}

/** Espera con la sonda animada: ondas de Bluetooth (conectar, buscar) o en el suelo (leer). */
export function ProbeWait({ reading, eyebrow, title, detail, onCancel }: { reading: boolean; eyebrow: string; title: string; detail: string; onCancel?: () => void }) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const size = Math.max(160, Math.min(width - 96, height * 0.36, 300));
  return <SafeAreaView style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND }}>
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLabel={title}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 28 }}>
      <ProbeReadingArt reading={reading} size={size} />
      <View style={{ gap: 8, maxWidth: 360 }}>
        <Text style={{ color: '#6EE7B7', fontSize: 12, fontWeight: '700', letterSpacing: 1.6, textAlign: 'center' }}>{eyebrow.toUpperCase()}</Text>
        <Text accessibilityLiveRegion="polite" style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
        <Text style={{ color: '#C4D4C9', fontSize: 16, lineHeight: 24, textAlign: 'center' }}>{detail}</Text>
      </View>
    </View>
    {onCancel && <View style={{ paddingHorizontal: 24, paddingBottom: 16, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
      <EntryButton secondary label={t('Cancelar', 'Cancel')} onPress={onCancel} />
    </View>}
  </SafeAreaView>;
}

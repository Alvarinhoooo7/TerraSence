import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedProps, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { ProbeGlyph } from './art/ProbeGlyph';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Despertar la sonda: la misma sonda grande de «Prepara tu sonda» (vinculación), ya enterrada.
 * Un ciclo de 4,8 s cuenta lo que hará el equipo real: duerme, recibe dos toques en PAIR, enciende
 * la luz verde un segundo con un pitido y queda despierta. Con «reducir movimiento» queda quieta
 * en el estado final: despierta, luz verde y los dos toques marcados.
 */
const BG = '#17392C';
const LEAF = '#C6DFB4';
const MUTED = '#C4D4C9';
/** LED de la sonda al despertar; el mismo verde de la medición. */
const WAKE_GREEN = '#22C55E';
const CYCLE_MS = 4800;

const W = 342, H = 232;
const PX = 171, PY = 22, SCALE = 1.9;
/** LED (-10, 14, radio 4) y botón PAIR (1, 9, 15 × 10) de ProbeGlyph, llevados a la escala de la ilustración. */
const LED = { cx: PX - 10 * SCALE, cy: PY + 14 * SCALE, r: 4 * SCALE };
/** Fila del chip de estado: sobre el suelo, abajo a la izquierda. */
const CHIP_Y = H - 40;
const PAIR = { x: PX + 1 * SCALE, y: PY + 9 * SCALE, w: 15 * SCALE, h: 10 * SCALE, cx: PX + 8.5 * SCALE, cy: PY + 14 * SCALE };

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);

/** Opacidad por tramos del ciclo (progreso 0–1), sin extrapolar fuera de los tramos. */
function useOpacity(p: SharedValue<number>, input: number[], output: number[]) {
  return useAnimatedProps(() => ({ opacity: interpolate(p.value, input, output, Extrapolation.CLAMP) }));
}

/** Onda que sale de PAIR en cada toque. */
function useTapRing(p: SharedValue<number>, start: number) {
  return useAnimatedProps(() => ({
    r: interpolate(p.value, [start, start + 0.09], [12, 30], Extrapolation.CLAMP),
    opacity: interpolate(p.value, [start, start + 0.01, start + 0.09], [0, 0.95, 0], Extrapolation.CLAMP),
  }));
}

export function WakeProbeArt() {
  const reduced = useReducedMotion();
  const { t } = useTranslation();
  const p = useSharedValue(0.5);
  useEffect(() => {
    if (reduced) { p.value = 0.5; return; }
    p.value = 0;
    p.value = withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }), -1, false);
  }, [reduced]);

  const probe = useOpacity(p, [0.4, 0.43, 0.94, 0.97], [0.55, 1, 1, 0.55]);
  const z1 = useOpacity(p, [0, 0.03, 0.12, 0.2], [0, 0.9, 0.9, 0]);
  const z2 = useOpacity(p, [0.07, 0.1, 0.19, 0.25], [0, 0.9, 0.9, 0]);
  const ring1 = useTapRing(p, 0.25);
  const ring2 = useTapRing(p, 0.325);
  const press = useOpacity(p, [0.25, 0.265, 0.285, 0.325, 0.34, 0.36], [0, 0.7, 0, 0, 0.7, 0]);
  const dot1 = useOpacity(p, [0.255, 0.265, 0.94, 0.97], [0, 1, 1, 0]);
  const dot2 = useOpacity(p, [0.33, 0.34, 0.94, 0.97], [0, 1, 1, 0]);
  const led = useOpacity(p, [0.4, 0.41, 0.61, 0.625], [0, 1, 1, 0]);
  const glow = useAnimatedProps(() => ({
    r: interpolate(p.value, [0.4, 0.61], [8, 24], Extrapolation.CLAMP),
    opacity: interpolate(p.value, [0.4, 0.43, 0.61, 0.63], [0, 0.55, 0.35, 0], Extrapolation.CLAMP),
  }));
  const beep = useOpacity(p, [0.405, 0.42, 0.55, 0.57], [0, 1, 1, 0]);
  const asleep = useOpacity(p, [0.4, 0.415, 0.94, 0.97], [1, 0, 0, 1]);
  const awake = useOpacity(p, [0.4, 0.415, 0.94, 0.97], [0, 1, 1, 0]);

  const asleepLabel = t('Dormida', 'Asleep');
  const awakeLabel = t('Despierta', 'Awake');
  // Ancho de cada píldora según su texto (12,5 px en negrita ≈ 7,4 px por letra).
  const pill = (label: string) => 34 + label.length * 7.4;

  return <View accessible={false} importantForAccessibility="no-hide-descendants"
    style={{ width: '100%', aspectRatio: W / H, borderRadius: 18, overflow: 'hidden', backgroundColor: BG }}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <Circle cx={PX} cy="80" r="120" fill="none" stroke="#2C5440" strokeWidth="1" />
      <Path d="M0 150Q85 138 171 150T342 146V232H0Z" fill="#355B41" />
      <Path d="M0 180Q85 170 171 182T342 176V232H0Z" fill="#6B6A45" />
      <Path d="M0 208Q85 200 171 210T342 206V232H0Z" fill="#8A6A4A" />
      {[[300, 192], [262, 222], [236, 200]].map(([x, y]) => <Circle key={`${x}`} cx={x} cy={y} r="2" fill="#A08661" />)}
      <Path d="M58 146l7-11 7 11M270 142l6-10 6 10" stroke={LEAF} strokeWidth="2" fill="none" strokeLinecap="round" />

      <AnimatedG animatedProps={probe}>
        <ProbeGlyph x={PX} y={PY} scale={SCALE} pinLength={46} pinOpacity={0.85} />
      </AnimatedG>
      <AnimatedCircle cx={LED.cx} cy={LED.cy} fill={WAKE_GREEN} animatedProps={glow} />
      <AnimatedCircle cx={LED.cx} cy={LED.cy} r={LED.r} fill={WAKE_GREEN} animatedProps={led} />
      {/* El botón se oscurece en cada toque. */}
      <AnimatedRect x={PAIR.x} y={PAIR.y} width={PAIR.w} height={PAIR.h} rx={PAIR.h / 2} fill="#0B1F17" animatedProps={press} />
      <AnimatedCircle cx={PAIR.cx} cy={PAIR.cy} fill="none" stroke="#FFFFFF" strokeWidth="2" animatedProps={ring1} />
      <AnimatedCircle cx={PAIR.cx} cy={PAIR.cy} fill="none" stroke="#FFFFFF" strokeWidth="2" animatedProps={ring2} />

      <AnimatedG animatedProps={beep}>
        <Path d="M210 14q7 8 0 16M219 8q12 14 0 28" stroke={LEAF} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </AnimatedG>
      <AnimatedG animatedProps={z1}>
        <Path d="M198 8h9l-9 10h9" stroke={MUTED} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </AnimatedG>
      <AnimatedG animatedProps={z2}>
        <Path d="M212 -1h6l-6 7h6" transform="translate(0 4)" stroke={MUTED} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </AnimatedG>

      {/* Rótulos: luz a la izquierda, PAIR a la derecha, con su línea guía. */}
      <Path d={`M${LED.cx - 12} ${LED.cy}H96`} stroke={MUTED} strokeWidth="1.4" />
      <SvgText x="88" y={LED.cy - 4} fill="#FFFFFF" fontSize="13" fontWeight="bold" textAnchor="end">{t('Luz verde', 'Green light')}</SvgText>
      <SvgText x="88" y={LED.cy + 13} fill={MUTED} fontSize="12" textAnchor="end">{t('y un pitido', 'and a beep')}</SvgText>
      <Path d={`M${PAIR.cx + 24} ${PAIR.cy}H256`} stroke={MUTED} strokeWidth="1.4" />
      <SvgText x="262" y={PAIR.cy - 4} fill="#FFFFFF" fontSize="13" fontWeight="bold">PAIR</SvgText>
      <SvgText x="262" y={PAIR.cy + 13} fill={MUTED} fontSize="12">{t('2 toques', '2 taps')}</SvgText>
      <Circle cx="267" cy="75" r="4" fill="#3F604B" />
      <Circle cx="280" cy="75" r="4" fill="#3F604B" />
      <AnimatedCircle cx="267" cy="75" r="4" fill="#FFFFFF" animatedProps={dot1} />
      <AnimatedCircle cx="280" cy="75" r="4" fill="#FFFFFF" animatedProps={dot2} />

      {/* Estado de la sonda, abajo a la izquierda sobre el suelo: lejos de los rótulos de arriba. */}
      <AnimatedG animatedProps={asleep}>
        <Rect x="14" y={CHIP_Y} width={pill(asleepLabel)} height="26" rx="13" fill="#24493A" />
        <Circle cx="28" cy={CHIP_Y + 13} r="4" fill="#7B8A82" />
        <SvgText x="38" y={CHIP_Y + 17.5} fill={MUTED} fontSize="12.5" fontWeight="bold">{asleepLabel}</SvgText>
      </AnimatedG>
      <AnimatedG animatedProps={awake}>
        <Rect x="14" y={CHIP_Y} width={pill(awakeLabel)} height="26" rx="13" fill={LEAF} />
        <Circle cx="28" cy={CHIP_Y + 13} r="4" fill={WAKE_GREEN} />
        <SvgText x="38" y={CHIP_Y + 17.5} fill="#12281F" fontSize="12.5" fontWeight="bold">{awakeLabel}</SvgText>
      </AnimatedG>
    </Svg>
  </View>;
}

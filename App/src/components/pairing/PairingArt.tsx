import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

/**
 * Ilustraciones de la vinculación, con la paleta de la bienvenida: fondo verde
 * oscuro en ambos temas, la sonda en verde claro y el LED azul de la ventana PAIR.
 */
const BG = '#17392C';
const LEAF = '#C6DFB4';
const PAPER = '#EDE8D9';
const SCREEN = '#D8E6CD';
const BLUE = '#3B9BF5';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => listener.remove();
  }, []);
  return reduced;
}

function Frame({ children, ratio = 360 / 170 }: React.PropsWithChildren<{ ratio?: number }>) {
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: '100%', aspectRatio: ratio, borderRadius: 18, overflow: 'hidden', backgroundColor: BG }}>
    <Svg width="100%" height="100%" viewBox="0 0 360 170" preserveAspectRatio="xMidYMid meet">
      <Circle cx="310" cy="20" r="80" fill="none" stroke="#3F604B" strokeWidth="1" />
      {children}
    </Svg>
  </View>;
}

function Ground() {
  return <>
    <Path d="M0 128Q90 112 180 128T360 122V170H0Z" fill="#355B41" />
    <Path d="M0 152Q90 140 180 155T360 148V170H0Z" fill="#6B6A45" />
  </>;
}

/** Sonda de pie sobre el suelo; `x` es su centro. */
function Probe({ x, led = BLUE, pair = false }: { x: number; led?: string | null; pair?: boolean }) {
  return <G>
    <Path d={`M${x - 12} 98V146M${x} 98V150M${x + 12} 98V146`} stroke={LEAF} strokeWidth="4" strokeLinecap="round" />
    <Rect x={x - 24} y="44" width="48" height="58" rx="14" fill={LEAF} />
    <Rect x={x - 13} y="54" width="26" height="15" rx="4" fill="#1F5B3F" />
    {led ? <Circle cx={x} cy="84" r="5" fill={led} /> : null}
    {pair ? <>
      <Rect x={x + 22} y="70" width="10" height="18" rx="3" fill="#8FB57E" />
      <SvgText x={x + 38} y="83" fill={LEAF} fontSize="11" fontWeight="bold">PAIR</SvgText>
    </> : null}
  </G>;
}

function Phone({ x, y = 36, w = 62, h = 108, children }: React.PropsWithChildren<{ x: number; y?: number; w?: number; h?: number }>) {
  return <G>
    <Rect x={x} y={y} width={w} height={h} rx="12" fill={PAPER} />
    <Rect x={x + 6} y={y + 10} width={w - 12} height={h - 22} rx="6" fill={SCREEN} />
    <Rect x={x + w / 2 - 8} y={y + h - 8} width="16" height="3" rx="1.5" fill="#B9B3A2" />
    {children}
  </G>;
}

/** QR esquemático: tres marcas de posición y un patrón fijo. */
function Qr({ x, y, size }: { x: number; y: number; size: number }) {
  const cell = size / 9;
  const finder = (fx: number, fy: number) => <G key={`${fx}-${fy}`}>
    <Rect x={x + fx * cell} y={y + fy * cell} width={cell * 3} height={cell * 3} fill="#1F5B3F" />
    <Rect x={x + (fx + 0.7) * cell} y={y + (fy + 0.7) * cell} width={cell * 1.6} height={cell * 1.6} fill={SCREEN} />
  </G>;
  const bits = [[4, 0], [4, 2], [5, 1], [0, 4], [2, 4], [4, 4], [6, 4], [8, 4], [4, 6], [5, 5], [7, 6], [6, 7], [8, 8], [4, 8], [5, 7], [7, 5]];
  return <G>
    {finder(0, 0)}{finder(6, 0)}{finder(0, 6)}
    {bits.map(([bx, by]) => <Rect key={`${bx}.${by}`} x={x + bx * cell} y={y + by * cell} width={cell} height={cell} fill="#1F5B3F" />)}
  </G>;
}

/** Opción «Tengo una invitación»: un teléfono muestra el QR y el otro lo escanea. */
export function InviteArt() {
  return <Frame>
    <Phone x={82}><Qr x={93} y={62} size={40} /></Phone>
    <Path d="M160 90h34" stroke={LEAF} strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
    <Path d="M190 83l8 7-8 7" stroke={LEAF} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Phone x={216}>
      <Path d="M230 60v-6h6M264 54h6v6M270 112v6h-6M236 118h-6v-6" stroke="#1F5B3F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Circle cx="250" cy="86" r="13" fill="#2C7A4E" />
      <Path d="M244 86l4 4 8-8" stroke="#FFFFFF" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Phone>
  </Frame>;
}

/** Opción «Configurar una sonda nueva»: la sonda emite por Bluetooth hacia el teléfono. */
export function NewProbeArt() {
  return <Frame>
    <Ground />
    <Probe x={130} />
    <Path d="M168 62q10 12 0 24M180 54q18 20 0 40M192 46q26 28 0 56" stroke={BLUE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <Phone x={236} y={40} w={56} h={96}>
      <Path d="M258 76l10 10-5 5V71l5 5-10 10" stroke="#1F5B3F" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Phone>
  </Frame>;
}

/** Un arco de Bluetooth que aparece cuando la onda pasa por él y se apaga al alejarse. */
function useArc(wave: SharedValue<number>, from: number, reduced: boolean) {
  return useAnimatedProps(() => ({ opacity: reduced ? 0.9 : Math.max(0, Math.min(1, (wave.value - from) * 3)) * (1 - wave.value * 0.6) }));
}

/**
 * Preparar la sonda: el dedo mantiene PAIR, el LED azul parpadea y el teléfono
 * espera a menos de 2 metros. Con «reducir movimiento» queda quieta.
 */
export function PairPrepareArt() {
  const reduced = useReducedMotion();
  const led = useSharedValue(1);
  const wave = useSharedValue(0);
  useEffect(() => {
    if (reduced) { led.value = 1; wave.value = 1; return; }
    led.value = withRepeat(withSequence(withTiming(0.15, { duration: 260 }), withTiming(1, { duration: 260 })), -1, false);
    wave.value = 0;
    wave.value = withRepeat(withDelay(300, withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) })), -1, false);
  }, [reduced]);
  const ledProps = useAnimatedProps(() => ({ opacity: led.value }));
  const a1 = useArc(wave, 0, reduced); const a2 = useArc(wave, 0.2, reduced); const a3 = useArc(wave, 0.4, reduced);
  return <Frame>
    <Ground />
    <Probe x={96} led={null} pair />
    <AnimatedCircle cx={96} cy={84} r={6} fill={BLUE} animatedProps={ledProps} />
    {/* Dedo sobre PAIR */}
    <Path d="M118 48c0-6 10-6 10 0v24c0 4-10 4-10 0Z" fill="#E8C9A8" />
    <AnimatedPath d="M168 70q8 10 0 20" stroke={BLUE} strokeWidth="2.5" fill="none" strokeLinecap="round" animatedProps={a1} />
    <AnimatedPath d="M178 62q16 18 0 36" stroke={BLUE} strokeWidth="2.5" fill="none" strokeLinecap="round" animatedProps={a2} />
    <AnimatedPath d="M188 54q24 26 0 52" stroke={BLUE} strokeWidth="2.5" fill="none" strokeLinecap="round" animatedProps={a3} />
    <Phone x={262} y={44} w={52} h={88} />
    {/* Distancia: menos de 2 metros */}
    <Path d="M96 160H288M96 154v12M288 154v12" stroke={PAPER} strokeWidth="1.6" strokeLinecap="round" />
    <Rect x="168" y="150" width="48" height="20" rx="10" fill={BG} />
    <SvgText x="192" y="164" fill={PAPER} fontSize="12" fontWeight="bold" textAnchor="middle">≤ 2 m</SvgText>
  </Frame>;
}

/** Sonda encontrada: la sonda con un visto verde. */
export function ProbeFoundArt() {
  return <Frame>
    <Ground />
    <Probe x={180} led="#22C55E" />
    <Circle cx="222" cy="44" r="18" fill="#2C7A4E" />
    <Path d="M213 44l6 6 12-12" stroke="#FFFFFF" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {[[110, 50, '#F5D46A'], [128, 28, '#F2B8C6'], [258, 76, '#F5D46A'], [270, 40, LEAF], [96, 86, LEAF], [244, 98, '#F2B8C6']].map(([cx, cy, fill]) =>
      <Circle key={`${cx}`} cx={cx as number} cy={cy as number} r="4" fill={fill as string} />)}
  </Frame>;
}

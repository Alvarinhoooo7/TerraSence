import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { ProbeGlyph } from '../art/ProbeGlyph';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * Ilustraciones de la vinculación, con la paleta de la bienvenida: fondo verde
 * oscuro en ambos temas, la sonda en verde claro y el LED azul de la ventana PAIR.
 */
const BG = '#17392C';
const LEAF = '#C6DFB4';
const PAPER = '#EDE8D9';
const SCREEN = '#D8E6CD';
/** Azul del LED de la ventana PAIR; la espera «Buscando tu sonda» usa el mismo. */
export const PAIR_BLUE = '#3B9BF5';
const BLUE = PAIR_BLUE;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Marco de las ilustraciones; por omisión el viewBox de 360 × 170 con un arco decorativo arriba a la derecha. */
function Frame({ children, width = 360, height = 170, decor }: React.PropsWithChildren<{ width?: number; height?: number; decor?: React.ReactNode }>) {
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: '100%', aspectRatio: width / height, borderRadius: 18, overflow: 'hidden', backgroundColor: BG }}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {decor ?? <Circle cx="310" cy="20" r="80" fill="none" stroke="#3F604B" strokeWidth="1" />}
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

const PROBE_TOP = 42;

/** Sonda de pie sobre el suelo; `x` es su centro. */
function Probe({ x, led = BLUE }: { x: number; led?: string }) {
  return <ProbeGlyph x={x} y={PROBE_TOP} pinLength={50} led={led} />;
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

/*
 * Preparar la sonda: la sonda en grande (1,9×), con el LED y el botón PAIR rotulados.
 * Posiciones en el viewBox de 342 × 232: la sonda se centra en x = 171 y su cuerpo parte en y = 22.
 */
const PREP_W = 342, PREP_H = 232;
const PREP_X = 171, PREP_Y = 22, PREP_SCALE = 1.9;
/** LED (-10, 14, radio 4) y centro del botón PAIR (8,5, 14) de ProbeGlyph, llevados a la escala de la ilustración. */
const PREP_LED = { cx: PREP_X - 10 * PREP_SCALE, cy: PREP_Y + 14 * PREP_SCALE, r: 4 * PREP_SCALE };
const PREP_PAIR = { cx: PREP_X + 8.5 * PREP_SCALE, cy: PREP_Y + 14 * PREP_SCALE };

/**
 * Preparar la sonda: el LED azul parpadea y un aro late sobre PAIR, con rótulos
 * para no tener que adivinar dónde mirar. Con «reducir movimiento» queda quieta.
 */
export function PairPrepareArt() {
  const reduced = useReducedMotion();
  const { t } = useTranslation();
  const led = useSharedValue(1);
  const ring = useSharedValue(0);
  useEffect(() => {
    if (reduced) { led.value = 1; ring.value = 0.5; return; }
    led.value = withRepeat(withSequence(withTiming(0.15, { duration: 450, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 450, easing: Easing.inOut(Easing.quad) })), -1, false);
    ring.value = 0;
    ring.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [reduced]);
  const ledProps = useAnimatedProps(() => ({ opacity: led.value }));
  const ringProps = useAnimatedProps(() => ({ r: 12 + 18 * ring.value, opacity: 0.9 * (1 - ring.value) }));
  return <Frame width={PREP_W} height={PREP_H} decor={<Circle cx={PREP_X} cy="80" r="120" fill="none" stroke="#2C5440" strokeWidth="1" />}>
    <ProbeGlyph x={PREP_X} y={PREP_Y} scale={PREP_SCALE} pinLength={46} />
    <AnimatedCircle {...PREP_LED} fill={BLUE} animatedProps={ledProps} />
    <AnimatedCircle cx={PREP_PAIR.cx} cy={PREP_PAIR.cy} fill="none" stroke="#FFFFFF" strokeWidth="2" animatedProps={ringProps} />
    {/* Rótulos: LED a la izquierda, PAIR a la derecha, con su línea guía. */}
    <Path d={`M${PREP_LED.cx - 12} ${PREP_LED.cy}H96`} stroke="#C4D4C9" strokeWidth="1.4" />
    <SvgText x="88" y={PREP_LED.cy - 4} fill="#FFFFFF" fontSize="13" fontWeight="bold" textAnchor="end">{t('LED azul', 'Blue LED')}</SvgText>
    <SvgText x="88" y={PREP_LED.cy + 13} fill="#C4D4C9" fontSize="12" textAnchor="end">{t('parpadea', 'blinks')}</SvgText>
    <Path d={`M${PREP_PAIR.cx + 24} ${PREP_PAIR.cy}H256`} stroke="#C4D4C9" strokeWidth="1.4" />
    <SvgText x="262" y={PREP_PAIR.cy - 4} fill="#FFFFFF" fontSize="13" fontWeight="bold">PAIR</SvgText>
    <SvgText x="262" y={PREP_PAIR.cy + 13} fill="#C4D4C9" fontSize="12">{t('3 segundos', '3 seconds')}</SvgText>
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

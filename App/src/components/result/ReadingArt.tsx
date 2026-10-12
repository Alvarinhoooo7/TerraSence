import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Ilustraciones de las páginas de lecturas del resultado (suelo, nutrientes y ambiente).
// Misma paleta que la bienvenida y las etapas. Ocupan el espacio libre entre el texto y
// las tarjetas: el alto lo decide la pantalla y el dibujo se centra sin deformarse. El suelo
// se dibuja más allá del cuadro para que, si sobra alto o ancho, no queden franjas vacías.

const BG = '#17392C';
const LEAF = '#C6DFB4';
const GRASS = '#355B41';
const TOPSOIL = '#6B6A45';
const SUBSOIL = '#54472F';
const WATER = '#6FB7F0';
const SUN = '#E3B341';
const W = 360, H = 130;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedLine = Animated.createAnimatedComponent(Line);

/** Valor de 0 a 1 que se repite con su propio desfase; fijo en `rest` con «reducir movimiento». */
function useLoop(duration: number, delay: number, reduced: boolean, rest = .5, mirror = false) {
  const value = useSharedValue(rest);
  useEffect(() => {
    if (reduced) { value.value = rest; return; }
    value.value = 0;
    value.value = withDelay(delay, withRepeat(mirror
      ? withSequence(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }))
      : withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false));
  }, [delay, duration, mirror, reduced, rest, value]);
  return value;
}

/** Onda que se abre desde un punto y se desvanece. */
function Pulse({ cx, cy, max, loop, color }: { cx: number; cy: number; max: number; loop: SharedValue<number>; color: string }) {
  const props = useAnimatedProps(() => ({ rx: 6 + loop.value * max, ry: 3 + loop.value * max * .45, opacity: .7 * (1 - loop.value) }));
  return <AnimatedEllipse cx={cx} cy={cy} fill="none" stroke={color} strokeWidth={1.4} animatedProps={props} />;
}

/** Llena a su contenedor, que define el alto: el dibujo no aporta alto propio. */
function Frame({ children, label }: React.PropsWithChildren<{ label: string }>) {
  return <View accessible accessibilityRole="image" accessibilityLabel={label}
    style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 20, overflow: 'hidden', backgroundColor: BG }}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">{children}</Svg>
  </View>;
}

const ground = <>
  <Path d="M-400 56H0Q90 50 180 57T360 54H760V600H-400Z" fill={GRASS} />
  <Path d="M-400 62H0Q90 58 180 64T360 61H760V600H-400Z" fill={TOPSOIL} />
  <Path d="M-400 96H0Q90 92 180 99T360 95H760V600H-400Z" fill={SUBSOIL} />
  {[[40, 108, 5], [300, 112, 4], [96, 84, 3], [262, 80, 3.5]].map(([cx, cy, r]) => <Ellipse key={`${cx}`} cx={cx} cy={cy} rx={r * 1.4} ry={r} fill="#7C6A4C" />)}
</>;

const probe = (x: number, top: number, depth: number) => <>
  <Rect x={x - 15} y={top} width={30} height={28} rx={9} fill={LEAF} />
  <Rect x={x - 8} y={top + 7} width={16} height={7} rx={3} fill="#2E5A44" />
  <Circle cx={x} cy={top + 20} r={2.6} fill="#2E5A44" />
  {[-7, 0, 7].map(dx => <Line key={dx} x1={x + dx} x2={x + dx} y1={top + 28} y2={depth} stroke={LEAF} strokeWidth={3} strokeLinecap="round" />)}
</>;

/** Gota de agua del suelo que titila. */
function Droplet({ cx, cy, delay, reduced }: { cx: number; cy: number; delay: number; reduced: boolean }) {
  const loop = useLoop(1600, delay, reduced, 1, true);
  const props = useAnimatedProps(() => ({ opacity: .35 + loop.value * .6 }));
  return <AnimatedCircle cx={cx} cy={cy} r={3.2} fill={WATER} animatedProps={props} />;
}

/** Suelo: la sonda enterrada emite ondas y el agua del suelo titila alrededor. */
export function SoilReadingArt({ label }: { label: string }) {
  const reduced = useReducedMotion();
  const a = useLoop(2200, 0, reduced, .35), b = useLoop(2200, 1100, reduced, .7);
  return <Frame label={label}>
    {ground}
    <Pulse cx={180} cy={104} max={70} loop={a} color={WATER} />
    <Pulse cx={180} cy={104} max={70} loop={b} color={LEAF} />
    {probe(180, 24, 106)}
    {[[118, 90], [238, 86], [146, 116], [216, 118]].map(([cx, cy], i) => <Droplet key={cx} cx={cx} cy={cy} delay={[0, 500, 1000, 300][i]} reduced={reduced} />)}
  </Frame>;
}

const NUTRIENTS = [{ x: 110, y: 112, letter: 'N', color: '#8FD19E' }, { x: 180, y: 120, letter: 'P', color: '#E3A1C0' }, { x: 250, y: 112, letter: 'K', color: '#E3C27A' }];

/** Partícula que sube desde un nutriente hacia las raíces y se desvanece. */
function Particle({ x, y, color, delay, reduced }: { x: number; y: number; color: string; delay: number; reduced: boolean }) {
  const loop = useLoop(2600, delay, reduced, .5);
  const props = useAnimatedProps(() => ({
    cy: y - 12 - loop.value * 30, cx: x + (180 - x) * loop.value * .55, opacity: Math.sin(loop.value * Math.PI) * .95,
  }));
  return <AnimatedCircle r={3} fill={color} animatedProps={props} />;
}

/** Nutrientes: N, P y K en el suelo, con partículas que suben hacia las raíces. */
export function NutrientReadingArt({ label }: { label: string }) {
  const reduced = useReducedMotion();
  return <Frame label={label}>
    {ground}
    {/* Planta y raíces */}
    <Path d="M180 58V24" stroke="#7FB06B" strokeWidth={3} strokeLinecap="round" />
    <Path d="M180 40C168 38 160 30 158 22C170 22 178 30 180 38ZM180 32C192 30 200 22 202 14C190 14 182 22 180 30Z" fill={LEAF} />
    <Path d="M180 58V82M180 66 160 80M180 66 200 80M180 74 166 92M180 74 194 92M160 80 150 90M200 80 210 90" stroke="#D9C9A3" strokeWidth={1.6} strokeLinecap="round" fill="none" />
    {NUTRIENTS.map((n, i) => <React.Fragment key={n.letter}>
      <Particle x={n.x} y={n.y} color={n.color} delay={i * 860} reduced={reduced} />
      <Circle cx={n.x} cy={n.y} r={9} fill={BG} stroke={n.color} strokeWidth={1.6} />
      <SvgText x={n.x} y={n.y + 4} fontSize={11} fontWeight="700" fill={n.color} textAnchor="middle">{n.letter}</SvgText>
    </React.Fragment>)}
  </Frame>;
}

/** Línea de viento que cruza y se desvanece. */
function Wind({ y, delay, rest, reduced }: { y: number; delay: number; rest: number; reduced: boolean }) {
  const loop = useLoop(2400, delay, reduced, rest);
  const props = useAnimatedProps(() => ({ x1: 20 + loop.value * 230, x2: 60 + loop.value * 230, opacity: Math.sin(loop.value * Math.PI) * .8 }));
  return <AnimatedLine y1={y} y2={y} stroke={LEAF} strokeWidth={2} strokeLinecap="round" animatedProps={props} />;
}

/** Ambiente: el sensor del equipo sobre el suelo, con sol, nubes y viento que pasan. */
export function EnvironmentReadingArt({ label }: { label: string }) {
  const reduced = useReducedMotion();
  const glow = useLoop(1800, 0, reduced, .5, true);
  const drift = useLoop(9000, 0, reduced, .3, true);
  const air = useLoop(2000, 0, reduced, .4);
  const glowProps = useAnimatedProps(() => ({ r: 18 + glow.value * 5, opacity: .18 + glow.value * .18 }));
  const cloudA = useAnimatedProps(() => ({ cx: 96 + drift.value * 40 }));
  const cloudB = useAnimatedProps(() => ({ cx: 116 + drift.value * 40 }));
  return <Frame label={label}>
    <AnimatedCircle cx={300} cy={30} fill={SUN} animatedProps={glowProps} />
    <Circle cx={300} cy={30} r={12} fill={SUN} />
    <AnimatedEllipse cy={30} rx={22} ry={10} fill="#5E7F6A" animatedProps={cloudA} />
    <AnimatedEllipse cy={24} rx={16} ry={10} fill="#6E8F79" animatedProps={cloudB} />
    {[0, 1, 2].map(i => <Wind key={i} y={30 + i * 12} delay={i * 800} rest={.4 + i * .2} reduced={reduced} />)}
    {ground}
    <Pulse cx={180} cy={44} max={34} loop={air} color={LEAF} />
    {probe(180, 30, 92)}
  </Frame>;
}

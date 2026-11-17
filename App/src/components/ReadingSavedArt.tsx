import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import Animated, { Easing, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { ProbeGlyph } from './art/ProbeGlyph';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useAppTheme } from '../hooks/useAppTheme';

// Cierre de una medición, en el estilo de «Antes de medir» (ProbeInsertArt): la sonda sale
// del suelo y queda inclinada, un paño limpia sus electrodos, un pin ocre cae sobre el punto
// medido con un rebote corto, dos ondas se abren en el suelo, titilan tres destellos y arriba
// a la derecha aparece la nube con flecha (respaldada) o un reloj (esperando conexión). Se
// reproduce una vez. Con «reducir movimiento» se muestra el estado final: pin clavado, sin
// ondas ni destellos.

const BG = '#17392C';
const LEAF = '#C6DFB4';
const CLOTH = '#E8D9A8';
const PAPER = '#EDE8D9';
const SPARK = '#F4F1D0';
const PIN_INK = '#12281F';
const VIEW = '0 0 360 200';
const layer = { position: 'absolute' as const, top: 0, right: 0, bottom: 0, left: 0 };

// Geometría (unidades del viewBox). La sonda sale en PROBE_X; el pin marca el punto medido.
const PROBE_X = 104, PROBE_Y = 26, PROBE_SCALE = 0.85, PROBE_PIN_LENGTH = 50, BURY = 62, TILT = -10;
const SPOT = { x: 244, y: 160 };
const PIN_SCALE = 1.05;
const PIN_FALL = 120;
const PIN_START = 2700;

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

/** Brillo de cuatro puntas que titila; `delay` desfasa cada uno. */
function Spark({ x, y, size, delay, color }: { x: number; y: number; size: number; delay: number; color: string }) {
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withDelay(PIN_START + 700 + delay, withRepeat(withSequence(
      withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }),
      withTiming(.25, { duration: 900, easing: Easing.inOut(Easing.sin) }),
    ), -1, true));
  }, [delay, glow]);
  const props = useAnimatedProps(() => ({ opacity: glow.value }));
  const s = size;
  return <AnimatedG animatedProps={props}>
    <Path d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`} fill={color} />
  </AnimatedG>;
}

/** Onda que se abre en el suelo desde el punto medido y se desvanece. Una sola vez. */
function Ripple({ progress, color }: { progress: { value: number }; color: string }) {
  const props = useAnimatedProps(() => ({
    rx: 60 * interpolate(progress.value, [0, 1], [.2, 1]),
    ry: 16 * interpolate(progress.value, [0, 1], [.2, 1]),
    opacity: interpolate(progress.value, [0, .2, .7, 1], [0, .9, 0, 0]),
  }));
  return <AnimatedEllipse cx={SPOT.x} cy={SPOT.y} fill="none" stroke={color} strokeWidth={2} animatedProps={props} />;
}

export function ReadingSavedArt({ synced }: { synced: boolean }) {
  const reduced = useReducedMotion();
  const { colors } = useAppTheme();
  const [height, setHeight] = useState(0);
  // 1 = enterrada, 0 = afuera. El paño recorre los electrodos de ida y vuelta dos veces.
  const buried = useSharedValue(reduced ? 0 : 1);
  const wipe = useSharedValue(reduced ? 1 : 0);
  const cloth = useSharedValue(0);
  const pinDrop = useSharedValue(reduced ? 0 : -PIN_FALL);
  const pinOpacity = useSharedValue(reduced ? 1 : 0);
  const rippleA = useSharedValue(1);
  const rippleB = useSharedValue(1);
  const seal = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      buried.value = 0; wipe.value = 1; cloth.value = 0; pinDrop.value = 0; pinOpacity.value = 1; rippleA.value = 1; rippleB.value = 1; seal.value = 1;
      return;
    }
    buried.value = withDelay(250, withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.cubic) }));
    cloth.value = withSequence(withDelay(1250, withTiming(1, { duration: 200 })), withDelay(1300, withTiming(0, { duration: 260 })));
    wipe.value = withDelay(1350, withSequence(
      withTiming(1, { duration: 320, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 320, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 320, easing: Easing.inOut(Easing.quad) })));
    // El pin cae, rebota una vez y se clava; las ondas se abren al tocar el suelo.
    pinOpacity.value = withDelay(PIN_START, withTiming(1, { duration: 120 }));
    pinDrop.value = withDelay(PIN_START, withSequence(
      withTiming(0, { duration: 460, easing: Easing.in(Easing.quad) }),
      withTiming(-14, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) })));
    rippleA.value = 0; rippleB.value = 0;
    rippleA.value = withDelay(PIN_START + 460, withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }));
    rippleB.value = withDelay(PIN_START + 760, withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }));
    seal.value = withDelay(PIN_START + 900, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [buried, cloth, pinDrop, pinOpacity, reduced, rippleA, rippleB, seal, wipe]);
  // El dibujo conserva su proporción (360 × 200): el alto medido equivale a 200 unidades.
  const unit = height / 200;
  const probe = useAnimatedStyle(() => ({
    transformOrigin: [PROBE_X * unit, (PROBE_Y + 30) * unit, 0],
    transform: [{ translateY: buried.value * BURY * unit }, { rotate: `${(1 - buried.value) * TILT}deg` }],
  }));
  const rag = useAnimatedStyle(() => ({ opacity: cloth.value, transform: [{ translateY: (78 + wipe.value * 34) * unit }] }));
  const pin = useAnimatedStyle(() => ({ opacity: pinOpacity.value, transform: [{ translateY: pinDrop.value * unit }] }));
  const badge = useAnimatedStyle(() => ({ opacity: seal.value, transform: [{ translateY: (1 - seal.value) * 8 * unit }] }));
  return <View accessible={false} importantForAccessibility="no-hide-descendants" onLayout={event => setHeight(event.nativeEvent.layout.height)}
    style={{ width: '100%', aspectRatio: 360 / 200, borderRadius: 28, overflow: 'hidden', backgroundColor: BG }}>
    <Svg style={layer} width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
      <Circle cx="300" cy="40" r="90" fill="none" stroke="#50715B" strokeWidth="1" />
      <Circle cx="300" cy="40" r="55" fill="none" stroke="#3F604B" strokeWidth="1" />
    </Svg>
    <Animated.View style={[layer, probe]}>
      <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
        <ProbeGlyph x={PROBE_X} y={PROBE_Y} scale={PROBE_SCALE} pinLength={PROBE_PIN_LENGTH} />
      </Svg>
    </Animated.View>
    {/* Suelo delante de la sonda: tapa la parte enterrada mientras sale. */}
    <Svg style={layer} width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
      <Path d="M0 150Q90 132 180 152T360 146V200H0Z" fill="#355B41" />
      <Path d="M0 172Q90 158 180 176T360 170V200H0Z" fill="#6B6A45" />
      <Path d="M0 190Q90 182 180 194T360 188V200H0Z" fill="#8A6A4A" />
      <Path d="M44 146l8-12 8 12M300 142l6-10 6 10" stroke={LEAF} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Ellipse cx={SPOT.x} cy={SPOT.y} rx={14} ry={4.5} fill={PIN_INK} opacity={.45} />
    </Svg>
    {/* Ondas en el suelo, desde el punto medido. */}
    {!reduced && <View style={layer}>
      <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
        <Ripple progress={rippleA} color={colors.pin} />
        <Ripple progress={rippleB} color={colors.pinLight} />
      </Svg>
    </View>}
    {/* Paño que baja y sube por los electrodos. */}
    <Animated.View style={[layer, rag]}>
      <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
        <G transform={`translate(${PROBE_X - 180} 0)`}>
          <Path d="M156 0h48q6 0 6 6v10q0 6-6 6h-48q-6 0-6-6V6q0-6 6-6Z" fill={CLOTH} />
          <Path d="M162 7h36M162 14h30" stroke="#C9B57A" strokeWidth="1.6" strokeLinecap="round" />
        </G>
      </Svg>
    </Animated.View>
    {/* Pin ocre sobre el punto medido: cae, rebota y queda clavado. */}
    <Animated.View style={[layer, pin]}>
      <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
        <G transform={`translate(${SPOT.x} ${SPOT.y - 2}) scale(${PIN_SCALE})`}>
          <Path d="M0 0C-14-18-22-28-22-40A22 22 0 1 1 22-40C22-28 14-18 0 0Z" fill={colors.pin} />
          <Circle cx={0} cy={-40} r={13} fill={PIN_INK} />
          <Path d="M-6.5-40l4.5 4.5 8.5-9.5" stroke={colors.pin} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </G>
      </Svg>
    </Animated.View>
    {!reduced && <View style={layer}>
      <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
        <Spark x={284} y={104} size={6} delay={0} color={colors.pinLight} />
        <Spark x={196} y={96} size={4.5} delay={380} color={LEAF} />
        <Spark x={276} y={136} size={3.5} delay={760} color={SPARK} />
      </Svg>
    </View>}
    {/* Respaldo: nube con flecha (respaldada) o reloj (pendiente de conexión). */}
    <Animated.View style={[{ position: 'absolute', right: '7%', top: '9%', width: '20%', aspectRatio: 1.25 }, badge]}>
      <Svg width="100%" height="100%" viewBox="0 0 50 40">
        {synced
          ? <>
            <Path d="M12 33a9 9 0 0 1 1-18 12 12 0 0 1 23 3 8 8 0 0 1 2 15Z" fill={PAPER} />
            <Path d="M25 29V19M20 23l5-5 5 5" stroke={BG} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
          : <>
            <Circle cx="25" cy="20" r="15" fill={PAPER} />
            <Path d="M25 11v9l6 4" stroke={BG} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>}
      </Svg>
    </Animated.View>
  </View>;
}

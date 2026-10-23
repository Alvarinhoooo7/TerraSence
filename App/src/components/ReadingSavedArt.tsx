import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/useReducedMotion';

// Cierre de una medición, en el estilo de «Antes de medir» (ProbeInsertArt): la sonda sale
// del suelo, un paño limpia sus electrodos y aparece el sello de guardado, con una nube si
// quedó respaldada o un reloj si espera conexión. Se reproduce una vez y queda en calma, con
// un brillo suave en los electrodos. Con «reducir movimiento» se muestra el estado final.

const BG = '#17392C';
const LEAF = '#C6DFB4';
const CLOTH = '#E8D9A8';
const SPARK = '#F4F1D0';
const OK = '#4FB477';
const WAIT = '#E3B341';
const VIEW = '0 0 360 200';
const layer = { position: 'absolute' as const, top: 0, right: 0, bottom: 0, left: 0 };
const ease = Easing.out(Easing.cubic);

const AnimatedG = Animated.createAnimatedComponent(G);

/** Brillo de cuatro puntas que titila; `delay` desfasa cada uno. */
function Spark({ x, y, size, delay, start, reduced }: { x: number; y: number; size: number; delay: number; start: number; reduced: boolean }) {
  const glow = useSharedValue(reduced ? .8 : 0);
  useEffect(() => {
    if (reduced) { glow.value = .8; return; }
    glow.value = withDelay(start + delay, withRepeat(withSequence(
      withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }),
      withTiming(.25, { duration: 900, easing: Easing.inOut(Easing.sin) }),
    ), -1, true));
  }, [delay, glow, reduced, start]);
  const props = useAnimatedProps(() => ({ opacity: glow.value }));
  const s = size;
  return <AnimatedG animatedProps={props}>
    <Path d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`} fill={SPARK} />
  </AnimatedG>;
}

export function ReadingSavedArt({ synced }: { synced: boolean }) {
  const reduced = useReducedMotion();
  const [height, setHeight] = useState(0);
  // 1 = enterrada, 0 = afuera. El paño recorre los electrodos de ida y vuelta dos veces.
  const buried = useSharedValue(reduced ? 0 : 1);
  const wipe = useSharedValue(reduced ? 1 : 0);
  const cloth = useSharedValue(0);
  const seal = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) { buried.value = 0; wipe.value = 1; cloth.value = 0; seal.value = 1; return; }
    buried.value = withDelay(250, withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.cubic) }));
    cloth.value = withSequence(withDelay(1250, withTiming(1, { duration: 200 })), withDelay(1300, withTiming(0, { duration: 260 })));
    wipe.value = withDelay(1350, withSequence(
      withTiming(1, { duration: 320, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 320, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 320, easing: Easing.inOut(Easing.quad) })));
    seal.value = withDelay(2700, withTiming(1, { duration: 380, easing: ease }));
  }, [buried, cloth, reduced, seal, wipe]);
  // El dibujo conserva su proporción (360 × 200): el alto medido equivale a 200 unidades.
  const unit = height / 200;
  const probe = useAnimatedStyle(() => ({ transform: [{ translateY: buried.value * 62 * unit }] }));
  const rag = useAnimatedStyle(() => ({ opacity: cloth.value, transform: [{ translateY: (78 + wipe.value * 34) * unit }] }));
  const badge = useAnimatedStyle(() => ({ opacity: seal.value, transform: [{ scale: .6 + seal.value * .4 }] }));
  const tone = synced ? OK : WAIT;
  return <View accessible={false} importantForAccessibility="no-hide-descendants" onLayout={event => setHeight(event.nativeEvent.layout.height)}
    style={{ width: '100%', aspectRatio: 360 / 200, borderRadius: 24, overflow: 'hidden', backgroundColor: BG }}>
    <Svg style={layer} width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
      <Circle cx="300" cy="40" r="90" fill="none" stroke="#50715B" strokeWidth="1" />
      <Circle cx="300" cy="40" r="55" fill="none" stroke="#3F604B" strokeWidth="1" />
    </Svg>
    <Animated.View style={[layer, probe]}>
      <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
        <Rect x="160" y="22" width="40" height="46" rx="12" fill={LEAF} />
        <Rect x="170" y="31" width="20" height="13" rx="4" fill="#1F5B3F" />
        <Circle cx="180" cy="56" r="4.5" fill="#39704B" />
        <Path d="M170 68V118M180 68V122M190 68V118" stroke={LEAF} strokeWidth="4" strokeLinecap="round" />
      </Svg>
    </Animated.View>
    {/* Suelo delante de la sonda: tapa la parte enterrada mientras sale. */}
    <Svg style={layer} width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
      <Path d="M0 150Q90 132 180 152T360 146V200H0Z" fill="#355B41" />
      <Path d="M0 172Q90 158 180 176T360 170V200H0Z" fill="#6B6A45" />
      <Path d="M0 190Q90 182 180 194T360 188V200H0Z" fill="#8A6A4A" />
      <Path d="M44 146l8-12 8 12M300 142l6-10 6 10" stroke={LEAF} strokeWidth="2" fill="none" strokeLinecap="round" />
    </Svg>
    {/* Paño que baja y sube por los electrodos. */}
    <Animated.View style={[layer, rag]}>
      <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
        <Path d="M156 0h48q6 0 6 6v10q0 6-6 6h-48q-6 0-6-6V6q0-6 6-6Z" fill={CLOTH} />
        <Path d="M162 7h36M162 14h30" stroke="#C9B57A" strokeWidth="1.6" strokeLinecap="round" />
      </Svg>
    </Animated.View>
    <View style={layer}>
      <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
        <Spark x={205} y={88} size={6} delay={0} start={2500} reduced={reduced} />
        <Spark x={154} y={104} size={4.5} delay={380} start={2500} reduced={reduced} />
        <Spark x={208} y={116} size={3.5} delay={760} start={2500} reduced={reduced} />
      </Svg>
    </View>
    {/* Sello: guardado, con nube (respaldada) o reloj (pendiente de conexión). */}
    <Animated.View style={[{ position: 'absolute', left: '7%', top: '12%', width: '22%', aspectRatio: 1 }, badge]}>
      <Svg width="100%" height="100%" viewBox="0 0 80 80">
        <Circle cx="40" cy="40" r="36" fill={tone} opacity={.18} />
        <Circle cx="40" cy="40" r="27" fill={tone} />
        {synced
          ? <Path d="M27 45a8 8 0 0 1 1-16 11 11 0 0 1 21 3 7 7 0 0 1 3 13ZM34 38l5 5 8-9" fill="none" stroke={BG} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          : <><Circle cx="40" cy="40" r="13" fill="none" stroke={BG} strokeWidth="3.4" /><Path d="M40 33v8l5 3" fill="none" stroke={BG} strokeWidth="3.4" strokeLinecap="round" /></>}
      </Svg>
    </Animated.View>
  </View>;
}

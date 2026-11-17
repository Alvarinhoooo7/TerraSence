import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ProbeGlyph } from './art/ProbeGlyph';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

/**
 * Ilustración de los pasos antes de medir, en el estilo de la bienvenida: la sonda
 * baja y entra recta en el suelo. Tres capas: fondo, sonda (animada) y los estratos
 * del frente, que tapan la parte enterrada. Con «reducir movimiento» queda quieta,
 * ya insertada.
 */
export function ProbeInsertArt() {
  const [reduced, setReduced] = useState(false);
  const [height, setHeight] = useState(0);
  const depth = useSharedValue(0);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (reduced) { depth.value = 1; return; }
    depth.value = 0;
    depth.value = withRepeat(withSequence(
      withDelay(500, withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) })),
      withDelay(1600, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) })),
    ), -1, false);
  }, [reduced]);
  // La sonda recorre 0,28 del alto: de flotar sobre el suelo a quedar con el cuerpo justo sobre él
  // y los cinco pines cubiertos por los estratos del frente.
  // El dibujo conserva su proporción (360 × 200), así que el alto medido equivale a 200 unidades.
  const probe = useAnimatedStyle(() => ({ transform: [{ translateY: depth.value * height * 0.28 }] }));
  const layer = { position: 'absolute' as const, top: 0, right: 0, bottom: 0, left: 0 };
  return <View accessible={false} importantForAccessibility="no-hide-descendants" onLayout={event => setHeight(event.nativeEvent.layout.height)}
    style={{ width: '100%', aspectRatio: 360 / 200, borderRadius: 24, overflow: 'hidden', backgroundColor: '#17392C' }}>
    <Svg style={layer} width="100%" height="100%" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet">
      <Circle cx="300" cy="40" r="90" fill="none" stroke="#50715B" strokeWidth="1" />
      <Circle cx="300" cy="40" r="55" fill="none" stroke="#3F604B" strokeWidth="1" />
    </Svg>
    <Animated.View style={[layer, probe]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet">
        <ProbeGlyph x={180} y={12} scale={0.8} pinLength={52} />
      </Svg>
    </Animated.View>
    <Svg style={layer} width="100%" height="100%" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet">
      <Path d="M0 118Q90 100 180 120T360 114V200H0Z" fill="#355B41" />
      <Path d="M0 150Q90 132 180 154T360 146V200H0Z" fill="#6B6A45" />
      <Path d="M0 178Q90 164 180 184T360 176V200H0Z" fill="#8A6A4A" />
      <Path d="M44 112l8-12 8 12M300 108l6-10 6 10" stroke="#C6DFB4" strokeWidth="2" fill="none" strokeLinecap="round" />
    </Svg>
  </View>;
}

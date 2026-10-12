import React, { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { WeatherKind } from '../../engine/weatherOutlook';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const RAIN = '#3B8FD9';
const SUN = '#E3B341';

const CLOUD = 'M7 17.5a4.2 4.2 0 0 1-.6-8.36A6 6 0 0 1 17.7 9.6 3.95 3.95 0 0 1 17.4 17.5Z';
const SMALL_CLOUD = 'M9.5 19a3.5 3.5 0 0 1-.4-6.98 5 5 0 0 1 9.5 1.3A2.85 2.85 0 0 1 18.3 19Z';

/** Gota que cae y se desvanece en bucle; quieta con «reducir movimiento». */
function Drop({ x, delay, animate, color }: { x: number; delay: number; animate: boolean; color: string }) {
  const fall = useSharedValue(0);
  useEffect(() => {
    if (!animate) { fall.value = .4; return; }
    fall.value = withDelay(delay, withRepeat(withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) }), -1, false));
  }, [animate, delay, fall]);
  const props = useAnimatedProps(() => ({
    y1: 19 + fall.value * 3, y2: 21 + fall.value * 3,
    opacity: animate ? 1 - fall.value * .8 : .9,
  }));
  return <AnimatedLine x1={x} x2={x - .8} stroke={color} strokeWidth={1.8} strokeLinecap="round" animatedProps={props} />;
}

/**
 * Ícono del tiempo en un cuadro de 24. `animate` mueve la lluvia (sólo en el bloque de hoy);
 * `kind = null` dibuja una nube en gris, sin afirmar un tiempo que no se conoce.
 */
export function WeatherGlyph({ kind, size = 28, color, animate = false }: { kind: WeatherKind | null; size?: number; color: string; animate?: boolean }) {
  const reduced = useReducedMotion();
  const moving = animate && !reduced;
  const wet = kind === 'drizzle' || kind === 'rain' || kind === 'showers' || kind === 'storm';
  const sun = kind === 'clear' || kind === 'partly';
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {sun && <>
      <Circle cx={kind === 'clear' ? 12 : 9} cy={kind === 'clear' ? 12 : 9} r={kind === 'clear' ? 4.2 : 3.4} fill={SUN} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
        const cx = kind === 'clear' ? 12 : 9, cy = kind === 'clear' ? 12 : 9, r1 = kind === 'clear' ? 6.6 : 5.4, r2 = kind === 'clear' ? 8.6 : 7;
        const rad = angle * Math.PI / 180;
        return <Line key={angle} x1={cx + Math.cos(rad) * r1} y1={cy + Math.sin(rad) * r1} x2={cx + Math.cos(rad) * r2} y2={cy + Math.sin(rad) * r2} stroke={SUN} strokeWidth={1.6} />;
      })}
    </>}
    {kind === 'partly' && <Path d={SMALL_CLOUD} fill={color} opacity={.9} />}
    {kind !== 'clear' && kind !== 'partly' && <Path d={wet || kind === 'snow' ? 'M7 15.5a4.2 4.2 0 0 1-.6-8.36A6 6 0 0 1 17.7 7.6 3.95 3.95 0 0 1 17.4 15.5Z' : CLOUD}
      stroke={kind === null ? color : 'none'} strokeWidth={1.6} fill={kind === null ? 'none' : color} opacity={kind === null ? .6 : 1} />}
    {kind === 'fog' && [20, 22.5].map(y => <Line key={y} x1={6} x2={18} y1={y} y2={y} stroke={color} strokeWidth={1.6} opacity={.7} />)}
    {wet && (kind === 'drizzle'
      ? [9, 13, 17].map((x, i) => <Drop key={x} x={x} delay={i * 260} animate={moving} color={RAIN} />)
      : [8, 11, 14, 17].map((x, i) => <Drop key={x} x={x} delay={i * 200} animate={moving} color={RAIN} />))}
    {kind === 'storm' && <Path d="M12.5 15.5 10.5 19h3l-2 3.5" stroke={SUN} strokeWidth={1.6} />}
    {kind === 'snow' && [8.5, 12, 15.5].map(x => <Circle key={x} cx={x} cy={20} r={1.1} fill={RAIN} />)}
  </Svg>;
}

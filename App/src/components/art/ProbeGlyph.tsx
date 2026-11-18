import React from 'react';
import { Circle, G, Path, Rect } from 'react-native-svg';
import { PROBE_BODY, probePinsPath } from './probeGeometry';

/** La sonda de 5 pines, dibujada una sola vez para toda la app. Se usa DENTRO de un <Svg> existente. */
export function ProbeGlyph({ x, y, scale = 1, pinLength = 52, pinOpacity = 1, led = '#1F5B3F' }: {
  x: number;
  y: number;
  scale?: number;
  pinLength?: number;
  pinOpacity?: number;
  led?: string;
}) {
  const { width, height, radius } = PROBE_BODY;
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Path d={probePinsPath(pinLength)} stroke="#E3F0D6" strokeWidth={3.2} strokeLinecap="round" opacity={pinOpacity} />
      <Rect x={-width / 2} y={0} width={width} height={height} rx={radius} fill="#C6DFB4" />
      <Path d="M-24 44h48v3a13 13 0 0 1-13 13h-22a13 13 0 0 1-13-13Z" fill="#A3C490" />
      <Circle cx={-10} cy={14} r={4} fill={led} />
      <Rect x={1} y={9} width={15} height={10} rx={5} fill="#1F5B3F" />
      <Path d="M-12 29h24M-12 35h24" stroke="#8FB57C" strokeWidth={2} strokeLinecap="round" />
    </G>
  );
}

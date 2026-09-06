import React from 'react';
import Svg, { Path } from 'react-native-svg';

export type IconName = 'home' | 'map' | 'history' | 'settings' | 'leaf' | 'arrow' | 'probe' | 'sync';

/** Small, consistent outline icons; labels remain on their parent controls. */
export function AppIcon({ name, color, size = 24 }: { name: IconName; color: string; size?: number }) {
  const paths: Record<IconName, string> = {
    home: 'M3 10 12 3 21 10V21H15V14H9V21H3Z',
    map: 'M9 4 3 7V21L9 18 15 21 21 18V4L15 7 9 4ZM9 4V18M15 7V21',
    history: 'M3 11A9 9 0 1 1 5 18M3 4V11H10M12 7V12L16 14',
    settings: 'M4 7H20M4 17H20M8 4V10M16 14V20',
    leaf: 'M5 19C-1 5 12 3 21 3 21 15 17 23 5 19ZM5 19 15 9M5 19 3 22',
    arrow: 'M5 12H19M13 6 19 12 13 18',
    probe: 'M9 3H15V14H9ZM12 14V22M6 6H3M18 6H21M6 10H3M18 10H21',
    sync: 'M3 10A9 9 0 0 1 19 6L21 9M21 3V9H15M21 14A9 9 0 0 1 5 18L3 15M3 21V15H9',
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
    <Path d={paths[name]} />
  </Svg>;
}

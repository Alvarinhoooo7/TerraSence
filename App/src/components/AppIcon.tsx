import React from 'react';
import Svg, { Path } from 'react-native-svg';

export type IconName = 'home' | 'map' | 'history' | 'settings' | 'leaf' | 'arrow' | 'probe' | 'sync'
  | 'bluetooth' | 'location' | 'camera' | 'bell' | 'user' | 'help' | 'logout' | 'qr' | 'team' | 'download' | 'shield'
  | 'cloud' | 'check';

/** Small, consistent outline icons; labels remain on their parent controls. */
export function AppIcon({ name, color, size = 24 }: { name: IconName; color: string; size?: number }) {
  const paths: Record<IconName, string> = {
    home: 'M3 10 12 3 21 10V21H15V14H9V21H3Z',
    map: 'M9 4 3 7V21L9 18 15 21 21 18V4L15 7 9 4ZM9 4V18M15 7V21',
    history: 'M3 11A9 9 0 1 1 5 18M3 4V11H10M12 7V12L16 14',
    settings: 'M4 7H20M4 17H20M8 4V10M16 14V20',
    leaf: 'M5 19C-1 5 12 3 21 3 21 15 17 23 5 19ZM5 19 15 9M5 19 3 22',
    arrow: 'M5 12H19M13 6 19 12 13 18',
    probe: 'M6.5 2.5h11v9h-11ZM8 11.5v10M10 11.5v10M12 11.5v10M14 11.5v10M16 11.5v10M9.5 6h.01M13 6h2',
    sync: 'M3 10A9 9 0 0 1 19 6L21 9M21 3V9H15M21 14A9 9 0 0 1 5 18L3 15M3 21V15H9',
    bluetooth: 'M7 7 17 17 12 22V2L17 7 7 17',
    location: 'M12 21C12 21 5 14.5 5 9.5A7 7 0 0 1 19 9.5C19 14.5 12 21 12 21ZM12 12A2.5 2.5 0 1 0 12 7 2.5 2.5 0 0 0 12 12Z',
    camera: 'M3 8H7L9 5H15L17 8H21V19H3ZM12 16A3.5 3.5 0 1 0 12 9 3.5 3.5 0 0 0 12 16Z',
    bell: 'M6 16V11A6 6 0 0 1 18 11V16L20 18H4ZM10 21H14',
    user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21a8 8 0 0 1 16 0',
    help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01',
    logout: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h9',
    qr: 'M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4ZM14 14h2v2h-2ZM18 14h2M14 18h2M18 18h2v2h-2Z',
    team: 'M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.5a6 6 0 0 1 3.5 5.5',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6ZM8.5 12l2.5 2.5 4.5-5',
    cloud: 'M7 18a4.5 4.5 0 0 1-.5-9A6.5 6.5 0 0 1 19 10.5 3.8 3.8 0 0 1 18.5 18ZM9 13l2.2 2.2L15.5 11',
    check: 'M5 12l5 5 9-10',
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
    <Path d={paths[name]} />
  </Svg>;
}

import { useColorScheme } from 'react-native';

import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const preference = useAppStore((state) => state.preferences.theme);
  const isDark = preference === 'dark' || (preference === 'system' && systemScheme === 'dark');
  return { isDark, colors: isDark ? Colors.dark : Colors.light };
}

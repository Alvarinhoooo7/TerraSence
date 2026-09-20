import { GuideTouchable as TouchableOpacity } from './guide/GuideControls';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AppIcon, type IconName } from './AppIcon';

export type TabRoute = 'dashboard' | 'history' | 'settings';
export function BottomNavigation({ route, onNavigate }: { route: string; onNavigate: (route: TabRoute) => void }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabs: { route: TabRoute; icon: IconName; label: string }[] = [
    { route: 'dashboard', icon: 'home', label: t('Inicio', 'Home') },
    { route: 'history', icon: 'history', label: t('Historial', 'History') },
    { route: 'settings', icon: 'settings', label: t('Ajustes', 'Settings') },
  ];
  return <View style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
    {tabs.map(tab => {
      const selected = route === tab.route;
      const color = selected ? colors.primary : colors.textSecondary;
      return <TouchableOpacity guideTitle={tab.label} guide={tab.route === "dashboard" ? t("Abre el resumen del campo y el acceso a una nueva medición.", "Opens the field summary and the new measurement action.") : tab.route === "history" ? t("Abre las lecturas guardadas, sus filtros y sus detalles.", "Opens saved readings, filters and details.") : t("Abre tu cuenta, los equipos y las preferencias de la app.", "Opens your account, devices and app preferences.")} key={tab.route} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onNavigate(tab.route)} style={styles.tab}>
        <View style={[styles.icon, { backgroundColor: selected ? colors.bubbleInactive : 'transparent' }]}>
          <AppIcon name={tab.icon} color={color} size={22} />
        </View>
        <Text style={[styles.label, { color }]}>{tab.label}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', minHeight: 56, gap: 3 },
  icon: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '600' },
});

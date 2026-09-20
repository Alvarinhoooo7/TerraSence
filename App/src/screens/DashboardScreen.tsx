import { BrandLogo } from '../components/BrandLogo';
import { GuideTouchable as TouchableOpacity, GuideScrollView as ScrollView } from '../components/guide/GuideControls';
import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, VERDICT_META } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useMeasurementHistory } from '../hooks/useMeasurementHistory';
import { useAppStore } from '../store/useAppStore';
import { AppIcon } from '../components/AppIcon';
import type { MeasurementPoint } from '../types/app';

interface Props {
  onStartMeasurement: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenDevices: () => void;
  onOpenDetail: (point: MeasurementPoint) => void;
}

export const DashboardScreen: React.FC<Props> = (props) => {
  const { colors } = useAppTheme();
  const { t, locale } = useTranslation();
  const { fieldName, device, pendingCount, isSyncing } = useAppStore();
  const { points, loading, offline, error, refresh } = useMeasurementHistory();
  const latest = points[0];
  const action = (label: string, onPress: () => void) => <TouchableOpacity accessibilityRole="button" guide={t("Abre todas las mediciones del campo con filtros y detalle.", "Opens all field readings with filters and details.")} onPress={onPress} style={styles.textButton}>
    <Text style={[styles.actionText, { color: colors.primary }]}>{label}</Text>
    <AppIcon name="arrow" color={colors.primary} size={18} />
  </TouchableOpacity>;
  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}>
      <View style={styles.header}>
        <BrandLogo width={160} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Ajustes', 'Settings')} onPress={props.onOpenSettings} style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <AppIcon name="settings" color={colors.text} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>{t('TU JORNADA EN TERRENO', 'YOUR DAY IN THE FIELD')}</Text>
      <Text style={[styles.pageTitle, { color: colors.text }]}>{fieldName}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('Cada lectura, una mejor decisión.', 'Every reading, a better decision.')}</Text>

      <View style={[styles.hero, { backgroundColor: colors.primaryDark }]}>
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <AppIcon name="probe" color="#C5E8AF" size={18} />
            <Text style={styles.heroEyebrow}>{t('DIAGNÓSTICO DE SUELO', 'SOIL DIAGNOSIS')}</Text>
          </View>
          
        </View>
        <Text style={styles.heroTitle}>{t('Tu suelo tiene mucho que decir.', 'Your soil has a story to tell.')}</Text>
        <Text style={styles.heroBody}>{t('Elige la etapa del cultivo, conecta tu sonda y descubre qué necesita tu terreno.', 'Choose your crop stage, connect your probe and learn what your field needs.')}</Text>
        <TouchableOpacity guide={t("Con un equipo seleccionado inicia la preparación de una lectura; sin equipo abre la vinculación.", "With a selected device, starts reading preparation; otherwise opens pairing.")} accessibilityRole="button" onPress={device ? props.onStartMeasurement : props.onOpenDevices} style={styles.measureButton}>
          <Text style={styles.measureButtonText}>{device ? t('Iniciar medición', 'Start measurement') : t('Vincular un equipo', 'Link a device')}</Text>
          <AppIcon name="arrow" color="#183D2B" />
        </TouchableOpacity>
        <Text style={styles.heroFoot}>{t('Diagnóstico local · Respaldo al recuperar conexión', 'Local diagnosis · Backup when connected')}</Text>
      </View>

      <View style={styles.statusRow}>
        <TouchableOpacity guideTitle={t("Tu equipo", "Your device")} guide={t("Abre tus dispositivos para seleccionar o vincular una sonda. Estar vinculado no significa estar conectado por Bluetooth.", "Opens devices to select or link a probe. Being linked does not mean Bluetooth is connected.")} accessibilityRole="button" onPress={props.onOpenDevices} style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppIcon name="probe" color={colors.primary} />
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{t('TU EQUIPO', 'YOUR DEVICE')}</Text>
          <Text style={[styles.statusValue, { color: colors.text }]} numberOfLines={2}>{device ? device.alias || device.name : t('Sin vincular', 'Not linked')}</Text>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>{device ? t('Vinculado a tu cuenta', 'Linked to your account') : t('Configura tu sonda', 'Set up your probe')}</Text>
        </TouchableOpacity>
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppIcon name="sync" color={pendingCount ? colors.warning : colors.primary} />
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{t('RESPALDO', 'BACKUP')}</Text>
          <Text style={[styles.statusValue, { color: colors.text }]}>{isSyncing ? t('Sincronizando', 'Syncing') : pendingCount ? `${pendingCount} ${t('pendientes', 'pending')}` : t('Sin pendientes', 'Nothing pending')}</Text>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>{t('Respaldo de lecturas en la nube', 'Cloud backup for readings')}</Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Última lectura', 'Latest reading')}</Text>{action(t('Ver historial', 'View history'), props.onOpenHistory)}</View>
      {(offline || error) && <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: colors.warning }]}>{error ? t('No pudimos cargar las lecturas. Desliza hacia abajo para reintentar.', 'Could not load readings. Pull down to retry.') : t('Mostrando el historial guardado en este teléfono.', 'Showing history saved on this phone.')}</Text>}
      {latest ? <TouchableOpacity guideTitle={t("Última lectura", "Latest reading")} guide={t("Abre los valores, recomendaciones y estado de respaldo de esta medición.", "Opens values, recommendations and backup status for this reading.")} accessibilityRole="button" onPress={() => props.onOpenDetail(latest)} style={[styles.latest, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeading}>
          <Text style={[styles.statusLabel, { color: latest.verdict === 'RED' ? colors.danger : latest.verdict === 'AMBER' ? colors.warning : colors.success }]}>{VERDICT_META[latest.verdict].icon} {latest.title}</Text>
          <AppIcon name="arrow" color={colors.textSecondary} size={18} />
        </View>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{new Date(latest.measuredAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {latest.isPending ? t('Pendiente de respaldo', 'Backup pending') : t('Respaldada', 'Backed up')}</Text>
        <View style={styles.metrics}>{[[latest.ph.toFixed(1), 'pH'], [`${latest.vwcPercent.toFixed(0)}%`, t('Humedad', 'Moisture')], [`${Math.round(latest.ecUsCm)}`, 'CE · µS/cm']].map(([value, label]) => <View key={label} style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>{label}</Text>
        </View>)}</View>
      </TouchableOpacity> : <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <AppIcon name="leaf" color={colors.primary} size={30} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{loading ? t('Cargando lecturas…', 'Loading readings…') : t('Tu próxima decisión empieza aquí', 'Your next decision starts here')}</Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{t('Después de medir podrás revisar el estado del suelo y sus recomendaciones en este espacio.', 'After measuring, review soil conditions and recommendations here.')}</Text>
      </View>}
    </ScrollView>
  </SafeAreaView>;
};
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 32, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, paddingRight: 52 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 22, fontWeight: '700', letterSpacing: -0.8 },
  iconButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...Typography.badge, letterSpacing: 1.5 },
  pageTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -1.2, marginTop: 6 },
  subtitle: { ...Typography.bodyRegular, marginTop: 5, marginBottom: 24 },
  hero: { borderRadius: 26, padding: 24, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  heroEyebrow: { ...Typography.badge, color: '#C5E8AF', flexShrink: 1 },
  step: { fontSize: 12, color: '#BED0C3' },
  heroTitle: { fontSize: 30, lineHeight: 36, fontWeight: '600', letterSpacing: -0.7, color: '#FFFFFF', marginTop: 22 },
  heroBody: { ...Typography.bodyRegular, color: '#D0DFD5', marginTop: 12 },
  measureButton: { minHeight: 58, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, marginTop: 24, backgroundColor: '#C5E8AF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  measureButtonText: { ...Typography.button, color: '#183D2B', flexShrink: 1 },
  heroFoot: { fontSize: 12, lineHeight: 18, color: '#BED0C3', marginTop: 14 },
  statusRow: { flexDirection: 'row', gap: 12, marginVertical: 20 },
  statusCard: { flex: 1, borderWidth: 1, borderRadius: 20, padding: 16, gap: 8 },
  statusLabel: { ...Typography.badge, flexShrink: 1 },
  statusValue: { ...Typography.titleMedium },
  caption: { ...Typography.caption },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { ...Typography.titleMedium, flexShrink: 1 },
  textButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { ...Typography.captionBold },
  latest: { padding: 18, borderWidth: 1, borderRadius: 20, marginTop: 6 },
  metrics: { flexDirection: 'row', marginTop: 22, gap: 12 },
  metric: { flex: 1, gap: 4 },
  metricValue: { fontSize: 26, fontWeight: '600', fontVariant: ['tabular-nums'] },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 },
  emptyBody: { ...Typography.bodyRegular, textAlign: 'center' },
  notice: { ...Typography.caption, marginBottom: 12 },
});

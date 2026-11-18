import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { Text } from '../components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AppIcon, type IconName } from '../components/AppIcon';
import { EntryButton, EntryHeading, EntryLayout, useEntryMetrics } from '../components/entry/EntryUI';
import { isLegacyAndroidBluetooth } from '../services/permissionsService';
import { askLocationOnce } from '../components/permissionPrompt';
import { choiceAfterAsking, LOCATION_CHOICE_KEY } from '../utils/measureLocation';
import { legacyBluetoothNote, PERMISSION_ACTIONS, PERMISSION_COPY, pick } from '../utils/permissionCopy';
import { markPermissionsReviewed, PERMISSION_KINDS, type PermissionKind } from '../utils/permissionState';

// La ubicación va primera y destacada; las otras tres filas son informativas.
const ORDER: PermissionKind[] = ['location', ...PERMISSION_KINDS.filter(kind => kind !== 'location')];

/** Pin sobre el campo y pronóstico. Sobre el panel de ilustración, que usa siempre #17392C. */
function LocationArt() {
  const { colors } = useAppTheme();
  return <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: '#17392C', aspectRatio: 300 / 110 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width="100%" height="100%" viewBox="0 0 300 110">
      <Rect x="0" y="78" width="300" height="32" fill="#A3C490" />
      <Rect x="0" y="78" width="300" height="5" fill="#C6DFB4" />
      <Path d="M20 96h80M120 96h60M200 96h80" stroke="#8FB57C" strokeWidth="3" strokeLinecap="round" />
      <G transform="translate(110 80)">
        <Path d="M0 0C-14-18-22-28-22-40A22 22 0 1 1 22-40C22-28 14-18 0 0Z" fill={colors.pin} />
        <Circle cx="0" cy="-40" r="13" fill="#12281F" />
        <Circle cx="0" cy="-40" r="5" fill={colors.pin} />
      </G>
      <G transform="translate(210 34)">
        <Circle cx="0" cy="0" r="12" fill={colors.pinLight} />
        <Path d="M-26 26a14 14 0 0 1 4-27 18 18 0 0 1 34 4 12 12 0 0 1 2 23Z" fill="#E3F0D6" />
      </G>
    </Svg>
  </View>;
}

const ICONS: Record<PermissionKind, IconName> = { bluetooth: 'bluetooth', location: 'location', camera: 'camera', notifications: 'bell' };

/**
 * Explicación inicial de los accesos del teléfono, con un solo botón. «Continuar» abre el
 * diálogo del sistema de la ubicación (en Android 11 o anterior, uno propio), guarda la
 * respuesta como elección de georreferenciación y marca esta pantalla como vista. Bluetooth,
 * cámara y avisos siguen pidiéndose cuando la persona usa la función que los necesita.
 */
export function PermissionsScreen({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const { compact, veryCompact } = useEntryMetrics();
  const [busy, setBusy] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const locked = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    const back = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => { active.current = false; back.remove(); };
  }, []);

  const finish = async () => {
    if (locked.current) return;
    // Si ya falló el guardado, se continúa en esta sesión: la explicación puede volver a verse.
    if (saveFailed) { onComplete(); return; }
    locked.current = true; setBusy(true);
    try {
      // La ubicación se pregunta aquí una sola vez; la lectura ya no vuelve a preguntarla.
      const accepted = await askLocationOnce(language, isLegacyAndroidBluetooth(), () => active.current);
      if (!active.current) return;
      await AsyncStorage.setItem(LOCATION_CHOICE_KEY, choiceAfterAsking(accepted)).catch(() => undefined);
      await markPermissionsReviewed(AsyncStorage, userId);
      if (active.current) onComplete();
    } catch {
      if (active.current) setSaveFailed(true);
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  };

  const legacy = isLegacyAndroidBluetooth();

  return <EntryLayout footer={<View style={{ gap: 12 }}>
    {saveFailed && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 15, lineHeight: 22 }}>
      {t('No pudimos guardar este paso. Puedes continuar; es posible que lo veas de nuevo al abrir la app.', 'We could not save this step. You can continue; you may see it again when you reopen the app.')}
    </Text>}
    <EntryButton label={pick(PERMISSION_ACTIONS.continue, language)} busy={busy} onPress={() => { void finish(); }} />
  </View>}>
    <View style={{ gap: veryCompact ? 16 : compact ? 20 : 28 }}>
      <EntryHeading eyebrow={t('PERMISOS DEL TELÉFONO', 'PHONE PERMISSIONS')} title={t('Tu teléfono, listo para el campo.', 'Your phone, ready for the field.')}
        description={t('Esto usa cada función. Al continuar, el teléfono te pregunta por la ubicación; lo demás se pide cuando lo uses. Tú decides.', 'This is what each feature uses. When you continue, your phone asks about location; the rest is requested when you use it. You decide.')} />
      <View style={{ gap: veryCompact ? 8 : 10 }}>
        {ORDER.map(kind => {
          const name = pick(PERMISSION_COPY[kind].name, language);
          const summary = kind === 'bluetooth' && legacy
            ? `${pick(PERMISSION_COPY[kind].summary, language)} ${legacyBluetoothNote(language)}`
            : pick(PERMISSION_COPY[kind].summary, language);
          const featured = kind === 'location';
          return <View key={kind} accessible accessibilityLabel={`${name}. ${summary}`}
            style={{ gap: 12, minHeight: veryCompact ? 56 : 64,
              paddingHorizontal: 16, paddingVertical: veryCompact ? 8 : 12, borderRadius: 22, borderWidth: featured ? 2 : 1,
              borderColor: featured ? colors.primary : colors.border, backgroundColor: colors.card }}>
            {featured && !veryCompact && <LocationArt />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
              <AppIcon name={ICONS[kind]} color={colors.primary} size={22} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: 17, lineHeight: 22, fontWeight: '700' }}>{name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{summary}</Text>
            </View>
            </View>
          </View>;
        })}
      </View>
    </View>
  </EntryLayout>;
}

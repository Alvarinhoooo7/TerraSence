import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AppIcon, type IconName } from '../components/AppIcon';
import { EntryButton, EntryHeading, EntryLayout, useEntryMetrics } from '../components/entry/EntryUI';
import { isLegacyAndroidBluetooth } from '../services/permissionsService';
import { legacyBluetoothNote, PERMISSION_ACTIONS, PERMISSION_COPY, pick } from '../utils/permissionCopy';
import { markPermissionsReviewed, PERMISSION_KINDS, type PermissionKind } from '../utils/permissionState';

const ICONS: Record<PermissionKind, IconName> = { bluetooth: 'bluetooth', location: 'location', camera: 'camera', notifications: 'bell' };

/**
 * Explicación inicial de los accesos del teléfono. Es sólo informativa: no abre
 * ningún diálogo del sistema. Cada permiso se pide cuando la persona usa la función
 * que lo necesita, y «Continuar» sólo guarda que esta explicación ya se vio.
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
        description={t('Esto usa cada función. El teléfono te pedirá autorización cuando la uses, y tú decides.', 'This is what each feature uses. Your phone will ask for permission when you use it, and you decide.')} />
      <View style={{ gap: veryCompact ? 8 : 10 }}>
        {PERMISSION_KINDS.map(kind => {
          const name = pick(PERMISSION_COPY[kind].name, language);
          const summary = kind === 'bluetooth' && legacy
            ? `${pick(PERMISSION_COPY[kind].summary, language)} ${legacyBluetoothNote(language)}`
            : pick(PERMISSION_COPY[kind].summary, language);
          return <View key={kind} accessible accessibilityLabel={`${name}. ${summary}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: veryCompact ? 56 : 64,
              paddingHorizontal: 16, paddingVertical: veryCompact ? 8 : 12, borderRadius: 18, borderWidth: 1,
              borderColor: colors.border, backgroundColor: colors.card }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
              <AppIcon name={ICONS[kind]} color={colors.primary} size={22} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: 17, lineHeight: 22, fontWeight: '700' }}>{name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{summary}</Text>
            </View>
          </View>;
        })}
      </View>
    </View>
  </EntryLayout>;
}

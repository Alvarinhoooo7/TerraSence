import { GuideTouchable as TouchableOpacity, GuideScrollView as ScrollView } from '../components/guide/GuideControls';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { listMyDevices, listMyDeviceMemberships, listDeviceMembers, manageDeviceMember } from '../services/deviceService';
import type { DeviceRow, ManagedDeviceMember } from '../types/app';
import { maskEmail, maskName } from '../utils/privacy';

export function AdministrationScreen({ onClose, initialDeviceId }: { onClose: () => void; initialDeviceId?: string | null }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [selected, setSelected] = useState<string | null>(initialDeviceId ?? null);
  const requestVersion = useRef(0);
  const [members, setMembers] = useState<ManagedDeviceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const operation = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => operation.current); return () => sub.remove(); }, []);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    const [all, memberships] = await Promise.all([listMyDevices(), listMyDeviceMemberships()]);
    const available = all.filter(d => memberships.some(m => m.device_id === d.id && m.is_authorized && m.role === 'admin'));
    const next = available.find(d => d.id === selected)?.id ?? available[0]?.id ?? null;
    const nextMembers = next ? await listDeviceMembers(next) : [];
    if (version !== requestVersion.current) return;
    setDevices(available);
    setSelected(next);
    setMembers(nextMembers);
    setError('');
  }, [selected]);

  useEffect(() => {
    let active = true;
    const reload = () => { if (operation.current) return; void refresh().catch(e => {
      if (active) { setMembers([]); setError(e instanceof Error ? e.message : String(e)); }
    }).finally(() => { if (active) setLoading(false); }); };
    reload();
    const timer = setInterval(reload, 10000);
    return () => { active = false; requestVersion.current += 1; clearInterval(timer); };
  }, [refresh]);

  const change = async (member: ManagedDeviceMember, action: 'authorize' | 'remove' | 'transfer_owner') => {
    if (!selected || operation.current) return;
    operation.current = true; setBusy(true);
    try {
      await manageDeviceMember(selected, member.user_id, action);
      // Después de delegar no se consulta la lista protegida del equipo anterior.
      if (action === 'transfer_owner') { onClose(); return; }
      await refresh();
    } catch (e) {
      await refresh().catch(() => setMembers([]));
      setError(e instanceof Error ? e.message : String(e));
    } finally { operation.current = false; setBusy(false); }
  };

  // Sólo se censura a quien está pendiente de aprobación: el administrador todavía no
  // ha aceptado a esa persona y no tiene por qué ver sus datos completos. Una vez
  // aprobada, forma parte del equipo y se muestra tal cual, para poder distinguir a dos
  // miembros con nombres parecidos.
  const shownName = (m: ManagedDeviceMember) => m.is_authorized
    ? (m.full_name || m.email)
    : (m.full_name ? maskName(m.full_name) : maskEmail(m.email));
  const shownEmail = (m: ManagedDeviceMember) => m.is_authorized ? m.email : maskEmail(m.email);

  const confirm = (member: ManagedDeviceMember, action: 'remove' | 'transfer_owner') => Alert.alert(
    action === 'remove' ? t('Eliminar usuario', 'Remove user') : t('Delegar administración', 'Transfer administration'),
    action === 'remove'
      ? t(`Se eliminará el acceso de ${shownEmail(member)} a este equipo.`, `Remove ${shownEmail(member)}'s access to this device.`)
      : t(`${shownEmail(member)} será el administrador. Tú pasarás a ser usuario y perderás el acceso a esta pantalla para este equipo.`, `${shownEmail(member)} will become administrator. You will become a user and lose administration access for this device.`),
    [{ text: t('Cancelar', 'Cancel'), style: 'cancel' }, { text: t('Confirmar', 'Confirm'), onPress: () => void change(member, action) }],
  );

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <TouchableOpacity disabled={busy} onPress={onClose} style={{ padding: 20 }}><Text style={{ color: colors.primary }}>{t('‹ Ajustes', '‹ Settings')}</Text></TouchableOpacity>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{t('Administración', 'Administration')}</Text>
      {loading && <ActivityIndicator color={colors.primary} />}
      {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
      {!loading && !devices.length && <Text style={{ color: colors.text }}>{t('Ya no administras ningún equipo.', 'You do not administer any devices.')}</Text>}
      {devices.map(d => <TouchableOpacity guideTitle={d.alias || d.name} guide={t("Muestra los miembros y solicitudes de este equipo. Las acciones siguientes afectan únicamente al seleccionado.", "Shows this device’s members and requests. The following actions affect only the selected device.")} key={d.id} disabled={busy} onPress={() => { requestVersion.current += 1; setMembers([]); setSelected(d.id); }} style={{ padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: d.id === selected ? colors.primary : colors.border }}>
        <Text style={{ color: colors.text }}>{d.alias || d.name} · {d.device_code}</Text>
      </TouchableOpacity>)}
      {members.map(m => <View key={m.user_id} style={{ padding: 16, gap: 12, backgroundColor: colors.card, borderRadius: 18 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{shownName(m)}</Text>
        <Text style={{ color: colors.textSecondary }}>{shownEmail(m)}</Text>
        <Text style={{ color: colors.textSecondary }}>{m.role === 'admin' ? t('Administrador', 'Administrator') : m.is_authorized ? t('Usuario', 'User') : t('Pendiente de aprobación', 'Awaiting approval')}</Text>
        {m.role === 'user' && <>
          {!m.is_authorized && <TouchableOpacity disabled={busy} onPress={() => void change(m, 'authorize')}><Text style={{ paddingVertical: 12, color: colors.primary }}>{t('Aprobar acceso', 'Approve access')}</Text></TouchableOpacity>}
          {m.is_authorized && <TouchableOpacity disabled={busy} onPress={() => confirm(m, 'transfer_owner')}><Text style={{ paddingVertical: 12, color: colors.primary }}>{t('Delegar administración', 'Transfer administration')}</Text></TouchableOpacity>}
          <TouchableOpacity disabled={busy} onPress={() => confirm(m, 'remove')}><Text style={{ paddingVertical: 12, color: colors.danger }}>{t('Eliminar usuario', 'Remove user')}</Text></TouchableOpacity>
        </>}
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Text, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { listMyDevices, listMyDeviceMemberships, listDeviceMembers, manageDeviceMember } from '../services/deviceService';
import type { DeviceRow, ManagedDeviceMember } from '../types/app';
import { maskEmail, maskName } from '../utils/privacy';
import { SettingsPage } from '../components/SettingsUI';
import { EntryButton } from '../components/entry/EntryUI';
import { ScreenCard, ScreenLabel, ScreenOption, ScreenText, ScreenValue } from '../components/screen/ScreenUI';
import { formatDeviceId } from '../utils/deviceId';

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

  const pending = members.filter(m => m.role === 'user' && !m.is_authorized);
  const team = members.filter(m => m.role === 'admin' || m.is_authorized);
  const roleLabel = (m: ManagedDeviceMember) => m.role === 'admin' ? t('Administrador', 'Administrator') : m.is_authorized ? t('Usuario', 'User') : t('Pendiente de aprobación', 'Awaiting approval');
  const memberCard = (m: ManagedDeviceMember) => <ScreenCard key={m.user_id} accent={m.is_authorized ? undefined : colors.warning}>
    <View style={{ gap: 2 }}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{shownName(m)}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{shownEmail(m)}</Text>
      <Text style={{ color: m.role === 'admin' ? colors.primary : m.is_authorized ? colors.textSecondary : colors.warning, fontSize: 14, fontWeight: '600', marginTop: 4 }}>{roleLabel(m)}</Text>
    </View>
    {m.role === 'user' && <View style={{ gap: 8, marginTop: 4 }}>
      {!m.is_authorized && <EntryButton label={t('Aprobar acceso', 'Approve access')} disabled={busy} onPress={() => void change(m, 'authorize')} />}
      {m.is_authorized && <EntryButton secondary label={t('Delegar administración', 'Transfer administration')} disabled={busy} onPress={() => confirm(m, 'transfer_owner')} />}
      <EntryButton danger label={m.is_authorized ? t('Retirar acceso', 'Remove access') : t('Rechazar solicitud', 'Reject request')} disabled={busy} onPress={() => confirm(m, 'remove')} />
    </View>}
  </ScreenCard>;

  return <SettingsPage eyebrow={t('EQUIPOS Y DATOS', 'DEVICES AND DATA')} title={t('Administración', 'Administration')} onBack={() => { if (!busy) onClose(); }}
    description={t('Aprueba solicitudes y gestiona quién usa cada sonda que administras.', 'Approve requests and manage who uses each probe you administer.')}>
      {loading && <ActivityIndicator color={colors.primary} />}
      {!!error && <ScreenText danger>{error}</ScreenText>}
      {!loading && !devices.length && <ScreenCard><ScreenText>{t('Ya no administras ningún equipo.', 'You do not administer any devices.')}</ScreenText></ScreenCard>}
      {devices.length > 1 && <>
        <ScreenLabel>{t('Sonda', 'Probe')}</ScreenLabel>
        {devices.map(d => <ScreenOption key={d.id} title={d.alias || d.name} subtitle={formatDeviceId(d.device_code)} selected={d.id === selected} disabled={busy}
          guide={t('Muestra los miembros y solicitudes de esta sonda. Las acciones de abajo afectan sólo a la elegida.', 'Shows this probe’s members and requests. The actions below affect only the chosen one.')}
          onPress={() => { requestVersion.current += 1; setMembers([]); setSelected(d.id); }} />)}
      </>}
      {devices.length === 1 && <ScreenCard><ScreenValue label={t('Sonda', 'Probe')} value={devices[0].alias || devices[0].name} /><ScreenValue label="ID" value={formatDeviceId(devices[0].device_code)} /></ScreenCard>}
      {!!pending.length && <><ScreenLabel>{t(`Solicitudes pendientes · ${pending.length}`, `Pending requests · ${pending.length}`)}</ScreenLabel>{pending.map(memberCard)}</>}
      {!!team.length && <><ScreenLabel>{t('Miembros', 'Members')}</ScreenLabel>{team.map(memberCard)}</>}
  </SettingsPage>;
}

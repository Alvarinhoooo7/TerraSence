import { GuideTarget } from '../components/guide/GuideControls';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { listMyDevices, listPendingDeviceRequests, type PendingDeviceRequest } from '../services/deviceService';
import type { DeviceRow } from '../types/app';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { EntryButton } from '../components/entry/EntryUI';
import { ScreenCard, ScreenLayout, ScreenText } from '../components/screen/ScreenUI';
import { createAccountOperation } from '../utils/accountOperation';
import { useAuthStore } from '../store/useAuthStore';
import { createApprovalTracker } from '../utils/approvalFlow';
import { maskEmail, maskName } from '../utils/privacy';

export function WaitingApprovalScreen({ onApproved, onDismiss, addingDevice = false, targetDeviceId, onCancel }: { targetDeviceId?: string; addingDevice?: boolean; onCancel?: () => void; onApproved: (device: DeviceRow) => void; onDismiss: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [requests, setRequests] = useState<PendingDeviceRequest[]>([]);
  const [error, setError] = useState('');
  const [removed, setRemoved] = useState(false);
  const stop = useRef(() => {});
  const leave = () => { stop.current(); (addingDevice && onCancel ? onCancel : onDismiss)(); };
  const callback = useRef(onApproved);
  callback.current = onApproved;
  useEffect(() => {
    const account = createAccountOperation(useAuthStore.getState().session?.user.id, () => useAuthStore.getState().session?.user.id);
    const current = account.begin();
    const unsubscribe = useAuthStore.subscribe(() => account.cancelIfAccountChanged());
    let active = true;
    let checking = false;
    stop.current = () => { active = false; account.cancel(); };
    const tracker = createApprovalTracker(targetDeviceId, !addingDevice);
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const pending = await listPendingDeviceRequests();
        if (!active || !current()) return;
        const devices = await listMyDevices();
        if (!active || !current()) return;
        const result = tracker.update(pending, devices);
        if (result.approved) { callback.current(result.approved); return; }
        setRequests(result.requests);
        setRemoved(result.removed);
        setError('');
      } catch (e) { if (active && current()) setError(e instanceof Error ? e.message : String(e)); }
      finally { checking = false; }
    };
    void check();
    const timer = setInterval(() => void check(), 5000);
    return () => { active = false; unsubscribe(); account.unmount(); clearInterval(timer); };
  }, [addingDevice, targetDeviceId]);
  return <ScreenLayout align="center" eyebrow={addingDevice ? t('VINCULAR OTRA SONDA', 'LINK ANOTHER PROBE') : t('VINCULA TU SONDA', 'LINK YOUR PROBE')}
    title={removed ? t('Solicitud no disponible', 'Request unavailable') : t('Esperando aprobación', 'Awaiting approval')}
    description={removed
      ? t('La solicitud fue eliminada o el equipo fue reseteado.', 'The request was removed or the device was reset.')
      : t('El administrador debe aprobar tu ingreso. Esta pantalla se actualiza sola.', 'The administrator must approve your access. This screen updates by itself.')}
    footer={(removed || addingDevice) ? <EntryButton secondary label={t('Volver', 'Back')} onPress={leave} /> : undefined}>
    {!removed && <ActivityIndicator size="large" color={colors.primary} style={{ alignSelf: 'flex-start' }} />}
    {requests.map(r => <ScreenCard key={r.device_id}>
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>{t('ADMINISTRADOR', 'ADMINISTRATOR')}</Text>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{maskName(r.administrator_name)}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{maskEmail(r.administrator_email)}</Text>
    </ScreenCard>)}
    {!!error && <ScreenText danger>{t('No se pudo comprobar el estado. Reintentando…', 'Could not check the status. Retrying…')}</ScreenText>}
  </ScreenLayout>;
}

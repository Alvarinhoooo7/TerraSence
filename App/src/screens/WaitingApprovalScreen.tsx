import { GuideTarget } from '../components/guide/GuideControls';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { listMyDevices, listPendingDeviceRequests, type PendingDeviceRequest } from '../services/deviceService';
import type { DeviceRow } from '../types/app';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { EntryLayout, EntryButton } from '../components/entry/EntryUI';
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
  return <EntryLayout footer={(removed || addingDevice) ? <EntryButton secondary label={t('Volver', 'Back')} onPress={leave} /> : undefined}>
    <View style={{ gap: 20, alignItems: 'center' }}>
      {!removed && <ActivityIndicator size="large" color={colors.primary} />}
      <GuideTarget title={t('Estado de la solicitud', 'Request status')} description={t('La aprobación se consulta automáticamente. Debes esperar a que el administrador autorice tu acceso; la guía no cambia ese estado.', 'Approval is checked automatically. Wait for the administrator to authorize access; this guide does not change that status.')}><Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{removed ? t('Solicitud no disponible', 'Request unavailable') : t('Esperando aprobación', 'Awaiting approval')}</Text></GuideTarget>
      <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{removed
        ? t('La solicitud fue eliminada o el equipo fue reseteado.', 'The request was removed or the device was reset.')
        : t('El administrador debe aprobar tu ingreso. Esta pantalla se actualizará automáticamente.', 'The administrator must approve your access. This screen will update automatically.')}</Text>
      {requests.map(r => <View key={r.device_id} style={{ gap: 8, alignItems: 'center' }}>
        <Text style={{ color: colors.text }}>{maskName(r.administrator_name)}</Text>
        <Text style={{ color: colors.textSecondary }}>{maskEmail(r.administrator_email)}</Text>
      </View>)}
      {!!error && <Text style={{ color: colors.danger }}>{t('No se pudo comprobar el estado. Reintentando…', 'Could not check the status. Retrying…')}</Text>}

    </View>
  </EntryLayout>;
}

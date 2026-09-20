import { GuideTarget } from '../components/guide/GuideControls';
import { GuideTouchable as TouchableOpacity } from '../components/guide/GuideControls';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listMyDevices, listPendingDeviceRequests, type PendingDeviceRequest } from '../services/deviceService';
import type { DeviceRow } from '../types/app';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { maskEmail, maskName } from '../utils/privacy';

export function WaitingApprovalScreen({ onApproved, onDismiss }: { onApproved: (device: DeviceRow) => void; onDismiss: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [requests, setRequests] = useState<PendingDeviceRequest[]>([]);
  const [error, setError] = useState('');
  const [removed, setRemoved] = useState(false);
  const callback = useRef(onApproved);
  callback.current = onApproved;
  useEffect(() => {
    let active = true;
    let checking = false;
    let requestedIds: string[] = [];
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const pending = await listPendingDeviceRequests();
        const devices = await listMyDevices();
        if (!active) return;
        const approved = devices.find(d => requestedIds.includes(d.id));
        // En el primer sondeo la aprobación puede haber ocurrido antes de montar.
        if (approved || (!pending.length && !requestedIds.length && devices[0])) {
          callback.current(approved ?? devices[0]); return;
        }
        if (pending.length) requestedIds = pending.map(r => r.device_id);
        setRequests(pending);
        setRemoved(!pending.length);
        setError('');
      } catch (e) { if (active) setError(e instanceof Error ? e.message : String(e)); }
      finally { checking = false; }
    };
    void check();
    const timer = setInterval(() => void check(), 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 28 }}>
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
      {removed && <TouchableOpacity onPress={onDismiss}><Text style={{ color: colors.primary, padding: 16 }}>{t('Volver', 'Back')}</Text></TouchableOpacity>}
    </View>
  </SafeAreaView>;
}

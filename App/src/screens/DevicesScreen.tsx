import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SettingsPage, SettingsRow, SettingsCard, SettingsText, SettingsButton } from '../components/SettingsUI';
import { useLinkedDevices } from '../hooks/useLinkedDevices';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { formatDeviceId } from '../utils/deviceId';

/** Fichas de consulta. La selección para medir pertenece al encabezado de Inicio. */
export function DevicesScreen({ onClose, initialDeviceId }: { onClose: () => void; initialDeviceId?: string | null }) {
  const { t, locale } = useTranslation(); const { colors } = useAppTheme();
  const { devices, memberships, loading, error, refresh } = useLinkedDevices();
  const [detailId, setDetailId] = useState<string | null>(initialDeviceId ?? null);
  const [message, setMessage] = useState('');
  const detail = devices.find(d => d.id === detailId);
  const back = () => { if (detailId) { setDetailId(null); setMessage(''); } else onClose(); };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!detailId) return false;
      setDetailId(null); setMessage(''); return true;
    }); return () => sub.remove();
  }, [detailId]);
  return <SettingsPage title={detail ? detail.alias || detail.name : t('Mis dispositivos', 'My devices')} onBack={back}
    description={detail ? t('Información de tu sonda.', 'Your probe information.') : t('Consulta tus sondas vinculadas.', 'View your linked probes.')}>
    {loading && <ActivityIndicator color={colors.primary} />}
    {error && <><SettingsText>{t('No pudimos actualizar tus dispositivos.', 'Could not update your devices.')}</SettingsText><SettingsButton title={t('Reintentar', 'Retry')} onPress={() => void refresh()} /></>}
    {!loading && !error && !devices.length && <SettingsText>{t('Aún no tienes sondas autorizadas. Puedes vincular una desde Inicio.', 'You have no authorized probes yet. Link one from Home.')}</SettingsText>}
    {detail ? <>
      <SettingsCard>
        <SettingsText>ID · {formatDeviceId(detail.device_code)}</SettingsText>
        <SettingsButton title={t('Copiar ID', 'Copy ID')} onPress={() => {
          void Clipboard.setStringAsync(detail.device_code).then(() => setMessage(t('ID copiado.', 'ID copied.'))).catch(() => setMessage(t('No se pudo copiar el ID.', 'Could not copy ID.')));
        }} />
        {!!message && <SettingsText>{message}</SettingsText>}
      </SettingsCard>
      <SettingsCard>
        <SettingsText>{t('Tu rol', 'Your role')}: {memberships.find(m => m.device_id === detail.id)?.role === 'admin' ? t('Administrador', 'Administrator') : t('Usuario', 'User')}</SettingsText>
        <SettingsText>{t('Batería registrada', 'Recorded battery')}: {detail.battery_level == null ? t('Sin dato', 'No data') : `${detail.battery_level}%`}</SettingsText>
        <SettingsText>{t('Última comunicación', 'Last communication')}: {detail.last_seen_at ? new Date(detail.last_seen_at).toLocaleString(locale) : t('Sin registro', 'No record')}</SettingsText>
        <SettingsText>Firmware · {detail.firmware_version || '—'}</SettingsText>
        <SettingsText>Hardware · {detail.hardware_version || '—'}</SettingsText>
      </SettingsCard>
      <SettingsText>{t('Bluetooth se comprueba al medir. La batería corresponde al último registro disponible.', 'Bluetooth is checked when measuring. Battery reflects the latest available record.')}</SettingsText>
    </> : devices.map(d => <SettingsRow key={d.id} title={d.alias || d.name} subtitle={formatDeviceId(d.device_code)} onPress={() => { setDetailId(d.id); setMessage(''); }} />)}
  </SettingsPage>;
}

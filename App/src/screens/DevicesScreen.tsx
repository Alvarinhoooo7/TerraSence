import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SettingsPage, SettingsRow, SettingsText, SettingsButton } from '../components/SettingsUI';
import { ScreenCard, ScreenValue } from '../components/screen/ScreenUI';
import { EntryButton } from '../components/entry/EntryUI';
import { useLinkedDevices } from '../hooks/useLinkedDevices';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { formatDeviceId } from '../utils/deviceId';

/**
 * Fichas de consulta. La selección para medir pertenece al encabezado de Inicio:
 * abrir una ficha nunca cambia la sonda con que se mide. La lista es una pestaña
 * de la barra inferior y no lleva «Volver»; la ficha vuelve a la lista.
 */
export function DevicesScreen({ onClose, onLinkDevice, initialDeviceId }: { onClose: () => void; onLinkDevice?: () => void; initialDeviceId?: string | null }) {
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

  if (detail) {
    const role = memberships.find(m => m.device_id === detail.id)?.role === 'admin' ? t('Administrador', 'Administrator') : t('Usuario', 'User');
    return <SettingsPage eyebrow={t('SONDA', 'PROBE')} title={detail.alias || detail.name} onBack={back} backLabel={t('Mis dispositivos', 'My devices')}
      description={t('Datos registrados de tu sonda. El Bluetooth se comprueba al medir.', 'Recorded details of your probe. Bluetooth is checked when measuring.')}>
      <ScreenCard>
        <ScreenValue label="ID" value={formatDeviceId(detail.device_code)} selectable />
        <ScreenValue label={t('Tu rol', 'Your role')} value={role} />
      </ScreenCard>
      <EntryButton secondary label={t('Copiar ID', 'Copy ID')} onPress={() => {
        void Clipboard.setStringAsync(detail.device_code).then(() => setMessage(t('ID copiado.', 'ID copied.'))).catch(() => setMessage(t('No se pudo copiar el ID.', 'Could not copy ID.')));
      }} />
      {!!message && <SettingsText>{message}</SettingsText>}
      <ScreenCard>
        <ScreenValue label={t('Batería registrada', 'Recorded battery')} value={detail.battery_level == null ? t('Sin dato', 'No data') : `${detail.battery_level} %`} />
        <ScreenValue label={t('Última comunicación', 'Last communication')} value={detail.last_seen_at ? new Date(detail.last_seen_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : t('Sin registro', 'No record')} />
        <ScreenValue label="Firmware" value={detail.firmware_version || '—'} />
        <ScreenValue label="Hardware" value={detail.hardware_version || '—'} />
      </ScreenCard>
    </SettingsPage>;
  }

  return <SettingsPage eyebrow={t('TUS EQUIPOS', 'YOUR DEVICES')} title={t('Mis dispositivos', 'My devices')}
    description={t('Tus sondas vinculadas. La sonda para medir se elige en Inicio.', 'Your linked probes. The probe to measure with is chosen on Home.')}
    footer={onLinkDevice ? <EntryButton secondary label={t('Vincular otra sonda', 'Link another probe')} onPress={onLinkDevice} /> : undefined}>
    {loading && <ActivityIndicator color={colors.primary} />}
    {error && <><SettingsText>{t('No pudimos actualizar tus dispositivos.', 'Could not update your devices.')}</SettingsText><SettingsButton title={t('Reintentar', 'Retry')} onPress={() => void refresh()} /></>}
    {!loading && !error && !devices.length && <SettingsText>{t('Aún no tienes sondas autorizadas.', 'You have no authorized probes yet.')}</SettingsText>}
    {devices.map(d => <SettingsRow key={d.id} title={d.alias || d.name} subtitle={formatDeviceId(d.device_code)} onPress={() => { setDetailId(d.id); setMessage(''); }} />)}
  </SettingsPage>;
}

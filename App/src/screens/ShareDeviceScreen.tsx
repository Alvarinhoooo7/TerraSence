import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler } from 'react-native';
import { SettingsPage, SettingsRow, SettingsText, SettingsButton } from '../components/SettingsUI';
import { RotatingDeviceQr } from '../components/RotatingDeviceQr';
import { useLinkedDevices } from '../hooks/useLinkedDevices';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { formatDeviceId } from '../utils/deviceId';

export function ShareDeviceScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation(); const { colors } = useAppTheme();
  const { devices, loading, error, refresh } = useLinkedDevices();
  const [id, setId] = useState<string | null>(null);
  const device = devices.find(d => d.id === id);
  const back = () => { if (id) setId(null); else onBack(); };
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (!id) return false; setId(null); return true; }); return () => sub.remove(); }, [id]);
  return <SettingsPage eyebrow={device ? t('COMPARTIR ACCESO', 'SHARE ACCESS') : t('EQUIPOS Y DATOS', 'DEVICES AND DATA')} title={device ? device.alias || device.name : t('Compartir acceso', 'Share access')} onBack={back}
    backLabel={device ? t('Sondas', 'Probes') : undefined}
    description={device ? t('Muéstrale este QR a quien quieras sumar. Al escanearlo pide acceso y el administrador lo aprueba.', 'Show this QR to the person you want to add. Scanning it requests access and the administrator approves it.') : t('Elige la sonda que quieres compartir.', 'Choose the probe you want to share.')}>
    {loading && <ActivityIndicator color={colors.primary} />}
    {error && <><SettingsText>{t('No pudimos consultar tus sondas.', 'Could not load your probes.')}</SettingsText><SettingsButton title={t('Reintentar', 'Retry')} onPress={() => void refresh()} /></>}
    {device ? <RotatingDeviceQr deviceId={device.id} /> : devices.map(d => <SettingsRow key={d.id} title={d.alias || d.name} subtitle={formatDeviceId(d.device_code)} onPress={() => setId(d.id)} />)}
    {!loading && !error && !devices.length && <SettingsText>{t('Necesitas acceso aprobado a una sonda para compartirla.', 'You need approved access to a probe to share it.')}</SettingsText>}
  </SettingsPage>;
}

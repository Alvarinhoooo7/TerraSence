import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View, useWindowDimensions } from 'react-native';
import { Text } from './AppText';
import * as Clipboard from 'expo-clipboard';
import { GuideTouchable as TouchableOpacity } from './guide/GuideControls';
import QRCode from 'react-native-qrcode-svg';
import { EntryButton } from './entry/EntryUI';
import { ScreenCard, ScreenText } from './screen/ScreenUI';
import { getDeviceAccessQr, type DeviceAccessQr } from '../services/deviceService';
import { buildDeviceQrPayload } from '../utils/deviceCode';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { localizeProbeError } from '../utils/probeErrors';

export function RotatingDeviceQr({ deviceId }: { deviceId: string }) {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const { width } = useWindowDimensions();
  const [qr, setQr] = useState<DeviceAccessQr | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let active = true;
    let expiry = 0;
    let retryAt = 0;
    let loading = false;
    setQr(null);
    const refresh = async () => {
      setNow(Date.now());
      if (loading || Date.now() < expiry || Date.now() < retryAt) return;
      loading = true;
      try {
        const result = await getDeviceAccessQr(deviceId);
        if (active) { expiry = Date.parse(result.expires_at); setQr(result); setError(''); }
      } catch (e) {
        if (active) { setQr(null); setError(localizeProbeError(e instanceof Error ? e.message : String(e), language, t('No se pudo generar el QR.', 'Could not generate the QR.'))); }
        retryAt = Date.now() + 5000;
      } finally { loading = false; }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 1000);
    return () => { active = false; clearInterval(timer); };
  }, [deviceId]);
  const remaining = qr ? Math.max(0, Math.ceil((Date.parse(qr.expires_at) - now) / 1000)) : 0;
  const minutes = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  return <View style={{ gap: 12 }}>
    <View style={{ alignItems: 'center', gap: 12 }}>
      {qr && remaining > 0
        ? <View style={{ padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF' }}><QRCode value={buildDeviceQrPayload(qr.token)} size={Math.min(240, Math.max(140, width - 140))} /></View>
        : <View style={{ height: 200, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>}
      {remaining > 0 && <Text accessibilityLiveRegion="polite" style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{t(`Vence en ${minutes}`, `Expires in ${minutes}`)}</Text>}
      <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: 'center' }}>{t('Cada QR dura 5 minutos y luego se renueva solo.', 'Each QR lasts 5 minutes and then renews by itself.')}</Text>
    </View>
    {qr && remaining > 0 && <ScreenCard>
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>{t('O COMPARTE EL CÓDIGO', 'OR SHARE THE CODE')}</Text>
      <Text selectable style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{qr.token}</Text>
      <EntryButton secondary label={t('Copiar invitación', 'Copy invitation')} onPress={() => {
        if (Date.parse(qr.expires_at) <= Date.now()) return;
        void Clipboard.setStringAsync(qr.token).then(() => Alert.alert(t('Invitación copiada', 'Invitation copied'))).catch(() => Alert.alert(t('No se pudo copiar. Mantén pulsado el código para seleccionarlo.', 'Could not copy. Long press the code to select it.')));
      }} />
    </ScreenCard>}
    {!!error && <ScreenText danger>{error}</ScreenText>}
  </View>;
}

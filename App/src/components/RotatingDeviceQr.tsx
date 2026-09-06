import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { getDeviceAccessQr, type DeviceAccessQr } from '../services/deviceService';
import { buildDeviceQrPayload } from '../utils/deviceCode';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';

export function RotatingDeviceQr({ deviceId }: { deviceId: string }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
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
        if (active) { setQr(null); setError(e instanceof Error ? e.message : String(e)); }
        retryAt = Date.now() + 5000;
      } finally { loading = false; }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 1000);
    return () => { active = false; clearInterval(timer); };
  }, [deviceId]);
  const remaining = qr ? Math.max(0, Math.ceil((Date.parse(qr.expires_at) - now) / 1000)) : 0;
  return <View style={{ alignItems: 'center', gap: 12, padding: 16 }}>
    {qr && remaining > 0 ? <View style={{ padding: 12, backgroundColor: '#fff' }}><QRCode value={buildDeviceQrPayload(qr.token)} size={220} /></View> : <ActivityIndicator color={colors.primary} />}
    <Text style={{ color: colors.textSecondary }}>{t('El QR cambia cada 15 minutos.', 'The QR changes every 15 minutes.')}</Text>
    {remaining > 0 && <Text style={{ color: colors.textSecondary }}>{t('Vence en', 'Expires in')} {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</Text>}
    {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
  </View>;
}

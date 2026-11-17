import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './AppText';
import { AppIcon } from './AppIcon';
import { Typography } from '../constants/theme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { flushQueue, syncStatus } from '../services/measurementsService';

const PANEL = '#17392C';
const TILE = '#24503A';
const SOFT = '#C4D4C9';
const ACTION = '#C6DFB4';
const ACTION_INK = '#12281F';

/**
 * Resumen de sincronización de «Equipos y datos»: pendientes de enviar, último envío confirmado y
 * «Sincronizar ahora». Lee lo mismo que `SyncSettings` (`syncStatus`, `flushQueue`).
 */
export function SyncSummaryCard() {
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<Awaited<ReturnType<typeof syncStatus>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let alive = true;
    const read = () => void syncStatus().then(next => { if (alive) { setStatus(next); setFailed(false); } }).catch(() => { if (alive) setFailed(true); });
    read();
    const timer = setInterval(read, 3000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  const sync = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setFailed(false);
    try {
      const result = await flushQueue();
      setStatus(await syncStatus());
      useAppStore.getState().setPendingCount(result.remaining);
    } catch { setFailed(true); }
    finally { lock.current = false; setBusy(false); }
  };
  const pending = status?.pending ?? null;
  const last = status?.lastSentAt ? new Date(status.lastSentAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : t('sin envíos todavía', 'nothing sent yet');
  const headline = failed ? t('No se pudo leer el estado', 'Could not read the status')
    : pending === null ? t('Revisando…', 'Checking…')
    : pending === 0 ? t('Todo respaldado en la nube', 'Everything is backed up to the cloud')
    : t(`${pending} por enviar a la nube`, `${pending} waiting to go to the cloud`);
  return <View style={{ borderRadius: 24, backgroundColor: PANEL, padding: 18, gap: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <AppIcon name="cloud" size={34} color={ACTION} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text accessibilityLiveRegion="polite" style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>{headline}</Text>
        <Text style={{ color: SOFT, fontSize: 14 }}>{t('Último envío confirmado', 'Last confirmed upload')}: {last}</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1, borderRadius: 16, backgroundColor: TILE, paddingVertical: 10, paddingHorizontal: 12, gap: 2 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 24, ...Typography.numeric.bold }}>{pending === null ? '—' : String(pending)}</Text>
        <Text style={{ color: SOFT, fontSize: 13 }}>{t('Pendientes de enviar', 'Pending upload')}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Sincronizar ahora', 'Sync now')} accessibilityState={{ disabled: busy, busy }}
        disabled={busy} onPress={() => void sync()}
        style={({ pressed }) => ({ flex: 1, minHeight: 62, borderRadius: 16, backgroundColor: ACTION, alignItems: 'center', justifyContent: 'center', opacity: busy ? .55 : pressed ? .8 : 1 })}>
        <Text style={{ color: ACTION_INK, fontSize: 15, fontWeight: '700' }}>{busy ? t('Sincronizando…', 'Syncing…') : t('Sincronizar ahora', 'Sync now')}</Text>
      </Pressable>
    </View>
  </View>;
}

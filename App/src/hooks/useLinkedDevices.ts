import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { listMyDevices, listMyDeviceMemberships } from '../services/deviceService';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import type { DeviceMembershipRow, DeviceRow } from '../types/app';

/** Consulta de equipos; abrir una lista o ficha nunca selecciona una sonda. */
export function useLinkedDevices() {
  const accountId = useAuthStore(s => s.session?.user.id);
  const revision = useAppStore(s => s.dataRevision);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [memberships, setMemberships] = useState<DeviceMembershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const generation = ++request.current;
    const active = () => request.current === generation && useAuthStore.getState().session?.user.id === accountId;
    setLoading(true); setError(false);
    try {
      if (!accountId) { setDevices([]); setMemberships([]); return; }
      const [rows, roles] = await Promise.all([listMyDevices(), listMyDeviceMemberships()]);
      if (!active()) return;
      setDevices(rows.filter(d => roles.some(m => m.device_id === d.id && m.is_authorized)));
      setMemberships(roles);
    } catch { if (active()) setError(true); }
    finally { if (active()) setLoading(false); }
  }, [accountId, revision]);
  useEffect(() => {
    setDevices([]); setMemberships([]);
    void refresh();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { request.current++; sub.remove(); };
  }, [refresh]);
  return { devices, memberships, loading, error, refresh };
}

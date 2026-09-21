import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { loadMeasurementHistory } from '../services/measurementsService';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import type { MeasurementPoint } from '../types/app';

export function useMeasurementHistory() {
  const dataRevision = useAppStore(s => s.dataRevision);
  const fieldName = useAppStore(s => s.fieldName);
  const deviceId = useAppStore(s => s.device?.id);
  const accountId = useAuthStore(s => s.session?.user.id);
  const [points, setPoints] = useState<MeasurementPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError(false);
    try {
      const result = await loadMeasurementHistory(fieldName, deviceId);
      if (request !== generation.current) return;
      setPoints(result.points);
      setOffline(result.offline);
    } catch {
      if (request === generation.current) setError(true);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [fieldName, deviceId, accountId, dataRevision]);
  useEffect(() => {
    setPoints([]);
    setOffline(false);
    void refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { generation.current += 1; subscription.remove(); };
  }, [refresh]);
  return { points, loading, offline, error, refresh };
}

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { awakeRemainingMs, firmwareDeclaresSleep, lastProbeDisconnect, loadProbeSleeps, probeSleeps, probeSleepsKnown, subscribeProbeWake } from '../utils/probeWake';

/**
 * Si la sonda duerme entre mediciones y cuánto le queda despierta tras la última desconexión.
 * La bandera leída por BLE manda; sin ella, la versión de firmware que la sonda informó a la nube.
 * Mientras queda tiempo se actualiza cada segundo; al llegar a cero deja de contar.
 */
export function useProbeAwake(deviceCode: string | null | undefined, firmwareVersion?: string | null): { sleeps: boolean; remainingMs: number } {
  const read = () => {
    const sleeps = probeSleepsKnown(deviceCode) ? probeSleeps(deviceCode) : firmwareDeclaresSleep(firmwareVersion);
    return { sleeps, remainingMs: sleeps ? awakeRemainingMs(lastProbeDisconnect(deviceCode), Date.now()) : 0 };
  };
  const [state, setState] = useState(read);

  useEffect(() => {
    let alive = true;
    const refresh = () => { if (alive) setState(read()); };
    refresh();
    void loadProbeSleeps(AsyncStorage, deviceCode).then(refresh);
    const off = subscribeProbeWake(refresh);
    return () => { alive = false; off(); };
  }, [deviceCode, firmwareVersion]);

  useEffect(() => {
    if (state.remainingMs <= 0) return;
    // Se alinea con el cambio de segundo para que el contador no salte dos de una vez.
    const timer = setTimeout(() => setState(read()), (state.remainingMs % 1000) || 1000);
    return () => clearTimeout(timer);
  }, [state, deviceCode]);

  return state;
}

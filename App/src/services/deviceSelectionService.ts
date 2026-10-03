import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceSelectionKey, restoreDeviceSelection } from '../utils/deviceSelection';
import type { DeviceRow } from '../types/app';

export async function restoreSelectedDevice(userId: string, devices: DeviceRow[]) {
  const savedId = await AsyncStorage.getItem(deviceSelectionKey(userId)).catch(() => null);
  return restoreDeviceSelection(devices, savedId);
}

// Serializar escrituras evita que dos elecciones rápidas se guarden en orden inverso.
let writes = Promise.resolve();
export function rememberSelectedDevice(userId: string, deviceId: string): Promise<void> {
  const write = writes.catch(() => undefined).then(() => AsyncStorage.setItem(deviceSelectionKey(userId), deviceId));
  writes = write;
  return write;
}

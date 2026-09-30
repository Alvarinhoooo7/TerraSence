import { requireNativeModule } from 'expo';
import { iosBluetoothAuthorizationState, type PermissionState } from '../utils/permissionState';

type BluetoothAuthorizationModule = { getAuthorization: () => string };

/** Consulta CoreBluetooth sin crear CBCentralManager ni mostrar el diálogo. */
export function readIosBluetoothAuthorization(): PermissionState {
  const native = requireNativeModule<BluetoothAuthorizationModule>('IosBluetoothAuthorization');
  return iosBluetoothAuthorizationState(native.getAuthorization());
}

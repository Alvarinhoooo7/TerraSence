/** Una selección guardada que perdió acceso requiere una nueva elección explícita. */
export function restoreDeviceSelection<T extends { id: string }>(devices: T[], savedId: string | null): T | null {
  if (savedId !== null) return devices.find(device => device.id === savedId) ?? null;
  return devices.length === 1 ? devices[0] : null;
}

export const deviceSelectionKey = (userId: string) => `@terrasense/selected-probe/${userId}`;

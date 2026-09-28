// src/utils/contactQueue.ts
//
// Cola de contactos con la sonda que aún no llegaron a Supabase, como lógica
// pura para probarla sin React Native.
//
// Por equipo basta conservar el contacto más antiguo (fija la primera
// conexión) y el más reciente (última conexión, batería y versión): la base
// ignora lo intermedio de todos modos. Así la cola no crece aunque el teléfono
// pase días sin red.

export interface ProbeContact {
  deviceCode: string;
  battery: number | null;
  firmwareVersion: string | null;
  /** ISO 8601: la hora real del contacto, no la del envío. */
  at: string;
}

/** Un contacto sin enviar tras una semana ya no describe nada útil. */
export const CONTACT_MAX_AGE_MS = 7 * 24 * 3_600_000;

export function mergeContact(queue: ProbeContact[], contact: ProbeContact, now = Date.now()): ProbeContact[] {
  const fresh = [...queue, contact].filter((c) => now - Date.parse(c.at) <= CONTACT_MAX_AGE_MS);
  const byDevice = new Map<string, ProbeContact[]>();
  for (const c of fresh) byDevice.set(c.deviceCode, [...(byDevice.get(c.deviceCode) ?? []), c]);

  const out: ProbeContact[] = [];
  for (const contacts of byDevice.values()) {
    contacts.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const first = contacts[0]!;
    const last = contacts[contacts.length - 1]!;
    out.push(first);
    if (last !== first) out.push(last);
  }
  return out;
}

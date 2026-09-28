// src/services/contactService.ts
//
// Informa a Supabase cada conversación con la sonda: hora, batería y versión
// del firmware (característica de estado). La sonda no tiene internet, así que
// esto es lo único que alimenta la «última conexión», el Online/Offline y la
// batería del equipo en el backoffice.
//
// Nunca bloquea ni rompe el flujo BLE: si no hay red o la llamada falla, el
// contacto queda en cola y se reintenta en el próximo contacto o al
// sincronizar. La hora que viaja es la del contacto, no la del envío.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { mergeContact, type ProbeContact } from '../utils/contactQueue';

const QUEUE_KEY = '@terrasense/pending_probe_contacts';
let flushing: Promise<void> | null = null;

const keyOf = (c: ProbeContact) => `${c.deviceCode}@${c.at}`;

async function readQueue(): Promise<ProbeContact[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as ProbeContact[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: ProbeContact[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue)).catch(() => undefined);
}

async function send(contact: ProbeContact): Promise<boolean> {
  const { error } = await supabase.rpc('report_device_contact', {
    p_device_code: contact.deviceCode,
    p_battery: contact.battery,
    p_firmware_version: contact.firmwareVersion,
    p_contacted_at: contact.at,
  });
  return !error;
}

/** Envía lo pendiente; lo que falla se conserva (p. ej. un equipo aún sin registrar). */
export function flushProbeContacts(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const queue = await readQueue();
    const sent = new Set<string>();
    for (const contact of queue) {
      if (await send(contact).catch(() => false)) sent.add(keyOf(contact));
    }
    if (sent.size === 0) return;
    // Se relee: pudo entrar un contacto nuevo mientras se enviaba.
    await writeQueue((await readQueue()).filter((c) => !sent.has(keyOf(c))));
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Registra un contacto y lo intenta enviar de inmediato, sin esperar. */
export async function recordProbeContact(contact: Omit<ProbeContact, 'at'>): Promise<void> {
  if (!/^\d{15}$/.test(contact.deviceCode)) return;
  const entry: ProbeContact = { ...contact, at: new Date().toISOString() };
  await writeQueue(mergeContact(await readQueue(), entry));
  await flushProbeContacts();
}

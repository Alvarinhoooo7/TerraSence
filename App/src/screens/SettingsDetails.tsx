import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Text } from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { SettingsPage, SettingsCard, SettingsText, SettingsButton } from '../components/SettingsUI';
import { useTranslation } from '../hooks/useTranslation';
import { readPermissions, requestPermission } from '../services/permissionsService';
import { PERMISSION_KINDS, type PermissionKind, type PermissionSnapshot } from '../utils/permissionState';
import { registerPushToken } from '../services/notifications';
import { useAppStore } from '../store/useAppStore';
import { flushQueue, syncStatus } from '../services/measurementsService';
import { listMyDevices } from '../services/deviceService';
import { supabase } from '../services/supabase';
import type { DeviceRow } from '../types/app';
import { legalSections } from '../utils/legalSections';

export function PhonePermissions({ onBack }: { onBack: () => void }) {
  const { t, language } = useTranslation(); const [snapshot, setSnapshot] = useState<PermissionSnapshot | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false); const revision = useRef(0);
  const refresh = useCallback(async () => { const version = ++revision.current; const next = await readPermissions(); if (version === revision.current) setSnapshot(next); }, []);
  useEffect(() => { void refresh(); const sub = AppState.addEventListener('change', s => { if (s === 'active' && !lock.current) void refresh(); }); return () => { revision.current++; sub.remove(); }; }, [refresh]);
  const labels = { bluetooth: 'Bluetooth', location: t('Ubicación', 'Location'), camera: t('Cámara', 'Camera'), notifications: t('Notificaciones', 'Notifications') };
  const descriptions = {
    bluetooth: t('Conecta el teléfono con la sonda para recibir mediciones. En Android antiguo, buscar equipos también requiere ubicación. Si la radio está apagada, enciéndela en el teléfono.', 'Connects your phone to the probe to receive readings. Older Android versions also require location for scanning. If the radio is off, enable it on your phone.'),
    location: t('Añade coordenadas a la lectura y consulta el pronóstico en Open-Meteo. Sólo mientras usas la app; no rastreamos tu recorrido. Puedes medir sin coordenadas ni pronóstico.', 'Adds coordinates to readings and requests weather from Open-Meteo. Only while using the app; we do not track your route. You can measure without coordinates or forecasts.'),
    camera: t('Escanea el QR temporal para solicitar acceso a un equipo. No solicita acceso a tu galería ni al micrófono.', 'Scans temporary QR codes to request device access. It does not request gallery or microphone access.'),
    notifications: t('Permite recibir los avisos que elijas en Notificaciones. Puedes usar la app sin conceder este permiso.', 'Allows the alerts you select in Notifications. You can use the app without this permission.'),
  };
  const act = async (kind: PermissionKind) => {
    if (lock.current) return; lock.current = true; revision.current++; setBusy(true); setError('');
    try {
      const state = snapshot?.[kind];
      if (state?.status === 'granted' || !state?.canAskAgain) await Linking.openSettings();
      else { await requestPermission(kind, language); if (kind === 'notifications') await registerPushToken(useAppStore.getState().preferences, { requestPermission: false }); }
      await refresh();
    } catch { setError(t('No pudimos abrir los permisos. Inténtalo desde Ajustes del teléfono.', 'Could not open permissions. Try your phone settings.')); }
    finally { lock.current = false; setBusy(false); }
  };
  return <SettingsPage title={t('Permisos del teléfono', 'Phone permissions')} onBack={onBack} description={t('Tú decides qué autorizas. Los permisos los administra tu teléfono.', 'You choose what to allow. Your phone manages these permissions.')}>
    {!!error && <SettingsText danger>{error}</SettingsText>}
    {PERMISSION_KINDS.map(kind => { const state = snapshot?.[kind]; return <SettingsCard key={kind}>
      <SettingsText>{labels[kind]} · {state?.status === 'granted' ? t('Autorizado', 'Allowed') : state?.status === 'denied' ? t('No autorizado', 'Denied') : state?.status === 'unavailable' ? t('No disponible', 'Unavailable') : t('Por comprobar', 'Not confirmed')}</SettingsText>
      <SettingsText>{descriptions[kind]}</SettingsText>
      <SettingsButton title={state?.status === 'granted' || !state?.canAskAgain ? t('Abrir Ajustes del teléfono', 'Open phone settings') : t('Solicitar permiso', 'Request permission')} onPress={() => void act(kind)} disabled={busy || !state || state.status === 'unavailable'} />
    </SettingsCard>; })}
  </SettingsPage>;
}

export function SyncSettings({ onBack }: { onBack: () => void }) {
  const { t, locale } = useTranslation(); const [status, setStatus] = useState<Awaited<ReturnType<typeof syncStatus>> | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const lock = useRef(false);
  useEffect(() => { let alive = true; const read = () => void syncStatus().then(s => { if (alive) setStatus(s); }).catch(() => { if (alive) setMessage(t('No se pudo leer el estado local.', 'Could not read local status.')); }); read(); const timer = setInterval(read, 3000); return () => { alive = false; clearInterval(timer); }; }, [t]);
  const sync = async () => { if (lock.current) return; lock.current = true; setBusy(true); setMessage('');
    try { const result = await flushQueue(); setStatus(await syncStatus()); useAppStore.getState().setPendingCount(result.remaining); setMessage(result.remaining ? t('Quedan lecturas pendientes. Revisa la conexión y el acceso a tus equipos.', 'Some readings are pending. Check connectivity and device access.') : t('Sincronización completada.', 'Synchronization complete.')); }
    catch { setMessage(t('No se pudo sincronizar. Tus lecturas pendientes se conservan.', 'Could not synchronize. Pending readings are retained.')); }
    finally { lock.current = false; setBusy(false); }
  };
  return <SettingsPage title={t('Datos y sincronización', 'Data and synchronization')} onBack={onBack}>
    <SettingsCard><SettingsText>{t('Mediciones pendientes', 'Pending readings')}: {status?.pending ?? '—'}</SettingsText>
      <SettingsText>{t('Último envío confirmado desde este teléfono', 'Last confirmed upload from this phone')}: {status?.lastSentAt ? new Date(status.lastSentAt).toLocaleString(locale) : t('Sin registro', 'No record')}</SettingsText>
      <SettingsText>{t('Los envíos automáticos funcionan mientras la app está abierta. Antes de cerrar sesión, revisa los pendientes. Preparar un equipo para otro propietario elimina también sus lecturas pendientes.', 'Automatic uploads run while the app is open. Check pending readings before signing out. Preparing a device for another owner also deletes its pending readings.')}</SettingsText>
      <SettingsButton title={t('Sincronizar ahora', 'Sync now')} onPress={() => void sync()} busy={busy} />
    </SettingsCard>{!!message && <SettingsText>{message}</SettingsText>}
  </SettingsPage>;
}

type Release = { version: string; release_notes: string | null; is_mandatory: boolean; size_bytes: number | null };
export function FirmwareSettings({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation(); const [rows, setRows] = useState<{ device: DeviceRow; release: Release | null }[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false); const alive = useRef(true);
  const refresh = async () => { if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const devices = await listMyDevices(); const next = await Promise.all(devices.map(async device => { const { data, error: failure } = await supabase.rpc('check_firmware_update', { p_device_id: device.id }); if (failure) throw failure; return { device, release: (data?.[0] ?? null) as Release | null }; })); if (alive.current) setRows(next); }
    catch { if (alive.current) setError(t('No pudimos consultar las versiones. Reintenta con conexión.', 'Could not check versions. Retry online.')); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  useEffect(() => { alive.current = true; void refresh(); return () => { alive.current = false; }; }, []);
  return <SettingsPage title={t('Firmware de la sonda', 'Probe firmware')} description={t('Consulta aquí las novedades del ESP32, cuando tú decidas.', 'Check ESP32 updates here, whenever you choose.')} onBack={onBack}>
    <SettingsButton title={t('Buscar actualizaciones', 'Check for updates')} onPress={() => void refresh()} busy={busy} />
    {!!error && <SettingsText danger>{error}</SettingsText>}
    {!busy && !error && !rows.length && <SettingsText>{t('Vincula un equipo para consultar su firmware.', 'Link a device to check its firmware.')}</SettingsText>}
    {rows.map(({ device, release }) => <SettingsCard key={device.id}>
      <SettingsText>{device.alias || device.name} · {device.device_code}</SettingsText>
      <SettingsText>{t('Versión instalada', 'Installed version')}: {device.firmware_version || t('No informada', 'Not reported')}</SettingsText>
      <SettingsText>{release ? `${t('Disponible', 'Available')}: ${release.version}` : device.firmware_version ? t('No hay una versión más reciente publicada para este equipo.', 'No newer version is published for this device.') : t('El equipo debe informar su versión antes de comprobar compatibilidad.', 'The device must report its version before compatibility can be checked.')}</SettingsText>
      {!!release && <SettingsText>{release.release_notes || t('Sin descripción publicada.', 'No release notes published.')}</SettingsText>}
    </SettingsCard>)}
    <SettingsCard><SettingsText>{t('Instalación todavía no disponible', 'Installation not yet available')}</SettingsText><SettingsText>{t('Podrás instalar desde aquí cuando esté habilitada la actualización del equipo. No se ha descargado ni instalado ningún archivo. Por ahora, contacta a soporte si necesitas actualizar tu sonda.', 'Installation will be available here when device updates are enabled. No file has been downloaded or installed. Contact support if your probe needs an update.')}</SettingsText></SettingsCard>
  </SettingsPage>;
}

export function AboutSettings({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return <SettingsPage title={t('Acerca de y privacidad', 'About and privacy')} onBack={onBack}>
    <SettingsText>TerraSense · {Constants.expoConfig?.version ?? t('Versión no disponible', 'Version unavailable')}</SettingsText>
    <SettingsText>{t('Texto preliminar compartido con el registro. Falta completar el responsable y los plazos de conservación antes de publicarlo.', 'Draft shared with registration. The responsible party and retention periods must be completed before publication.')}</SettingsText>
    {legalSections(t).map(([title, body]) => <SettingsCard key={title}><Text accessibilityRole="header" style={{ fontWeight: '700' }}><SettingsText>{title}</SettingsText></Text><SettingsText>{body}</SettingsText></SettingsCard>)}
  </SettingsPage>;
}
export function ContactSettings({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation(); const [message, setMessage] = useState(''); const email = 'akurasoporte@gmail.com';
  const open = async () => { try { await Linking.openURL(`mailto:${email}?subject=${encodeURIComponent('Soporte TerraSense')}&body=${encodeURIComponent(t('Hola, equipo de soporte. Necesito ayuda con TerraSense.\n\nDescripción del problema:\n\nPasos que realicé:\n\nGracias.', 'Hello support team. I need help with TerraSense.\n\nProblem description:\n\nSteps I followed:\n\nThank you.'))}`); } catch { setMessage(t('No se pudo abrir el correo. Copia la dirección y úsala en tu aplicación de correo.', 'Could not open email. Copy the address and use your email application.')); } };
  return <SettingsPage title={t('Contacto', 'Contact')} onBack={onBack} description={t('Cuéntanos en qué podemos ayudarte.', 'Tell us how we can help.')}>
    <SettingsCard><SettingsText>{email}</SettingsText><SettingsText>{t('Se abrirá tu aplicación de correo con un mensaje editable. Tú decides qué incluir y cuándo enviarlo.', 'Your email app opens with an editable message. You decide what to include and when to send it.')}</SettingsText>
      <SettingsButton title={t('Escribir a soporte', 'Email support')} onPress={() => void open()} />
      <SettingsButton title={t('Copiar correo', 'Copy email')} onPress={() => void Clipboard.setStringAsync(email).then(() => setMessage(t('Correo copiado.', 'Email copied.'))).catch(() => setMessage(t('No se pudo copiar.', 'Could not copy.')))} />
    </SettingsCard>{!!message && <SettingsText>{message}</SettingsText>}
  </SettingsPage>;
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Text } from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { SettingsPage, SettingsCard, SettingsText, SettingsButton } from '../components/SettingsUI';
import { useTranslation } from '../hooks/useTranslation';
import { isLegacyAndroidBluetooth, openPermissionSettings, readPermissions } from '../services/permissionsService';
import { PERMISSION_KINDS, type PermissionKind, type PermissionSnapshot } from '../utils/permissionState';
import { PERMISSION_ACTIONS, PERMISSION_COPY, permissionStatusLabel, pick } from '../utils/permissionCopy';
import { askForAccess } from '../components/permissionPrompt';
import { registerPushToken } from '../services/notifications';
import { createAccountOperation } from '../utils/accountOperation';
import { createLatestOnly } from '../utils/latestOnly';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { flushQueue, syncStatus } from '../services/measurementsService';
import { listMyDevices } from '../services/deviceService';
import { supabase } from '../services/supabase';
import type { DeviceRow } from '../types/app';
import { legalSections } from '../utils/legalSections';

export function PhonePermissions({ onBack }: { onBack: () => void }) {
  const { t, language } = useTranslation(); const [snapshot, setSnapshot] = useState<PermissionSnapshot | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false); const latest = useRef(createLatestOnly());
  // Una continuación tras el permiso no escribe si la pantalla se cerró o cambió la cuenta.
  const accountOperation = useRef(createAccountOperation(useAuthStore.getState().session?.user.id, () => useAuthStore.getState().session?.user.id));
  // Una consulta antigua (lenta) nunca pisa una más nueva ni una acción en curso.
  const refresh = useCallback(() => latest.current.run(readPermissions, setSnapshot), []);
  // Consultar no abre diálogos. Se reconsulta al volver de los ajustes del teléfono.
  useEffect(() => { accountOperation.current.mount(); void refresh(); const sub = AppState.addEventListener('change', s => { if (s === 'active' && !lock.current) void refresh(); }); return () => { latest.current.invalidate(); accountOperation.current.unmount(); sub.remove(); }; }, [refresh]);
  const descriptions: Record<PermissionKind, string> = {
    bluetooth: `${t('Conecta el teléfono con la sonda para vincularla y recibir mediciones. Se pide al buscar o medir con la sonda.', 'Connects your phone to the probe to pair it and receive readings. Requested when you search for or measure with the probe.')}${isLegacyAndroidBluetooth() ? ` ${t('En este Android, buscar la sonda también usa la ubicación.', 'On this Android version, finding the probe also uses location.')}` : ''}`,
    location: t('Añade coordenadas a la lectura y consulta el pronóstico en Open-Meteo, si activas esa opción al medir. Sólo mientras usas la app; no rastreamos tu recorrido.', 'Adds coordinates to readings and requests the forecast from Open-Meteo, if you turn that option on when measuring. Only while you use the app; we do not track your route.'),
    camera: t('Escanea el QR temporal para solicitar acceso a un equipo. También puedes escribir el código. No accede a tu galería ni al micrófono.', 'Scans temporary QR codes to request device access. You can also type the code. It does not access your gallery or microphone.'),
    notifications: t('Recibe los avisos que elijas en Notificaciones. La app funciona igual sin este permiso.', 'Receives the alerts you choose in Notifications. The app works the same without this permission.'),
  };
  const act = async (kind: PermissionKind) => {
    if (lock.current) return; lock.current = true; latest.current.invalidate(); setBusy(true); setError('');
    const active = accountOperation.current.begin();
    try {
      const state = snapshot?.[kind];
      // Gestionar un permiso concedido o bloqueado es una acción voluntaria: abre los ajustes del teléfono.
      if (state && (state.status === 'granted' || (!state.canAskAgain && state.status !== 'restricted' && state.status !== 'unavailable'))) await openPermissionSettings();
      else {
        const access = await askForAccess(kind, language, active);
        if (!active()) return;
        // El permiso ya quedó decidido; registrar es aparte y su fallo no es un rechazo (Ajustes muestra el reintento).
        if (access.ok && kind === 'notifications') void registerPushToken(useAppStore.getState().preferences).catch(() => undefined);
        if (access.deniedNow) setError(pick(PERMISSION_COPY[kind].denied, language));
      }
      if (active()) await refresh();
    } catch { if (active()) setError(t('No pudimos abrir los permisos. Inténtalo desde los ajustes del teléfono.', 'Could not open permissions. Try your phone settings.')); }
    finally { lock.current = false; setBusy(false); }
  };
  const manage = (kind: PermissionKind) => { const state = snapshot?.[kind]; return !!state && (state.status === 'granted' || !state.canAskAgain); };
  return <SettingsPage title={t('Permisos del teléfono', 'Phone permissions')} onBack={onBack} description={t('Tú decides qué autorizas. Cada permiso se pide al usar su función, y los administra tu teléfono.', 'You choose what to allow. Each permission is requested when you use its feature, and your phone manages them.')}>
    {!!error && <SettingsText danger>{error}</SettingsText>}
    {PERMISSION_KINDS.map(kind => { const state = snapshot?.[kind]; const fixed = state?.status === 'unavailable' || state?.status === 'restricted'; return <SettingsCard key={kind}>
      <SettingsText>{pick(PERMISSION_COPY[kind].name, language)} · {permissionStatusLabel(state, language)}</SettingsText>
      <SettingsText>{descriptions[kind]}</SettingsText>
      {!fixed && <SettingsButton title={manage(kind) ? t('Abrir ajustes del teléfono', 'Open phone settings') : pick(PERMISSION_ACTIONS.request, language)} onPress={() => void act(kind)} disabled={busy || !state} />}
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
      <SettingsText>{t('Los envíos automáticos funcionan mientras la app está abierta. Antes de cerrar sesión, revisa los pendientes. Si soporte resetea un equipo, este teléfono descarta sus lecturas pendientes al volver a conectarse.', 'Automatic uploads run while the app is open. Check pending readings before signing out. If support resets a device, this phone discards its pending readings when it reconnects.')}</SettingsText>
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

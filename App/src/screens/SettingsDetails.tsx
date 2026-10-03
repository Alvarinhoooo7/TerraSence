import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Text, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { EntryButton } from '../components/entry/EntryUI';
import { ScreenStatus, ScreenValue } from '../components/screen/ScreenUI';
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
  const { colors } = useAppTheme();
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
  // «Sin decidir» no es un error: la app pide cada permiso recién al usar su función
  // (sección 9 del plan). Ubicación, por ejemplo, se pregunta al activar «Ubicación y
  // pronóstico» antes de medir. Aquí se puede adelantar o cambiar la decisión.
  const tone = (kind: PermissionKind): 'ok' | 'warn' | 'off' => {
    const state = snapshot?.[kind];
    if (!state) return 'off';
    if (state.status === 'granted' && !state.poweredOff) return 'ok';
    return state.status === 'denied' || !state.canAskAgain ? 'warn' : 'off';
  };
  return <SettingsPage eyebrow={t('PREFERENCIAS', 'PREFERENCES')} title={t('Permisos', 'Permissions')} onBack={onBack}
    description={t('Cada permiso se pide recién cuando usas su función, nunca todos al entrar. «Sin decidir» significa que todavía no la usaste; puedes adelantarlo aquí.', 'Each permission is requested only when you use its feature, never all at once. "Not decided" means you have not used it yet; you can grant it here in advance.')}>
    {!!error && <SettingsText danger>{error}</SettingsText>}
    {PERMISSION_KINDS.map(kind => { const state = snapshot?.[kind]; const fixed = state?.status === 'unavailable' || state?.status === 'restricted'; return <SettingsCard key={kind}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{pick(PERMISSION_COPY[kind].name, language)}</Text>
      <ScreenStatus tone={tone(kind)} label={permissionStatusLabel(state, language)} />
      <SettingsText>{descriptions[kind]}</SettingsText>
      {!fixed && <EntryButton secondary label={manage(kind) ? t('Abrir ajustes del teléfono', 'Open phone settings') : pick(PERMISSION_ACTIONS.request, language)} onPress={() => void act(kind)} disabled={busy || !state} />}
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
  return <SettingsPage eyebrow={t('EQUIPOS Y DATOS', 'DEVICES AND DATA')} title={t('Sincronización', 'Synchronization')} onBack={onBack}
    description={t('Tus lecturas se guardan primero en el teléfono y se envían a la nube cuando hay conexión.', 'Your readings are saved on the phone first and sent to the cloud when there is a connection.')}
    footer={<SettingsButton title={t('Sincronizar ahora', 'Sync now')} onPress={() => void sync()} busy={busy} />}>
    <SettingsCard>
      <ScreenValue label={t('Pendientes de enviar', 'Pending upload')} value={status ? String(status.pending) : '—'} />
      <ScreenValue label={t('Último envío confirmado', 'Last confirmed upload')} value={status?.lastSentAt ? new Date(status.lastSentAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : t('Sin registro', 'No record')} />
    </SettingsCard>
    {!!message && <SettingsText>{message}</SettingsText>}
    <SettingsText>{t('Los envíos automáticos funcionan mientras la app está abierta. Antes de cerrar sesión, revisa los pendientes. Si soporte resetea un equipo, este teléfono descarta sus lecturas pendientes al volver a conectarse.', 'Automatic uploads run while the app is open. Check pending readings before signing out. If support resets a device, this phone discards its pending readings when it reconnects.')}</SettingsText>
  </SettingsPage>;
}

type Release = { version: string; release_notes: string | null; is_mandatory: boolean; size_bytes: number | null };
export function FirmwareSettings({ onBack }: { onBack: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation(); const [rows, setRows] = useState<{ device: DeviceRow; release: Release | null }[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false); const alive = useRef(true);
  const refresh = async () => { if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const devices = await listMyDevices(); const next = await Promise.all(devices.map(async device => { const { data, error: failure } = await supabase.rpc('check_firmware_update', { p_device_id: device.id }); if (failure) throw failure; return { device, release: (data?.[0] ?? null) as Release | null }; })); if (alive.current) setRows(next); }
    catch { if (alive.current) setError(t('No pudimos consultar las versiones. Reintenta con conexión.', 'Could not check versions. Retry online.')); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  useEffect(() => { alive.current = true; void refresh(); return () => { alive.current = false; }; }, []);
  return <SettingsPage eyebrow={t('EQUIPOS Y DATOS', 'DEVICES AND DATA')} title={t('Actualizaciones', 'Updates')} description={t('El firmware es el programa interno de la sonda. Consulta aquí si hay una versión nueva.', 'Firmware is the probe’s internal program. Check here whether a new version is available.')} onBack={onBack}
    footer={<EntryButton secondary label={t('Buscar actualizaciones', 'Check for updates')} onPress={() => void refresh()} busy={busy} />}>
    {!!error && <SettingsText danger>{error}</SettingsText>}
    {!busy && !error && !rows.length && <SettingsText>{t('Vincula un equipo para consultar su firmware.', 'Link a device to check its firmware.')}</SettingsText>}
    {rows.map(({ device, release }) => <SettingsCard key={device.id}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{device.alias || device.name}</Text>
      <ScreenValue label={t('Versión instalada', 'Installed version')} value={device.firmware_version || t('No informada', 'Not reported')} />
      <ScreenStatus tone={release ? 'warn' : 'ok'} label={release ? t(`Disponible ${release.version}`, `${release.version} available`) : t('Al día', 'Up to date')} />
      <SettingsText>{release ? `${t('Disponible', 'Available')}: ${release.version}` : device.firmware_version ? t('No hay una versión más reciente publicada para este equipo.', 'No newer version is published for this device.') : t('El equipo debe informar su versión antes de comprobar compatibilidad.', 'The device must report its version before compatibility can be checked.')}</SettingsText>
      {!!release && <SettingsText>{release.release_notes || t('Sin descripción publicada.', 'No release notes published.')}</SettingsText>}
    </SettingsCard>)}
    <SettingsCard><SettingsText>{t('Instalación todavía no disponible', 'Installation not yet available')}</SettingsText><SettingsText>{t('Podrás instalar desde aquí cuando esté habilitada la actualización del equipo. No se ha descargado ni instalado ningún archivo. Por ahora, contacta a soporte si necesitas actualizar tu sonda.', 'Installation will be available here when device updates are enabled. No file has been downloaded or installed. Contact support if your probe needs an update.')}</SettingsText></SettingsCard>
  </SettingsPage>;
}

export function AboutSettings({ onBack }: { onBack: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  return <SettingsPage eyebrow={t('AYUDA Y PRIVACIDAD', 'HELP AND PRIVACY')} title={t('Términos y privacidad', 'Terms and privacy')} onBack={onBack}
    description={t('El mismo texto que aceptaste al crear tu cuenta.', 'The same text you accepted when creating your account.')}>
    <SettingsCard>
      <ScreenValue label="TerraSense" value={`${t('Versión', 'Version')} ${Constants.expoConfig?.version ?? '—'}`} />
    </SettingsCard>
    {legalSections(t).map(([title, body]) => <View key={title} style={{ gap: 6, marginTop: 4 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{title}</Text>
      <SettingsText>{body}</SettingsText>
    </View>)}
    <SettingsText>{t('Texto preliminar: falta completar el responsable y los plazos de conservación antes de publicarlo.', 'Draft: the responsible party and retention periods must be completed before publication.')}</SettingsText>
  </SettingsPage>;
}
export function ContactSettings({ onBack }: { onBack: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation(); const [message, setMessage] = useState(''); const email = 'akurasoporte@gmail.com';
  const open = async () => { try { await Linking.openURL(`mailto:${email}?subject=${encodeURIComponent('Soporte TerraSense')}&body=${encodeURIComponent(t('Hola, equipo de soporte. Necesito ayuda con TerraSense.\n\nDescripción del problema:\n\nPasos que realicé:\n\nGracias.', 'Hello support team. I need help with TerraSense.\n\nProblem description:\n\nSteps I followed:\n\nThank you.'))}`); } catch { setMessage(t('No se pudo abrir el correo. Copia la dirección y úsala en tu aplicación de correo.', 'Could not open email. Copy the address and use your email application.')); } };
  return <SettingsPage eyebrow={t('AYUDA Y PRIVACIDAD', 'HELP AND PRIVACY')} title={t('Soporte', 'Support')} onBack={onBack}
    description={t('Cuéntanos en qué podemos ayudarte. Se abre tu correo con un mensaje que puedes editar antes de enviarlo.', 'Tell us how we can help. Your email opens with a message you can edit before sending it.')}
    footer={<SettingsButton title={t('Escribir a soporte', 'Email support')} onPress={() => void open()} />}>
    <SettingsCard>
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>{t('CORREO DE SOPORTE', 'SUPPORT EMAIL')}</Text>
      <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{email}</Text>
      <EntryButton secondary label={t('Copiar correo', 'Copy email')} onPress={() => void Clipboard.setStringAsync(email).then(() => setMessage(t('Correo copiado.', 'Email copied.'))).catch(() => setMessage(t('No se pudo copiar.', 'Could not copy.')))} />
    </SettingsCard>
    {!!message && <SettingsText>{message}</SettingsText>}
  </SettingsPage>;
}

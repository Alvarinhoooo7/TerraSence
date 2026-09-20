import React, { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { SettingsButton, SettingsCard, SettingsInput, SettingsText } from './SettingsUI';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../services/supabase';
import { prepareDeviceForOwner } from '../services/deviceService';
import { reconcileDeviceResets } from '../services/measurementsService';
import type { DeviceRow } from '../types/app';

export function PrepareDevicePanel({ device, onComplete, onBusyChange }: { device: DeviceRow; onComplete: () => void; onBusyChange: (busy: boolean) => void }) {
  const { t } = useTranslation(); const [expanded, setExpanded] = useState(false); const [code, setCode] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false);
  const first = () => Alert.alert(t('Preparar equipo para otro propietario', 'Prepare device for another owner'), t(`Equipo: ${device.alias || device.name} (${device.device_code}). Se borrarán todas sus mediciones de la nube, configuración guardada, avisos y solicitudes. Todos sus miembros perderán acceso. No se conservará el historial. Los demás equipos no se modificarán.`, `Device: ${device.alias || device.name} (${device.device_code}). All cloud readings, saved configuration, alerts and requests will be deleted. All members lose access. History will not be retained. Other devices remain unchanged.`), [{ text: t('Cancelar', 'Cancel'), style: 'cancel' }, { text: t('Entiendo, continuar', 'I understand, continue'), style: 'destructive', onPress: () => setExpanded(true) }]);
  const run = async () => {
    if (lock.current) return; lock.current = true; onBusyChange(true); setBusy(true); setError(''); let reset = false;
    try {
      const { data: account, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !account.user?.email) throw sessionError ?? new Error('No user');
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: account.user.email, password });
      setPassword('');
      if (authError || data.user?.id !== account.user.id) throw authError ?? new Error('Account changed');
      await prepareDeviceForOwner(device.id, code); reset = true;
      await reconcileDeviceResets();
      Alert.alert(t('Datos del equipo eliminados', 'Device data deleted'), t('Se borraron los datos de la nube y las copias locales de este teléfono. Los otros teléfonos limpiarán sus copias al conectarse. El firmware se conserva. La memoria física de la sonda no se ha borrado: consulta a soporte antes de entregarla. Soporte deberá verificar la entrega y habilitar al nuevo propietario.', 'Cloud data and local copies on this phone were deleted. Other phones clean their copies when they reconnect. Firmware is unchanged. Physical probe memory has not been erased: contact support before handing it over. Support must verify the handover and enable the new owner.'));
      onComplete();
    } catch { setPassword(''); if (reset) { Alert.alert(t('Datos remotos eliminados', 'Remote data deleted'), t('La limpieza local no terminó. Vuelve a conectar este teléfono para completarla antes de entregarlo.', 'Local cleanup did not finish. Reconnect this phone to finish before handing it over.')); onComplete(); } else setError(t('No se confirmó el borrado. Revisa tu contraseña, el código, la conexión y tus permisos. No repitas la operación sin comprobar el estado del equipo.', 'Deletion was not confirmed. Check your password, code, connection and permissions. Check device status before retrying.')); }
    finally { lock.current = false; onBusyChange(false); setBusy(false); }
  };
  return <SettingsCard><SettingsText danger>{t('Preparar equipo para otro propietario', 'Prepare device for another owner')}</SettingsText>
    <SettingsText>{t('Elimina el historial y todos los accesos de este equipo. Es irreversible. No reinstala ni modifica el firmware. La activación del nuevo propietario requiere contactar a akurasoporte@gmail.com.', 'Deletes this device’s history and all access. This is irreversible. Firmware is not reinstalled or modified. Activating the new owner requires contacting akurasoporte@gmail.com.')}</SettingsText>
    {!expanded ? <SettingsButton title={t('Revisar eliminación', 'Review deletion')} danger onPress={first} /> : <>
      <SettingsText>{t('Segunda confirmación: escribe el código completo y tu contraseña. Se borrarán también las lecturas pendientes de este equipo en los teléfonos cuando se conecten. No es posible borrar a distancia un teléfono sin conexión. La limpieza física de la memoria del ESP32 requiere soporte del equipo y no se ejecutará desde esta app.', 'Second confirmation: enter the full code and your password. Pending readings on other phones will also be deleted when they reconnect. An offline phone cannot be erased remotely. Erasing ESP32 physical memory requires device support and will not run from this app.')}</SettingsText>
      <SettingsInput label={t('Código del equipo', 'Device code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={15} editable={!busy} />
      <SettingsInput label={t('Tu contraseña actual', 'Your current password')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" editable={!busy} />
      {!!error && <SettingsText danger>{error}</SettingsText>}
      <SettingsButton title={t('Eliminar datos y liberar equipo', 'Delete data and release device')} danger busy={busy} disabled={code !== device.device_code || !password} onPress={() => void run()} />
      <SettingsButton title={t('Cancelar', 'Cancel')} disabled={busy} onPress={() => { setExpanded(false); setPassword(''); setCode(''); setError(''); }} />
    </>}
  </SettingsCard>;
}

import React, { useEffect, useRef, useState } from 'react';
import { SettingsPage, SettingsCard, SettingsText, SettingsInput, SettingsButton } from '../components/SettingsUI';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { isPasswordAcceptable } from '../utils/passwordRules';
import { PasswordChecklist } from '../components/PasswordChecklist';

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation(); const user = useAuthStore(s => s.session?.user);
  const [name, setName] = useState(''); const [surname, setSurname] = useState('');
  const [current, setCurrent] = useState(''); const [password, setPassword] = useState(''); const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false); const [loaded, setLoaded] = useState(false); const [message, setMessage] = useState('');
  const lock = useRef(false); const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('profiles').select('first_name,last_name').eq('id', user.id).single();
    if (!alive.current) return;
    if (error) setMessage(t('No pudimos cargar tu perfil. Reintenta con conexión.', 'Could not load your profile. Retry online.'));
    else { setName(data.first_name ?? ''); setSurname(data.last_name ?? ''); setLoaded(true); }
  };
  useEffect(() => { void load(); }, [user?.id]);
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage('');
    try { await work(); } catch { if (alive.current) setMessage(t('No se pudo completar. Comprueba tu conexión y tus datos e inténtalo otra vez.', 'Could not complete this action. Check your connection and details, then retry.')); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  const save = () => run(async () => {
    if (!user || !name.trim()) return;
    const { error } = await supabase.from('profiles').update({ first_name: name.trim(), last_name: surname.trim() }).eq('id', user.id);
    if (error) throw error;
    if (alive.current) setMessage(t('Nombre guardado.', 'Name saved.'));
  });
  const changePassword = () => run(async () => {
    if (!user?.email || !isPasswordAcceptable(password) || password !== repeat) return;
    const { data, error } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (error || data.user?.id !== user.id) throw error ?? new Error('Account changed');
    const result = await supabase.auth.updateUser({ password });
    if (result.error) throw result.error;
    if (alive.current) { setCurrent(''); setPassword(''); setRepeat(''); setMessage(t('Contraseña actualizada.', 'Password updated.')); }
  });
  return <SettingsPage title={t('Mi perfil', 'My profile')} onBack={onBack} description={t('Tus datos y la seguridad de tu cuenta.', 'Your details and account security.')}>
    {!!message && <SettingsText>{message}</SettingsText>}
    {!loaded ? <SettingsButton title={t('Cargar perfil', 'Load profile')} onPress={() => void run(load)} busy={busy} /> : <SettingsCard>
      <SettingsInput label={t('Nombre', 'First name')} value={name} onChangeText={setName} maxLength={80} editable={!busy} autoComplete="given-name" />
      <SettingsInput label={t('Apellido', 'Last name')} value={surname} onChangeText={setSurname} maxLength={80} editable={!busy} autoComplete="family-name" />
      <SettingsText>{user?.email}</SettingsText><SettingsText>{user?.email_confirmed_at ? t('Correo verificado', 'Verified email') : t('Correo pendiente de verificación', 'Email verification pending')}</SettingsText>
      <SettingsButton title={t('Guardar nombre', 'Save name')} onPress={() => void save()} busy={busy} disabled={!name.trim()} />
    </SettingsCard>}
    <SettingsCard>
      <SettingsText>{t('Cambiar contraseña. Confirma tu contraseña actual para proteger tu cuenta.', 'Change password. Confirm your current password to protect your account.')}</SettingsText>
      <SettingsInput label={t('Contraseña actual', 'Current password')} value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" autoComplete="current-password" editable={!busy} />
      <SettingsInput label={t('Nueva contraseña', 'New password')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" editable={!busy} />
      <PasswordChecklist password={password} />
      <SettingsInput label={t('Repetir nueva contraseña', 'Repeat new password')} value={repeat} onChangeText={setRepeat} secureTextEntry autoCapitalize="none" autoComplete="new-password" editable={!busy} />
      <SettingsButton title={t('Actualizar contraseña', 'Update password')} onPress={() => void changePassword()} busy={busy} disabled={!current || !isPasswordAcceptable(password) || password !== repeat || password === current} />
    </SettingsCard>
  </SettingsPage>;
}

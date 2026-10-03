import React, { useEffect, useRef, useState } from 'react';
import { SettingsPage, SettingsCard, SettingsText, SettingsButton, SettingsRow } from '../components/SettingsUI';
import { AccessField } from '../components/auth/AccessField';
import { BackHandler } from 'react-native';
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
  const [passwordPage, setPasswordPage] = useState(false);
  const back = () => { if (busy) return; if (passwordPage) { setPasswordPage(false); setMessage(''); setCurrent(''); setPassword(''); setRepeat(''); } else onBack(); };
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (busy) return true; if (!passwordPage) return false; back(); return true; }); return () => sub.remove(); }, [busy, passwordPage]);
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
  return <SettingsPage eyebrow={passwordPage ? t('MI PERFIL', 'MY PROFILE') : t('CUENTA', 'ACCOUNT')} title={passwordPage ? t('Cambiar contraseña', 'Change password') : t('Mi perfil', 'My profile')} onBack={back}
    description={passwordPage ? t('Confirma tu contraseña actual para proteger tu cuenta.', 'Confirm your current password to protect your account.') : t('Tus datos y la seguridad de tu cuenta.', 'Your details and account security.')}
    footer={passwordPage ? <SettingsButton title={t('Actualizar contraseña', 'Update password')} onPress={() => void changePassword()} busy={busy} disabled={!current || !isPasswordAcceptable(password) || password !== repeat || password === current} /> : loaded ? <SettingsButton title={t('Guardar nombre', 'Save name')} onPress={() => void save()} busy={busy} disabled={!name.trim()} /> : undefined}>
    {!!message && <SettingsText>{message}</SettingsText>}
    {!passwordPage && <>{!loaded ? <SettingsButton title={t('Cargar perfil', 'Load profile')} onPress={() => void run(load)} busy={busy} /> : <SettingsCard>
      <AccessField label={t('Nombre', 'First name')} value={name} onChangeText={setName} maxLength={80} editable={!busy} autoComplete="given-name" />
      <AccessField label={t('Apellido', 'Last name')} value={surname} onChangeText={setSurname} maxLength={80} editable={!busy} autoComplete="family-name" />
      <SettingsText>{user?.email}</SettingsText><SettingsText>{user?.email_confirmed_at ? t('Correo verificado', 'Verified email') : t('Correo pendiente de verificación', 'Email verification pending')}</SettingsText>
    </SettingsCard>}<SettingsRow title={t('Cambiar contraseña', 'Change password')} onPress={() => { setMessage(''); setPasswordPage(true); }} /></>}
    {passwordPage && <>
      <AccessField label={t('Contraseña actual', 'Current password')} value={current} onChangeText={setCurrent} secret autoComplete="current-password" editable={!busy} />
      <AccessField label={t('Nueva contraseña', 'New password')} value={password} onChangeText={setPassword} secret autoComplete="new-password" textContentType="newPassword" editable={!busy} />
      <PasswordChecklist password={password} compact />
      <AccessField label={t('Repetir nueva contraseña', 'Repeat new password')} value={repeat} onChangeText={setRepeat} secret autoComplete="new-password" textContentType="newPassword" editable={!busy} />
    </>}
  </SettingsPage>;
}

import React, { useRef, useState } from 'react';
import { BackHandler, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../services/supabase';
import { EntryLayout, EntryHeading, EntryButton } from '../components/entry/EntryUI';
import { AccessField } from '../components/auth/AccessField';
import { useTranslation } from '../hooks/useTranslation';
import { isPasswordAcceptable, PASSWORD_MIN_LENGTH } from '../utils/passwordRules';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { useAppTheme } from '../hooks/useAppTheme';

export const ResetPasswordScreen = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const confirmInput = useRef<TextInput>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const locked = useRef(false);
  const passwordSaved = useRef(false);
  React.useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => listener.remove();
  }, []);

  const cancel = async () => {
    if (locked.current) return;
    Keyboard.dismiss();
    locked.current = true; setBusy(true); setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
      onDone();
    } catch {
      setError(t('No pudimos cerrar la recuperación. Inténtalo otra vez.', 'Could not close recovery. Please try again.'));
    } finally { locked.current = false; setBusy(false); }
  };

  const submit = async () => {
    if (locked.current) return;
    setError(null);
    if (!passwordSaved.current && !isPasswordAcceptable(password)) {
      setError(t(`Usa al menos ${PASSWORD_MIN_LENGTH} caracteres, una letra, un número y un carácter especial.`, `Use at least ${PASSWORD_MIN_LENGTH} characters, a letter, a number and a special character.`));
      return;
    }
    if (!passwordSaved.current && password !== confirm) {
      setError(t('Las contraseñas no coinciden.', 'Passwords do not match.'));
      return;
    }

    Keyboard.dismiss();
    locked.current = true; setBusy(true);
    try {
      if (!passwordSaved.current) {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        passwordSaved.current = true;
        setPassword(''); setConfirm('');
      }
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
        if (localError) throw localError;
      }
      setSuccess(true);
    } catch (e) {
      const samePassword = e instanceof Error && /same.password/i.test(e.message);
      setError(samePassword ? t('Elige una contraseña distinta de la anterior.', 'Choose a password different from your old one.') : t('No pudimos completar el cambio. Revisa tu conexión o solicita otro código.', 'Could not complete the change. Check your connection or request a new code.'));
    } finally { locked.current = false; setBusy(false); }
  };

  return <EntryLayout keyboardAware footer={<View style={styles.footer}>
    <EntryButton label={success ? t('Ir a iniciar sesión', 'Go to sign in') : passwordSaved.current ? t('Finalizar recuperación', 'Finish recovery') : t('Guardar contraseña', 'Save password')}
      busy={busy} onPress={() => success ? onDone() : void submit()} />
    {!success && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void cancel(); }} style={styles.link}>
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('Cancelar recuperación', 'Cancel recovery')}</Text>
    </Pressable>}
  </View>}>
    <View style={styles.body}>
      <EntryHeading eyebrow={success ? t('TODO LISTO', 'ALL SET') : t('NUEVA CONTRASEÑA', 'NEW PASSWORD')}
        title={passwordSaved.current ? t('Contraseña actualizada', 'Password updated') : t('Crea una contraseña', 'Create a password')}
        description={success ? t('Entra con tu nueva contraseña.', 'Sign in with your new password.') : passwordSaved.current ? t('Finaliza la recuperación para volver al acceso.', 'Finish recovery to return to sign in.') : t('Usa una contraseña segura para tu cuenta.', 'Choose a secure password for your account.')} />
      {!passwordSaved.current && <>
        <AccessField label={t('Contraseña nueva', 'New password')} secret value={password} onChangeText={setPassword}
          editable={!busy && !passwordSaved.current} autoComplete="new-password" textContentType="newPassword"
          returnKeyType="next" onSubmitEditing={() => confirmInput.current?.focus()} />
        <PasswordChecklist password={password} compact />
        <AccessField ref={confirmInput} label={t('Confirmar contraseña', 'Confirm password')} secret value={confirm} onChangeText={setConfirm}
          error={confirm.length > 0 && confirm !== password ? t('Las contraseñas no coinciden.', 'Passwords do not match.') : undefined}
          editable={!busy && !passwordSaved.current} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={() => void submit()} />
      </>}
      {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    </View>
  </EntryLayout>;
};

const styles = StyleSheet.create({ body: { width: '100%', gap: 12 }, footer: { width: '100%' }, link: { minHeight: 48, alignItems: 'center', justifyContent: 'center' } });

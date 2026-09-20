import React, { useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { layoutFlow } from '../constants/motion';
import { supabase } from '../services/supabase';
import { AuthLayout, AuthHeading, AuthField, AuthButton, AuthMessage, authStyles } from '../components/auth/AuthUI';
import { useTranslation } from '../hooks/useTranslation';
import { isPasswordAcceptable, PASSWORD_MIN_LENGTH } from '../utils/passwordRules';
import { PasswordChecklist } from '../components/PasswordChecklist';

export const ResetPasswordScreen = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation();
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
    if (!isPasswordAcceptable(password)) {
      setError(t(`Usa al menos ${PASSWORD_MIN_LENGTH} caracteres, una letra, un número y un carácter especial.`, `Use at least ${PASSWORD_MIN_LENGTH} characters, a letter, a number and a special character.`));
      return;
    }
    if (password !== confirm) {
      setError(t('Las contraseñas no coinciden.', 'Passwords do not match.'));
      return;
    }

    locked.current = true; setBusy(true);
    try {
      if (!passwordSaved.current) {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        passwordSaved.current = true;
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

  return <AuthLayout>
    <AuthHeading eyebrow={success ? t('TODO LISTO', 'ALL SET') : t('UNA NUEVA CONTRASEÑA', 'A NEW PASSWORD')}
      title={success ? t('Vuelve a tu campo.', 'Back to your field.') : t('Un nuevo comienzo.', 'A fresh start.')}
      description={success ? t('Tu contraseña se actualizó. Inicia sesión con la nueva para continuar.', 'Your password was updated. Sign in with your new password to continue.') : t('Elige una contraseña que uses solo para TerraSense.', 'Choose a password you only use for TerraSense.')} />
    {success ? <AuthButton label={t('Ir a iniciar sesión', 'Go to sign in')} onPress={onDone} /> : <Animated.View layout={layoutFlow()} style={authStyles.form}>
      <AuthField label={t('Contraseña nueva', 'New password')} secret value={password} onChangeText={setPassword}
        editable={!busy && !passwordSaved.current} autoComplete="new-password" textContentType="newPassword" />
      <PasswordChecklist password={password} />
      <AuthField label={t('Confirmar contraseña', 'Confirm password')} secret value={confirm} onChangeText={setConfirm}
        editable={!busy && !passwordSaved.current} autoComplete="new-password" textContentType="newPassword" />
      {error && <AuthMessage error>{error}</AuthMessage>}
      <AuthButton label={passwordSaved.current ? t('Finalizar recuperación', 'Finish recovery') : t('Guardar contraseña', 'Save password')} busy={busy} onPress={() => { void submit(); }} />
      <AuthButton secondary disabled={busy} label={t('Volver al inicio de sesión', 'Back to sign in')} onPress={() => { void cancel(); }} />
    </Animated.View>}
  </AuthLayout>;
};

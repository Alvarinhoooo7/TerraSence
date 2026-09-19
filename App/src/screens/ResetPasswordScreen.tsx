import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { isPasswordAcceptable, PASSWORD_MIN_LENGTH } from '../utils/passwordRules';
import { PasswordChecklist } from '../components/PasswordChecklist';

export const ResetPasswordScreen = ({ onDone }: { onDone: () => void }) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const locked = useRef(false);
  const passwordSaved = useRef(false);

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
      setError(e instanceof Error ? e.message : t('No pudimos actualizar la contraseña. Inténtalo otra vez.', 'Could not update your password. Try again.'));
    } finally { locked.current = false; setBusy(false); }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.center}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.icon}>{success ? '✅' : '🔑'}</Text>
          <Text style={[Typography.titleLarge, styles.title, { color: colors.text }]}>
            {success
              ? t('Contraseña actualizada', 'Password updated')
              : t('Elige tu contraseña nueva', 'Choose your new password')}
          </Text>
          {success ? (
            <>
              <Text style={[Typography.bodyRegular, styles.help, { color: colors.textSecondary }]}>
                {t('El cambio se guardó correctamente. Entra con tu contraseña nueva.', 'Your password was changed. Sign in with your new password.')}
              </Text>
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onDone}>
                <Text style={styles.buttonText}>{t('Ir a iniciar sesión', 'Go to sign in')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder={t('Contraseña nueva', 'New password')}
                placeholderTextColor={colors.textMuted}
                value={password}
                editable={!busy && !passwordSaved.current}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder={t('Confirmar contraseña', 'Confirm password')}
                placeholderTextColor={colors.textMuted}
                value={confirm}
                editable={!busy && !passwordSaved.current}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
              />
              {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
              <PasswordChecklist password={password} />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
                onPress={() => void submit()}
                disabled={busy}
              >
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{passwordSaved.current ? t('Finalizar recuperación', 'Finish recovery') : t('Guardar contraseña', 'Save password')}</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  card: { borderWidth: 1, borderRadius: Spacing.cardRadius, padding: Spacing.lg, gap: Spacing.md },
  icon: { fontSize: 46, textAlign: 'center' },
  title: { textAlign: 'center' },
  help: { textAlign: 'center' },
  input: { height: 54, borderWidth: 1, borderRadius: Spacing.borderRadius, paddingHorizontal: Spacing.md, ...Typography.bodyRegular },
  error: { ...Typography.caption },
  button: { height: 56, borderRadius: Spacing.borderRadius, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...Typography.button, color: '#FFFFFF' },
});

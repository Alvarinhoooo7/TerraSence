import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

export const ResetPasswordScreen = ({ onDone }: { onDone: () => void }) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 6) {
      setError(t('La contraseña debe tener al menos 6 caracteres.', 'Password must be at least 6 characters long.'));
      return;
    }
    if (password !== confirm) {
      setError(t('Las contraseñas no coinciden.', 'Passwords do not match.'));
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }
    await supabase.auth.signOut();
    setSuccess(true);
    setBusy(false);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
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
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder={t('Confirmar contraseña', 'Confirm password')}
                placeholderTextColor={colors.textMuted}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
              />
              {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
                onPress={() => void submit()}
                disabled={busy}
              >
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{t('Guardar contraseña', 'Save password')}</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  card: { borderWidth: 1, borderRadius: Spacing.cardRadius, padding: Spacing.lg, gap: Spacing.md },
  icon: { fontSize: 46, textAlign: 'center' },
  title: { textAlign: 'center' },
  help: { textAlign: 'center' },
  input: { height: 54, borderWidth: 1, borderRadius: Spacing.borderRadius, paddingHorizontal: Spacing.md, ...Typography.bodyRegular },
  error: { ...Typography.caption },
  button: { height: 56, borderRadius: Spacing.borderRadius, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...Typography.button, color: '#FFFFFF' },
});

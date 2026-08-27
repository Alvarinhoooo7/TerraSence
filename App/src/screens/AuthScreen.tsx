// src/screens/AuthScreen.tsx
//
// Registro, inicio de sesión y recuperación de contraseña.
// Adaptado de AuthScreen.tsx del proyecto Akura.
//
// Sin sesión activa las políticas RLS de Supabase bloquean toda lectura y
// escritura, así que esta pantalla es la puerta de entrada real de la app.

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { Colors, Spacing, Typography } from '../constants/theme';

type Mode = 'signin' | 'signup' | 'reset';

const MODE_COPY: Record<Mode, { title: string; cta: string; hint: string }> = {
  signin: {
    title: 'Entrar a TerraSense',
    cta: 'Entrar',
    hint: 'Usa el correo con el que registraste tu equipo.',
  },
  signup: {
    title: 'Crear cuenta',
    cta: 'Crear cuenta',
    hint: 'Te enviaremos un correo para confirmar tu cuenta.',
  },
  reset: {
    title: 'Recuperar contraseña',
    cta: 'Enviar enlace',
    hint: 'Te enviaremos un enlace para elegir una contraseña nueva.',
  },
};

/** Mensajes de Supabase traducidos a algo accionable para el agricultor. */
const humanizeError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.';
  }
  if (m.includes('email not confirmed')) {
    return 'Tu cuenta aún no está confirmada. Busca el correo de confirmación que te enviamos.';
  }
  if (m.includes('user already registered')) {
    return 'Ya existe una cuenta con ese correo. Entra o recupera tu contraseña.';
  }
  if (m.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Sin conexión. Conéctate a internet para entrar la primera vez.';
  }
  return message;
};

interface Props {
  onAuthenticated: () => void;
}

export const AuthScreen: React.FC<Props> = ({ onAuthenticated }) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const copy = MODE_COPY[mode];

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    setNotice(null);

    const mail = email.trim().toLowerCase();
    if (!mail.includes('@')) {
      setError('Escribe un correo válido.');
      return;
    }
    if (mode !== 'reset' && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: e } = await supabase.auth.signInWithPassword({
          email: mail,
          password,
        });
        if (e) throw e;
        onAuthenticated();
        return;
      }

      if (mode === 'signup') {
        const { error: e } = await supabase.auth.signUp({
          email: mail,
          password,
          // El trigger handle_new_user copia full_name a public.profiles.
          options: { data: { full_name: fullName.trim() } },
        });
        if (e) throw e;
        setNotice(
          'Cuenta creada. Revisa tu correo y confirma la cuenta antes de entrar.',
        );
        setMode('signin');
        return;
      }

      const { error: e } = await supabase.auth.resetPasswordForEmail(mail);
      if (e) throw e;
      setNotice('Te enviamos un enlace para elegir una contraseña nueva.');
      setMode('signin');
    } catch (err) {
      setError(humanizeError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  }, [email, password, fullName, mode, onAuthenticated]);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.logo}>🌱</Text>
          <Text style={[styles.brand, { color: colors.primary }]}>TerraSense</Text>
          <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{copy.hint}</Text>

          {mode === 'signup' && (
            <TextInput
              style={inputStyle}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              accessibilityLabel="Nombre completo"
            />
          )}

          <TextInput
            style={inputStyle}
            placeholder="Correo"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            inputMode="email"
            accessibilityLabel="Correo electrónico"
          />

          {mode !== 'reset' && (
            <TextInput
              style={inputStyle}
              placeholder="Contraseña"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel="Contraseña"
            />
          )}

          {error && (
            <View style={[styles.banner, { backgroundColor: colors.danger }]}>
              <Text style={styles.bannerText}>{error}</Text>
            </View>
          )}
          {notice && (
            <View style={[styles.banner, { backgroundColor: colors.success }]}>
              <Text style={styles.bannerText}>{notice}</Text>
            </View>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            onPress={submit}
            disabled={busy}
            style={[styles.cta, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>{copy.cta}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.links}>
            {mode !== 'signin' && (
              <TouchableOpacity onPress={() => switchMode('signin')} style={styles.link}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Ya tengo cuenta</Text>
              </TouchableOpacity>
            )}
            {mode !== 'signup' && (
              <TouchableOpacity onPress={() => switchMode('signup')} style={styles.link}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Crear cuenta</Text>
              </TouchableOpacity>
            )}
            {mode !== 'reset' && (
              <TouchableOpacity onPress={() => switchMode('reset')} style={styles.link}>
                <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                  Olvidé mi contraseña
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.sm },
  logo: { fontSize: 48, textAlign: 'center' },
  brand: { ...Typography.titleLarge, textAlign: 'center', marginBottom: Spacing.lg },
  title: { ...Typography.titleLarge, marginBottom: Spacing.xs },
  hint: { ...Typography.caption, marginBottom: Spacing.md },
  input: {
    height: 54,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyRegular,
  },
  banner: {
    borderRadius: Spacing.borderRadius,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  bannerText: { ...Typography.caption, color: '#FFFFFF' },
  cta: {
    height: 56,
    borderRadius: Spacing.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  ctaText: { ...Typography.button, color: '#FFFFFF', fontSize: 17 },
  links: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  link: { minHeight: Spacing.touchTarget, justifyContent: 'center' },
  linkText: { ...Typography.bodyBold },
});

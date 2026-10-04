// src/components/PasswordChecklist.tsx
//
// Lista de requisitos de contraseña que se marcan solos mientras se escribe.
//
// Se muestran las cuatro reglas desde el principio, incluidas las que faltan: un
// mensaje de error que sólo aparece al pulsar «Crear cuenta» obliga a adivinar, y
// el agricultor suele estar en terreno, con una mano y con prisa.
//
// La animación es deliberadamente corta. Su función es confirmar que algo cambió
// —la casilla se marcó por lo que acabas de teclear—, no decorar.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppStore } from '../store/useAppStore';
import { evaluatePassword } from '../utils/passwordRules';
import { useReducedMotion } from 'react-native-reanimated';

function RuleRow({ label, met, compact }: { label: string; met: boolean; compact: boolean }) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  // Un solo valor animado gobierna color, escala y opacidad: así no pueden
  // desincronizarse entre sí.
  const progress = useRef(new Animated.Value(met ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: met ? 1 : 0,
      duration: compact && reducedMotion ? 0 : 180,
      easing: Easing.out(Easing.quad),
      // El color no se puede animar en el hilo nativo, y aquí prima que los
      // tres cambios ocurran a la vez sobre ahorrarle trabajo al puente.
      useNativeDriver: false,
    }).start();
  }, [met, progress, compact, reducedMotion]);

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', colors.success],
  });
  const borderColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.success],
  });
  // Un rebote muy leve al marcarse.
  const scale = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [1, 1.18, 1],
  });

  return (
    <View style={[styles.row, compact && styles.compactRow]}>
      <Animated.View style={[styles.box, { backgroundColor, borderColor, transform: [{ scale: compact ? 1 : scale }] }]}>
        <Animated.Text style={[styles.check, { opacity: progress }]}>✓</Animated.Text>
      </Animated.View>
      <Text
        style={[
          styles.label,
          compact && styles.compactLabel,
          { color: met ? colors.text : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function PasswordChecklist({ password, compact = false }: { password: string; compact?: boolean }) {
  const { preferences } = useAppStore();
  const english = preferences.language === 'en';
  const rules = evaluatePassword(password);

  return (
    <View
      style={[styles.container, compact && styles.compactContainer]}
      accessibilityRole="list"
      // Un lector de pantalla recibe el estado completo de una vez; ir campo a
      // campo mientras se teclea sería inseguible.
      accessibilityLabel={rules
        .map(r => `${english ? r.en : r.es}: ${r.met ? (english ? 'met' : 'cumplido') : (english ? 'missing' : 'pendiente')}`)
        .join('. ')}
    >
      {rules.map(rule => (
        <RuleRow key={rule.id} label={english ? rule.en : rule.es} met={rule.met} compact={compact} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: Spacing.xs, marginBottom: Spacing.md },
  compactContainer: { gap: 2, marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  compactRow: { minHeight: 22 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', lineHeight: 16 },
  label: { ...Typography.caption, flexShrink: 1 },
  compactLabel: { fontSize: 13, lineHeight: 18 },
});

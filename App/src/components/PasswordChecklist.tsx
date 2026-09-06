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
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppStore } from '../store/useAppStore';
import { evaluatePassword } from '../utils/passwordRules';

function RuleRow({ label, met }: { label: string; met: boolean }) {
  const { colors } = useAppTheme();
  // Un solo valor animado gobierna color, escala y opacidad: así no pueden
  // desincronizarse entre sí.
  const progress = useRef(new Animated.Value(met ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: met ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      // El color no se puede animar en el hilo nativo, y aquí prima que los
      // tres cambios ocurran a la vez sobre ahorrarle trabajo al puente.
      useNativeDriver: false,
    }).start();
  }, [met, progress]);

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
    <View style={styles.row}>
      <Animated.View style={[styles.box, { backgroundColor, borderColor, transform: [{ scale }] }]}>
        <Animated.Text style={[styles.check, { opacity: progress }]}>✓</Animated.Text>
      </Animated.View>
      <Text
        style={[
          styles.label,
          { color: met ? colors.text : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function PasswordChecklist({ password }: { password: string }) {
  const { preferences } = useAppStore();
  const english = preferences.language === 'en';
  const rules = evaluatePassword(password);

  return (
    <View
      style={styles.container}
      accessibilityRole="list"
      // Un lector de pantalla recibe el estado completo de una vez; ir campo a
      // campo mientras se teclea sería inseguible.
      accessibilityLabel={rules
        .map(r => `${english ? r.en : r.es}: ${r.met ? (english ? 'met' : 'cumplido') : (english ? 'missing' : 'pendiente')}`)
        .join('. ')}
    >
      {rules.map(rule => (
        <RuleRow key={rule.id} label={english ? rule.en : rule.es} met={rule.met} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: Spacing.xs, marginBottom: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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
});

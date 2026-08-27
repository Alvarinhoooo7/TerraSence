// src/screens/FieldSettingsScreen.tsx
//
// Contexto de la medición: predio, cultivo objetivo y textura del suelo.
//
// La textura NO es un adorno: define el punto de marchitez, el umbral de riego
// y la capacidad de campo con los que el motor juzga la humedad. Un 25 % de
// humedad es sequía en un suelo arcilloso y holgura en uno arenoso.

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { CROPS_DB, SOIL_TEXTURES } from '../engine/agronomyEngine';
import { supabase } from '../services/supabase';
import type { CropId, SoilTextureId } from '../types/agronomy';

interface Props {
  onClose: () => void;
  onOpenDevices: () => void;
}

export const FieldSettingsScreen: React.FC<Props> = ({ onClose, onOpenDevices }) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { fieldName, setFieldName, cropId, setCrop, textureId, setTexture } = useAppStore();
  const [name, setName] = useState(fieldName);

  const commit = () => {
    const clean = name.trim();
    if (clean) setFieldName(clean);
    onClose();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={commit} hitSlop={12} style={styles.headerBtn}>
          <Text style={{ color: colors.primary, ...Typography.bodyBold }}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ajustes del predio</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          onPress={onOpenDevices}
          style={[styles.option, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Text style={styles.optionEmoji}>📡</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>Mis equipos</Text>
            <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
              Registrar sonda, ver código de 15 dígitos y vincular operadores
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
        </TouchableOpacity>

        <Text style={[styles.section, { color: colors.textMuted }]}>NOMBRE DEL PREDIO</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={commit}
          placeholder="Potrero Bajo"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Nombre del predio"
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
          ]}
        />

        <Text style={[styles.section, { color: colors.textMuted }]}>CULTIVO OBJETIVO</Text>
        {(Object.keys(CROPS_DB) as CropId[]).map((id) => {
          const c = CROPS_DB[id];
          const active = id === cropId;
          return (
            <TouchableOpacity
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setCrop(id)}
              style={[
                styles.option,
                {
                  backgroundColor: colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <Text style={styles.optionEmoji}>{c.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  {c.name}
                  {active ? '  ✓' : ''}
                </Text>
                <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
                  pH {c.phMin}–{c.phMax} · T° mín {c.tempMin} °C · CE máx {c.ecMax} µS/cm
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.section, { color: colors.textMuted }]}>TEXTURA DEL SUELO</Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          Define con qué umbrales se juzga la humedad. Si dudas, elige Franco.
        </Text>
        {(Object.keys(SOIL_TEXTURES) as SoilTextureId[]).map((id) => {
          const t = SOIL_TEXTURES[id];
          const active = id === textureId;
          return (
            <TouchableOpacity
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setTexture(id)}
              style={[
                styles.option,
                {
                  backgroundColor: colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  {t.name}
                  {active ? '  ✓' : ''}
                </Text>
                <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
                  Marchitez {t.pmp}% · Riego {t.ur}% · Capacidad de campo {t.cc}% · Saturación {t.sat}%
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => supabase.auth.signOut()}
          style={[styles.signOut, { borderColor: colors.border }]}
        >
          <Text style={[styles.signOutText, { color: colors.danger }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: Spacing.touchTarget + 8,
  },
  headerBtn: { minWidth: 80, minHeight: Spacing.touchTarget, justifyContent: 'center' },
  headerTitle: { ...Typography.titleMedium },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.xs },
  section: { ...Typography.badge, marginTop: Spacing.lg },
  sectionHint: { ...Typography.caption, marginBottom: Spacing.xs },
  input: {
    height: 54,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyRegular,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Spacing.borderRadius,
    padding: Spacing.md,
    minHeight: Spacing.touchTarget + 12,
  },
  optionEmoji: { fontSize: 26 },
  optionTitle: { ...Typography.bodyBold },
  optionMeta: { ...Typography.caption, marginTop: 2 },
  signOut: {
    marginTop: Spacing.xl,
    height: Spacing.touchTarget,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { ...Typography.bodyBold },
});

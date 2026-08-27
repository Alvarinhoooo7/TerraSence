// src/components/StageSelector.tsx
//
// Selector de etapa fenológica. NO es un filtro de vista: define el contexto
// con el que el motor evalúa la medición. El mismo suelo con los mismos 7
// valores produce veredictos distintos según la etapa activa.

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PHENOLOGICAL_STAGES, type PhenologicalStage } from '../types/app';
import { Spacing, Typography, type ThemeColors } from '../constants/theme';

interface Props {
  value: PhenologicalStage;
  onChange: (s: PhenologicalStage) => void;
  colors: ThemeColors;
}

export const StageSelector: React.FC<Props> = ({ value, onChange, colors }) => {
  const [open, setOpen] = useState(false);
  const current = PHENOLOGICAL_STAGES.find((s) => s.id === value) ?? PHENOLOGICAL_STAGES[0];

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Etapa del cultivo: ${current.label}. Toca para cambiar.`}
        onPress={() => setOpen(true)}
        style={[styles.chip, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}
      >
        <Text style={styles.chipEmoji}>{current.emoji}</Text>
        <Text style={[styles.chipLabel, { color: colors.text }]} numberOfLines={1}>
          {current.label}
        </Text>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.grabber} />
            <Text style={[styles.title, { color: colors.text }]}>Etapa del cultivo</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Define qué evalúa el diagnóstico. TerraSense acompaña las cuatro etapas del ciclo,
              no sólo la siembra.
            </Text>

            <ScrollView style={{ maxHeight: 420 }}>
              {PHENOLOGICAL_STAGES.map((s) => {
                const active = s.id === value;
                return (
                  <TouchableOpacity
                    key={s.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      onChange(s.id);
                      setOpen(false);
                    }}
                    style={[
                      styles.option,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.bubbleInactive : 'transparent',
                        borderWidth: active ? 2 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.optionEmoji}>{s.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionLabel, { color: colors.text }]}>
                        {s.label}
                        {active ? '  ✓' : ''}
                      </Text>
                      <Text style={[styles.optionFocus, { color: colors.textSecondary }]}>
                        {s.focus}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    height: Spacing.touchTarget,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    maxWidth: 190,
  },
  chipEmoji: { fontSize: 18 },
  chipLabel: { ...Typography.bodyBold, flexShrink: 1 },
  chevron: { fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Spacing.cardRadius,
    borderTopRightRadius: Spacing.cardRadius,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9AA6A0',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.titleLarge, marginBottom: Spacing.xs },
  subtitle: { ...Typography.caption, marginBottom: Spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius,
    marginBottom: Spacing.sm,
    minHeight: Spacing.touchTarget + 16,
  },
  optionEmoji: { fontSize: 26 },
  optionLabel: { ...Typography.bodyBold, marginBottom: 2 },
  optionFocus: { ...Typography.caption },
});

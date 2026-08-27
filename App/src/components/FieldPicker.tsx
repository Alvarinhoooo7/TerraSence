// src/components/FieldPicker.tsx
//
// Selector de predio del mapa. Permite cambiar de potrero y crear uno nuevo
// sin salir de la pantalla principal ni necesitar cobertura.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Spacing, Typography, type ThemeColors } from '../constants/theme';
import { addLocalField, listFields, type FieldSummary } from '../services/fieldsService';

interface Props {
  value: string;
  onChange: (name: string) => void;
  colors: ThemeColors;
}

const relative = (iso: string | null): string => {
  if (!iso) return 'sin mediciones';
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return 'medido hoy';
  if (d === 1) return 'medido ayer';
  return `hace ${d} días`;
};

export const FieldPicker: React.FC<Props> = ({ value, onChange, colors }) => {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<FieldSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setFields(await listFields());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const create = useCallback(async () => {
    const clean = newName.trim();
    if (!clean) return;
    await addLocalField(clean);
    setNewName('');
    onChange(clean);
    setOpen(false);
  }, [newName, onChange]);

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Predio actual: ${value}. Toca para cambiar.`}
        onPress={() => setOpen(true)}
        style={[styles.pill, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}
      >
        <Text style={[styles.pillText, { color: colors.text }]} numberOfLines={1}>
          📍 {value}
        </Text>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.grabber, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.title, { color: colors.text }]}>Predios</Text>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.lg }} />
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {fields.length === 0 && (
                  <Text style={[styles.empty, { color: colors.textSecondary }]}>
                    Todavía no hay predios. Crea el primero abajo.
                  </Text>
                )}
                {fields.map((f) => {
                  const active = f.name === value;
                  return (
                    <TouchableOpacity
                      key={f.name}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        onChange(f.name);
                        setOpen(false);
                      }}
                      style={[
                        styles.row,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          borderWidth: active ? 2 : 1,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowName, { color: colors.text }]}>
                          {f.name}
                          {active ? '  ✓' : ''}
                        </Text>
                        <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                          {f.measurements} medicion{f.measurements === 1 ? '' : 'es'} ·{' '}
                          {relative(f.lastMeasuredAt)}
                        </Text>
                      </View>
                      {f.isDraft && (
                        <Text style={[styles.draft, { color: colors.textMuted }]}>nuevo</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <Text style={[styles.section, { color: colors.textMuted }]}>CREAR PREDIO</Text>
            <View style={styles.createRow}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={create}
                placeholder="Potrero Bajo"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Nombre del predio nuevo"
                style={[
                  styles.input,
                  { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
                ]}
              />
              <TouchableOpacity
                onPress={create}
                accessibilityRole="button"
                accessibilityLabel="Crear predio"
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.addBtnText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    maxWidth: '70%',
  },
  pillText: { ...Typography.captionBold, flexShrink: 1 },
  chevron: { fontSize: 13 },
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
    alignSelf: 'center',
    opacity: 0.5,
    marginBottom: Spacing.md,
  },
  title: { ...Typography.titleLarge, marginBottom: Spacing.sm },
  empty: { ...Typography.caption, textAlign: 'center', paddingVertical: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Spacing.borderRadius,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    minHeight: Spacing.touchTarget + 8,
  },
  rowName: { ...Typography.bodyBold },
  rowMeta: { ...Typography.caption, marginTop: 2 },
  draft: { ...Typography.badge },
  section: { ...Typography.badge, marginTop: Spacing.md, marginBottom: Spacing.xs },
  createRow: { flexDirection: 'row', gap: Spacing.sm },
  input: {
    flex: 1,
    height: Spacing.touchTarget,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyRegular,
  },
  addBtn: {
    height: Spacing.touchTarget,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { ...Typography.button, color: '#FFFFFF' },
});

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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { ScreenGuide } from '../components/ScreenGuide';
import { useAppStore } from '../store/useAppStore';
import { CROPS_DB, SOIL_TEXTURES } from '../engine/agronomyEngine';
import { supabase } from '../services/supabase';
import { clearPushToken } from '../services/notifications';
import { reconcileNotificationRegistration } from '../services/notifications';
import { savePreferences } from '../services/preferencesService';
import type { CropId, SoilTextureId } from '../types/agronomy';
import type {
  AppLanguage,
  AppPreferences,
  AppThemePreference,
  MeasurementSystem,
  NotificationCategory,
} from '../types/preferences';
import { formatTemperature } from '../utils/units';

const CROP_NAMES_EN: Record<CropId, string> = {
  maiz: 'Grain corn / Sweet corn',
  tomate: 'Field / Greenhouse tomato',
  papa: 'Potato (Tuber)',
  trigo: 'Wheat / Winter cereals',
  lechuga: 'Lettuce / Leafy greens',
  palto: 'Avocado (Hass)',
  vid: 'Wine / Table grape',
  arandano: 'Blueberry (Berries)',
};

const TEXTURE_NAMES_EN: Record<SoilTextureId, string> = {
  arenoso: 'Sandy (Loose / Light)',
  franco: 'Loam (Balanced / Ideal)',
  franco_arcilloso: 'Clay loam (Heavy)',
  arcilloso: 'Clay (Very heavy / Slow drainage)',
};

interface Props {
  onClose: () => void;
  onOpenDevices: () => void;
}

export const FieldSettingsScreen: React.FC<Props> = ({ onClose, onOpenDevices }) => {
  const { colors } = useAppTheme();

  const {
    fieldName,
    setFieldName,
    cropId,
    setCrop,
    textureId,
    setTexture,
    preferences,
    setPreferences,
  } = useAppStore();
  const [name, setName] = useState(fieldName);
  const en = preferences.language === 'en';

  const applyPreferences = (next: AppPreferences, reconcilePush = false) => {
    setPreferences(next);
    void savePreferences(next);
    if (reconcilePush) void reconcileNotificationRegistration(next);
  };

  const setTheme = (theme: AppThemePreference) =>
    applyPreferences({ ...preferences, theme });
  const setLanguage = (language: AppLanguage) =>
    applyPreferences({ ...preferences, language }, true);
  const setMeasurementSystem = (measurementSystem: MeasurementSystem) =>
    applyPreferences({ ...preferences, measurementSystem });
  const setNotification = (category: NotificationCategory, enabled: boolean) =>
    applyPreferences(
      {
        ...preferences,
        notifications: { ...preferences.notifications, [category]: enabled },
      },
      true,
    );

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {en ? 'Settings' : 'Configuración'}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.section, { color: colors.textMuted }]}>
          {en ? 'APPEARANCE' : 'APARIENCIA'}
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          {en ? 'Choose how TerraSense looks on this device.' : 'Elige cómo se ve TerraSense en este dispositivo.'}
        </Text>
        <View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {([
            ['system', en ? 'System' : 'Sistema'],
            ['light', en ? 'Light' : 'Claro'],
            ['dark', en ? 'Dark' : 'Oscuro'],
          ] as [AppThemePreference, string][]).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              onPress={() => setTheme(value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: preferences.theme === value }}
              style={[
                styles.segmentItem,
                preferences.theme === value && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: preferences.theme === value ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.section, { color: colors.textMuted }]}>
          {en ? 'LANGUAGE' : 'IDIOMA'}
        </Text>
        <View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {([
            ['es', 'Español'],
            ['en', 'English'],
          ] as [AppLanguage, string][]).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              onPress={() => setLanguage(value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: preferences.language === value }}
              style={[
                styles.segmentItem,
                preferences.language === value && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[styles.segmentText, { color: preferences.language === value ? '#FFFFFF' : colors.textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.section, { color: colors.textMuted }]}>
          {en ? 'MEASUREMENT SYSTEM' : 'SISTEMA DE MEDICIÓN'}
        </Text>
        <View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {([
            ['metric', en ? 'Metric · °C, ha' : 'Métrico · °C, ha'],
            ['imperial', en ? 'Imperial · °F, ac' : 'Imperial · °F, ac'],
          ] as [MeasurementSystem, string][]).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              onPress={() => setMeasurementSystem(value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: preferences.measurementSystem === value }}
              style={[
                styles.segmentItem,
                preferences.measurementSystem === value && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[styles.segmentText, { color: preferences.measurementSystem === value ? '#FFFFFF' : colors.textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.section, { color: colors.textMuted }]}>
          {en ? 'NOTIFICATIONS' : 'NOTIFICACIONES'}
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          {en ? 'Choose which alerts can reach this account.' : 'Elige qué avisos pueden llegar a esta cuenta.'}
        </Text>
        {([
          ['agronomic', '🚨', en ? 'Critical soil alerts' : 'Alertas críticas del suelo', en ? 'Salinity, pH, water and crop risks.' : 'Riesgos de salinidad, pH, agua y cultivo.'],
          ['device', '🔋', en ? 'Device status' : 'Estado del equipo', en ? 'Low battery, connection and firmware.' : 'Batería baja, conexión y firmware.'],
          ['weather', '🌦️', en ? 'Weather risks' : 'Riesgos meteorológicos', en ? 'Rain, frost and irrigation windows.' : 'Lluvia, heladas y ventanas de riego.'],
          ['sync', '☁️', en ? 'Synchronization' : 'Sincronización', en ? 'Pending or completed cloud uploads.' : 'Cargas pendientes o completadas en la nube.'],
        ] as [NotificationCategory, string, string, string][]).map(([category, icon, title, description]) => (
          <View key={category} style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.optionEmoji}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>{description}</Text>
            </View>
            <Switch
              value={preferences.notifications[category]}
              onValueChange={(enabled) => setNotification(category, enabled)}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={preferences.notifications[category] ? colors.primary : colors.textMuted}
              accessibilityLabel={title}
            />
          </View>
        ))}

        <Text style={[styles.section, { color: colors.textMuted }]}>
          {en ? 'FIELD AND EQUIPMENT' : 'PREDIO Y EQUIPO'}
        </Text>
        <TouchableOpacity
          onPress={onOpenDevices}
          style={[styles.option, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Text style={styles.optionEmoji}>📡</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>
              {en ? 'My devices' : 'Mis equipos'}
            </Text>
            <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
              {en
                ? 'Register a probe, view its 15-digit code and link operators'
                : 'Registrar sonda, ver código de 15 dígitos y vincular operadores'}
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
        </TouchableOpacity>

        <Text style={[styles.section, { color: colors.textMuted }]}>
          {en ? 'FIELD NAME' : 'NOMBRE DEL PREDIO'}
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={commit}
          placeholder="Potrero Bajo"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={en ? 'Field name' : 'Nombre del predio'}
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
          ]}
        />

        <Text style={[styles.section, { color: colors.textMuted }]}>
          {en ? 'TARGET CROP' : 'CULTIVO OBJETIVO'}
        </Text>
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
                  {en ? CROP_NAMES_EN[id] : c.name}
                  {active ? '  ✓' : ''}
                </Text>
                <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
                  pH {c.phMin}–{c.phMax} · {en ? 'Min. temp.' : 'T° mín'}{' '}
                  {formatTemperature(c.tempMin, preferences.measurementSystem).value.toFixed(0)}{' '}
                  {formatTemperature(c.tempMin, preferences.measurementSystem).unit} ·{' '}
                  {en ? 'Max. EC' : 'CE máx'} {c.ecMax} µS/cm
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.section, { color: colors.textMuted }]}>
          {en ? 'SOIL TEXTURE' : 'TEXTURA DEL SUELO'}
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          {en
            ? 'Defines the thresholds used to assess moisture. If unsure, choose Loam.'
            : 'Define con qué umbrales se juzga la humedad. Si dudas, elige Franco.'}
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
                  {en ? TEXTURE_NAMES_EN[id] : t.name}
                  {active ? '  ✓' : ''}
                </Text>
                <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
                  {en ? 'Wilting' : 'Marchitez'} {t.pmp}% · {en ? 'Irrigation' : 'Riego'} {t.ur}% ·{' '}
                  {en ? 'Field capacity' : 'Capacidad de campo'} {t.cc}% · {en ? 'Saturation' : 'Saturación'} {t.sat}%
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={async () => {
            await clearPushToken();
            await supabase.auth.signOut();
          }}
          style={[styles.signOut, { borderColor: colors.border }]}
        >
          <Text style={[styles.signOutText, { color: colors.danger }]}>{en ? 'Sign out' : 'Cerrar sesión'}</Text>
        </TouchableOpacity>
      </ScrollView>
      <ScreenGuide guideId="settings" />
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
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Spacing.borderRadius,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    minHeight: Spacing.touchTarget,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  segmentText: { ...Typography.captionBold, textAlign: 'center' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 76,
  },
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

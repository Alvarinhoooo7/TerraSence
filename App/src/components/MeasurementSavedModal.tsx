import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Text } from './AppText';
import { GuideModal } from './guide/GuideModal';
import { EntryButton, EntryHeading, EntryLayout } from './entry/EntryUI';
import { ScreenLabel, ScreenStatus, ScreenText } from './screen/ScreenUI';
import { ReadingSavedArt } from './ReadingSavedArt';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { enterDown } from '../constants/motion';
import { formatEngineMetric } from '../utils/units';
import { presentationSpeciesName, type MeasurementPresentation } from '../engine/measurementPresentation';

/** Lo que se guardó, para confirmarlo de un vistazo; los valores salen de la presentación guardada. */
export interface SavedReadingSummary {
  stage: string;
  capturedAt: string | null;
  presentation: MeasurementPresentation | null;
}

const SUMMARY_KEYS = ['vwc', 'temp', 'ph'] as const;

/**
 * Cierre de una medición guardada: confirma dónde quedó (nube o teléfono), resume lo que se
 * guardó y recuerda cómo dejar la sonda lista. «Medir otro punto» abre una medición nueva,
 * sin la etapa ni la especie de ésta.
 */
export function MeasurementSavedModal({ visible, synced, summary, onClose, onMeasureAgain }: {
  visible: boolean; synced: boolean; summary: SavedReadingSummary; onClose: () => void; onMeasureAgain: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  const { t, locale, language } = useTranslation();
  const system = useAppStore(s => s.preferences.measurementSystem);
  const species = summary.presentation?.species;
  const time = summary.capturedAt ? new Date(summary.capturedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : null;
  const readings = SUMMARY_KEYS.map(key => {
    const parameter = summary.presentation?.parameters.find(p => p.key === key);
    if (!parameter) return null;
    const f = parameter.value == null ? null : formatEngineMetric(key, parameter.value, parameter.unit, system);
    return { key, label: parameter.label, value: f ? `${f.value.toLocaleString(locale, { maximumFractionDigits: 1 })}${key === 'ph' ? '' : ` ${f.unit}`}` : t('Sin dato', 'No data') };
  }).filter((r): r is NonNullable<typeof r> => r !== null);
  const steps: [string, string][] = [
    [t('Sácala con cuidado', 'Pull it out gently'), t('Tira recto hacia arriba, sin doblar los electrodos.', 'Pull straight up, without bending the electrodes.')],
    [t('Límpiala con un paño', 'Wipe it with a cloth'), t('Electrodos limpios y secos: la tierra pegada altera la próxima lectura.', 'Clean, dry electrodes: soil left on them skews the next reading.')],
    [t('Mide otro punto o guárdala', 'Measure another spot or store it'), t('Varios puntos representativos dicen más que una sola lectura.', 'Several representative spots say more than a single reading.')],
  ];
  return <GuideModal visible={visible} animationType="fade" onRequestClose={onClose}>
    <EntryLayout align="top" footer={<View style={{ gap: 10 }}>
      <EntryButton label={t('Medir otro punto', 'Measure another spot')} onPress={onMeasureAgain} />
      <EntryButton secondary label={t('Volver a Inicio', 'Back to Home')} onPress={onClose} />
    </View>}>
      <View style={{ gap: 20 }}>
        <ReadingSavedArt synced={synced} />
        <Animated.View entering={enterDown(120)} style={{ gap: 14 }}>
          <View accessibilityLiveRegion="polite">
            <ScreenStatus tone={synced ? 'ok' : 'warn'} label={synced ? t('Respaldada en la nube', 'Backed up to the cloud') : t('Guardada en el teléfono · pendiente', 'Saved on this phone · pending')} />
          </View>
          <EntryHeading eyebrow={t('MEDICIÓN TERMINADA', 'READING COMPLETE')} title={t('Lectura guardada', 'Reading saved')}
            description={synced ? t('Ya está en tu historial y respaldada en la nube.', 'It is in your history and backed up to the cloud.')
              : t('Ya está en tu historial. Se enviará a la nube sola cuando vuelva la conexión.', 'It is in your history. It will go to the cloud on its own when the connection returns.')} />
        </Animated.View>
        <Animated.View entering={enterDown(220)} style={{ borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' }}>
          <View style={{ padding: 16, gap: 4 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>{[summary.stage.toUpperCase(), time].filter(Boolean).join(' · ')}</Text>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{species ? presentationSpeciesName(species, language) : t('Sin especie indicada', 'No species given')}</Text>
            {!!summary.presentation?.title && <ScreenText>{summary.presentation.title}</ScreenText>}
          </View>
          {!!readings.length && <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}>
            {readings.map((r, i) => <View key={r.key} accessible accessibilityLabel={`${r.label}: ${r.value}`}
              style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 2, borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.border }}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>{r.value}</Text>
              <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>{r.label}</Text>
            </View>)}
          </View>}
        </Animated.View>
        <View style={{ gap: 12 }}>
          <Animated.View entering={enterDown(300)}><ScreenLabel>{t('Antes de la próxima lectura', 'Before the next reading')}</ScreenLabel></Animated.View>
          {steps.map(([title, body], i) => <Animated.View key={title} entering={enterDown(360 + i * 110)}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                <Text style={{ color: isDark ? colors.background : '#FFFFFF', fontSize: 15, fontWeight: '800' }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{title}</Text>
                <ScreenText>{body}</ScreenText>
              </View>
            </View>
          </Animated.View>)}
        </View>
      </View>
    </EntryLayout>
  </GuideModal>;
}

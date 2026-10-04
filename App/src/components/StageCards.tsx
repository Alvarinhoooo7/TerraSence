import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Text } from './AppText';
import Animated from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { GuideTouchable } from './guide/GuideControls';
import { enterDown } from '../constants/motion';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { PHENOLOGICAL_STAGES, type PhenologicalStage } from '../types/app';

const LEAF = '#C6DFB4';
const GRAIN = '#E3C27A';

/** Ilustración de cada etapa, con la paleta de la bienvenida (fondo verde oscuro en ambos temas). */
export function StageArt({ stage }: { stage: PhenologicalStage }) {
  return <Svg width="100%" height="100%" viewBox="0 0 120 90" preserveAspectRatio="xMidYMid meet">
    <Circle cx="100" cy="16" r="30" fill="none" stroke="#3F604B" strokeWidth="1" />
    <Path d="M0 64Q60 54 120 64V90H0Z" fill="#355B41" />
    <Path d="M0 76Q60 68 120 78V90H0Z" fill="#6B6A45" />
    {stage === 'pre_siembra' && <>
      <Path d="M14 70q8-4 16 0M44 66q8-4 16 0M82 67q8-4 16 0" stroke="#8FA67F" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Ellipse cx="60" cy="78" rx="6" ry="4" fill={GRAIN} transform="rotate(-18 60 78)" />
      <Path d="M61 74C61 66 63 61 68 58" stroke={LEAF} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <Path d="M68 58C70 52 76 50 81 51 79 57 74 60 68 58Z" fill={LEAF} />
      <Circle cx="30" cy="80" r="1.6" fill="#A08661" /><Circle cx="92" cy="82" r="1.6" fill="#A08661" />
    </>}
    {stage === 'vegetativo' && <>
      <Path d="M60 64V22" stroke={LEAF} strokeWidth="3" strokeLinecap="round" />
      <Path d="M60 54C48 54 40 47 37 37 49 37 57 44 60 54Z" fill={LEAF} />
      <Path d="M60 44C72 44 80 37 83 27 71 27 63 34 60 44Z" fill={LEAF} />
      <Path d="M60 32C52 31 47 25 46 18 54 19 59 25 60 32Z" fill={LEAF} />
      <Path d="M60 24C59 17 62 11 68 8 69 15 66 21 60 24Z" fill={LEAF} />
      <Path d="M60 54 44 41M60 44 77 31" stroke="#5E8C5C" strokeWidth="1.2" />
    </>}
    {stage === 'floracion' && <>
      <Path d="M60 64V30" stroke={LEAF} strokeWidth="3" strokeLinecap="round" />
      <Path d="M60 56C49 56 42 50 40 41 51 41 58 47 60 56Z" fill={LEAF} />
      <Path d="M60 47C71 47 78 41 80 32 69 32 62 38 60 47Z" fill={LEAF} />
      <G>
        {[0, 72, 144, 216, 288].map(a => <Circle key={a} cx={60 + 8 * Math.sin(a * Math.PI / 180)} cy={22 - 8 * Math.cos(a * Math.PI / 180)} r="6.5" fill="#F2B8C6" />)}
        <Circle cx="60" cy="22" r="4.5" fill="#F5D46A" />
      </G>
    </>}
    {stage === 'cosecha' && <>
      {[{ x: 48, lean: -6, top: 16 }, { x: 64, lean: 4, top: 10 }, { x: 78, lean: 9, top: 20 }].map(({ x, lean, top }) => <G key={x}>
        <Path d={`M${x} 66C${x} 50 ${x + lean / 2} 36 ${x + lean} ${top}`} stroke={GRAIN} strokeWidth="2" fill="none" strokeLinecap="round" />
        {[0, 1, 2, 3].map(i => {
          const y = top + 4 + i * 6; const cx = x + lean * (1 - (y - top) / (66 - top));
          return <G key={i}>
            <Ellipse cx={cx - 3} cy={y} rx="2.4" ry="4.2" fill={GRAIN} transform={`rotate(-28 ${cx - 3} ${y})`} />
            <Ellipse cx={cx + 3} cy={y} rx="2.4" ry="4.2" fill={GRAIN} transform={`rotate(28 ${cx + 3} ${y})`} />
          </G>;
        })}
      </G>)}
    </>}
  </Svg>;
}

/**
 * Paso 1 de Medir: las cuatro etapas como tarjetas ilustradas en dos columnas
 * (una sola con texto muy grande) y, debajo, qué significa la elegida.
 */
export function StageCards({ value, onChange }: { value: PhenologicalStage | null; onChange: (stage: PhenologicalStage) => void }) {
  const { colors, isDark } = useAppTheme();
  const { t, language } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const columns = fontScale > 1.5 ? 1 : 2;
  const selected = PHENOLOGICAL_STAGES.find(item => item.id === value);
  return <View style={{ gap: 12 }}>
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {PHENOLOGICAL_STAGES.map((item, i) => {
        const marked = item.id === value;
        const label = language === 'en' ? item.labelEn : item.label;
        return <Animated.View key={item.id} entering={enterDown(60 + i * 80)} style={{ width: columns === 1 ? '100%' : '47.9%', flexGrow: 1 }}>
          <GuideTouchable guideTitle={label} guide={t('Elige esta etapa para interpretar la lectura según el desarrollo del cultivo.', 'Choose this stage to interpret the reading for crop development.')}
            accessibilityRole="radio" accessibilityLabel={label} accessibilityHint={language === 'en' ? item.focusEn : item.focus} accessibilityState={{ selected: marked }}
            onPress={() => onChange(item.id)}
            style={{ borderRadius: 20, borderWidth: marked ? 2 : 1, borderColor: marked ? colors.primary : colors.border, backgroundColor: colors.card, padding: marked ? 7 : 8, gap: 10 }}>
            <View style={{ aspectRatio: 120 / 90, borderRadius: 14, overflow: 'hidden', backgroundColor: '#17392C' }}>
              <StageArt stage={item.id} />
              {marked && <View style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: isDark ? colors.background : '#FFFFFF', fontSize: 15, fontWeight: '800' }}>✓</Text>
              </View>}
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.text, fontSize: 17, fontWeight: marked ? '800' : '600', paddingHorizontal: 6, paddingBottom: 4 }}>{label}</Text>
          </GuideTouchable>
        </Animated.View>;
      })}
    </View>
    <View accessibilityLiveRegion="polite" style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.border, borderLeftWidth: selected ? 5 : 1, borderLeftColor: selected ? colors.primary : colors.border, padding: 16, gap: 4 }}>
      {selected ? <>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>{(language === 'en' ? selected.labelEn : selected.label).toUpperCase()}</Text>
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 23 }}>{language === 'en' ? selected.focusEn : selected.focus}</Text>
      </> : <Text style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 23 }}>{t('Toca la etapa que más se parece a tu cultivo hoy.', 'Tap the stage that best matches your crop today.')}</Text>}
    </View>
  </View>;
}

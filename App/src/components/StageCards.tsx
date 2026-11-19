import React, { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Text } from './AppText';
import Animated, { FadeIn, ReduceMotion, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { GuideTouchable } from './guide/GuideControls';
import { AppIcon } from './AppIcon';
import { checkPop, enterDown, motionTiming } from '../constants/motion';
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
 * Una etapa como tarjeta ilustrada. La elegida acerca su dibujo, tiñe su rótulo y
 * muestra el visto; las demás atenúan sólo el dibujo, nunca el texto.
 */
function StageCard({ stage, label, hint, marked, dimmed, onPress }: {
  stage: PhenologicalStage; label: string; hint: string; marked: boolean; dimmed: boolean; onPress: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const focus = useSharedValue(marked ? 1 : 0);
  const dim = useSharedValue(dimmed ? 1 : 0);
  useEffect(() => { focus.value = motionTiming(marked ? 1 : 0, 260); }, [focus, marked]);
  useEffect(() => { dim.value = motionTiming(dimmed ? 1 : 0, 260); }, [dim, dimmed]);
  const artStyle = useAnimatedStyle(() => ({ opacity: 1 - 0.3 * dim.value, transform: [{ scale: 1 + 0.07 * focus.value }] }));
  return <GuideTouchable guideTitle={label} guide={t('Elige esta etapa para interpretar la lectura según el desarrollo del cultivo.', 'Choose this stage to interpret the reading for crop development.')}
    accessibilityRole="radio" accessibilityLabel={label} accessibilityHint={hint} accessibilityState={{ selected: marked }}
    activeOpacity={0.85} onPress={onPress}
    style={{ borderRadius: 22, borderWidth: 2, borderColor: marked ? colors.primary : colors.border, backgroundColor: colors.card, overflow: 'hidden' }}>
    <View style={{ aspectRatio: 120 / 90, backgroundColor: '#17392C', overflow: 'hidden' }}>
      <Animated.View style={[{ flex: 1 }, artStyle]}><StageArt stage={stage} /></Animated.View>
      {marked && <Animated.View entering={checkPop()} accessible={false}
        style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name="check" size={15} color={isDark ? colors.background : '#FFFFFF'} />
      </Animated.View>}
    </View>
    <View style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: marked ? colors.tintSuccess : colors.card }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: marked ? colors.primary : colors.text, fontSize: 17, fontWeight: '700' }}>{label}</Text>
    </View>
  </GuideTouchable>;
}

/**
 * Paso 1 de Medir: las cuatro etapas como tarjetas ilustradas en dos columnas
 * (una sola con texto muy grande) y, debajo, qué significa la elegida.
 */
export function StageCards({ value, onChange }: { value: PhenologicalStage | null; onChange: (stage: PhenologicalStage) => void }) {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const columns = fontScale > 1.5 ? 1 : 2;
  const selected = PHENOLOGICAL_STAGES.find(item => item.id === value);
  const choose = (stage: PhenologicalStage) => {
    if (stage !== value) void Haptics.selectionAsync().catch(() => undefined);
    onChange(stage);
  };
  return <View style={{ gap: 14 }}>
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {PHENOLOGICAL_STAGES.map((item, i) => <Animated.View key={item.id} entering={enterDown(60 + i * 80)} style={{ width: columns === 1 ? '100%' : '47.9%', flexGrow: 1 }}>
        <StageCard stage={item.id} label={language === 'en' ? item.labelEn : item.label} hint={language === 'en' ? item.focusEn : item.focus}
          marked={item.id === value} dimmed={value != null && item.id !== value} onPress={() => choose(item.id)} />
      </Animated.View>)}
    </View>
    {/* Qué significa la etapa elegida: miniatura de su dibujo y una frase. */}
    <View accessibilityLiveRegion="polite" style={{ borderRadius: 18, backgroundColor: selected ? colors.tintSuccess : 'transparent', borderWidth: selected ? 0 : 1, borderColor: colors.border, borderStyle: selected ? 'solid' : 'dashed', padding: 14, minHeight: 78, justifyContent: 'center' }}>
      {selected ? <Animated.View key={selected.id} entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View accessible={false} style={{ width: 64, height: 48, borderRadius: 12, overflow: 'hidden', backgroundColor: '#17392C' }}><StageArt stage={selected.id} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>{(language === 'en' ? selected.labelEn : selected.label).toUpperCase()}</Text>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 23 }}>{language === 'en' ? selected.focusEn : selected.focus}</Text>
        </View>
      </Animated.View> : <Text style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 23, textAlign: 'center' }}>{t('Toca la etapa que más se parece a tu cultivo hoy.', 'Tap the stage that best matches your crop today.')}</Text>}
    </View>
  </View>;
}

import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Pressable, ScrollView, useWindowDimensions, View, type ViewToken } from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { EntryButton, useEntryMetrics } from '../components/entry/EntryUI';
import { LanguageSwitch } from '../components/entry/LanguageSwitch';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { AppLanguage } from '../types/preferences';

const PAGES = [
  { eyebrow: ['01 / CONOCE EL SUELO', '01 / KNOW THE SOIL'], title: ['Conoce mejor\ntu campo.', 'Know your\nfield better.'], body: ['Comprende las condiciones del suelo con cada medición y lleva el registro contigo.', 'Understand soil conditions with each measurement and keep a record at hand.'] },
  { eyebrow: ['02 / CONECTA Y MIDE', '02 / CONNECT AND MEASURE'], title: ['Una conexión.\nUna medición.', 'One connection.\nOne measurement.'], body: ['Conecta la sonda por Bluetooth y consulta sus datos en tu teléfono.', 'Connect the probe over Bluetooth and see its data on your phone.'] },
  { eyebrow: ['03 / INTERPRETA', '03 / INTERPRET'], title: ['Datos con\ncontexto.', 'Data with\ncontext.'], body: ['Revisa el historial y recibe orientación según el suelo y la etapa de tu cultivo. Con internet, suma el pronóstico.', 'Review your history and guidance based on soil and crop stage. Add the forecast when online.'] },
] as const;

function Artwork({ page, height, reducedMotion }: { page: number; height: number; reducedMotion: boolean }) {
  const breathe = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) { breathe.value = 1; return; }
    breathe.value = withRepeat(withSequence(
      withTiming(0.35, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
      withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
  }, [reducedMotion]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: breathe.value }));
  const layer = { position: 'absolute' as const, top: 0, right: 0, bottom: 0, left: 0 };
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height, borderRadius: 24, overflow: 'hidden', backgroundColor: '#17392C' }}>
    <Animated.View style={[layer, ringStyle]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 230" preserveAspectRatio="xMidYMid meet">
        <Circle cx="300" cy="42" r="90" fill="none" stroke="#50715B" strokeWidth="1" />
      </Svg>
    </Animated.View>
    <Svg style={layer} width="100%" height="100%" viewBox="0 0 360 230" preserveAspectRatio="xMidYMid meet">
      {page === 0 ? <>
        {/* Campo con hileras al fondo y, en corte, una planta con sus raíces y la humedad del suelo. */}
        <Circle cx="300" cy="42" r="16" fill="#C6DFB4" opacity={0.9} />
        <Path d="M0 112Q90 92 180 108T360 100V230H0Z" fill="#24503A" />
        <Path d={[[22, 108], [45, 104], [68, 102], [112, 101], [135, 102], [225, 114], [248, 114], [270, 114], [292, 112], [315, 110], [338, 105]].map(([x, y]) => `M${x} ${y}v-7M${x} ${y - 4}l-4-3M${x} ${y - 4}l4-3`).join('')} stroke="#7FA877" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <Path d="M0 125Q90 100 180 126T360 120V230H0Z" fill="#355B41" />
        <Path d="M0 160Q90 135 180 163T360 155V230H0Z" fill="#6B6A45" />
        <Path d="M0 193Q90 172 180 198T360 187V230H0Z" fill="#8A6A4A" />
        {[[52, 150], [96, 176], [262, 166], [300, 150], [128, 208], [236, 212], [330, 200], [30, 206]].map(([x, y]) => <Circle key={`${x}`} cx={x} cy={y} r="2.4" fill="#A08661" />)}
        <Path d="M180 128C178 142 170 152 158 166M168 156C162 158 156 157 151 152M180 130C184 146 194 158 204 174M196 163C203 161 209 163 214 168M180 132C181 152 179 170 181 194" stroke="#C6DFB4" strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.75} />
        <Path d="M140 186c0-5 5-10 5-10s5 5 5 10a5 5 0 0 1-10 0ZM222 192c0-4 4-8 4-8s4 4 4 8a4 4 0 0 1-8 0Z" fill="#9CC9C2" opacity={0.85} />
        <Path d="M180 128C180 108 178 90 182 58" stroke="#C6DFB4" strokeWidth="4" fill="none" strokeLinecap="round" />
        <Path d="M180 98C158 100 138 90 132 68C156 64 175 76 180 98Z" fill="#C6DFB4" />
        <Path d="M180 98C166 90 150 79 137 70" stroke="#5E8C5C" strokeWidth="1.6" fill="none" />
        <Path d="M181 82C190 61 209 50 232 52C226 75 207 86 181 82Z" fill="#E3F0D6" />
        <Path d="M181 82C196 71 211 61 228 55" stroke="#5E8C5C" strokeWidth="1.6" fill="none" />
        <Path d="M182 60C175 47 177 34 188 25C195 38 193 51 182 60Z" fill="#C6DFB4" />
      </> : page === 1 ? <>
        <Rect x="63" y="26" width="102" height="176" rx="17" fill="#EDE8D9" />
        <Rect x="73" y="38" width="82" height="144" rx="8" fill="#D8E6CD" />
        <Path d="M89 148h50M89 131h31M89 103h50" stroke="#43704B" strokeWidth="4" strokeLinecap="round" />
        <Rect x="239" y="37" width="28" height="76" rx="8" fill="#C6DFB4" />
        <Path d="M187 64q-20 30 0 56m29-71q-36 49 0 91" stroke="#C6DFB4" strokeWidth="3" fill="none" />
        {/* Sonda real: 5 electrodos bajo el cuerpo, no 2. */}
        <Path d="M243 113v91M248 113v91M253 113v91M258 113v91M263 113v91" stroke="#C6DFB4" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <Circle cx="253" cy="70" r="5" fill="#39704B" />
      </> : <>
        <Rect x="42" y="41" width="276" height="150" rx="15" fill="#EDE8D9" />
        <Path d="M66 152h222M72 135l52-24 42 14 52-48 62 20" fill="none" stroke="#3D7651" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {[{x:72,y:135},{x:124,y:111},{x:166,y:125},{x:218,y:77},{x:280,y:97}].map(p => <Circle key={p.x} cx={p.x} cy={p.y} r="6" fill="#8A6A4A" />)}
        <Path d="M72 168h112" stroke="#9BAA8D" strokeWidth="4" strokeLinecap="round" />
      </>}
    </Svg>
  </View>;
}

function WelcomePage({ item, page, active, width, viewportHeight, reducedMotion }: {
  item: (typeof PAGES)[number]; page: number; active: boolean; width: number; viewportHeight: number; reducedMotion: boolean;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const metrics = useEntryMetrics();
  const [textHeight, setTextHeight] = useState(0);
  const gap = metrics.compact ? 18 : 28;
  // Medir el texto permite reducir primero la ilustración si cambian idioma,
  // tamaño de letra o altura disponible. El texto nunca se recorta.
  const artworkHeight = viewportHeight > 0 && textHeight > 0
    ? Math.max(0, Math.min(metrics.artworkHeight, viewportHeight - 16 - gap - textHeight))
    : metrics.artworkHeight;
  return <ScrollView style={{ width }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 8 }}
    accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}>
    <View style={{ maxWidth: 472, alignSelf: 'center', width: '100%', gap: artworkHeight > 0 ? gap : 0 }}>
      {artworkHeight > 0 && <Artwork page={page} height={artworkHeight} reducedMotion={reducedMotion} />}
      <View onLayout={event => setTextHeight(event.nativeEvent.layout.height)} style={{ gap: metrics.compact ? 9 : 14 }}>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.3 }}>{t(item.eyebrow[0], item.eyebrow[1])}</Text>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: metrics.compact ? 33 : 39, lineHeight: metrics.compact ? 39 : 45, fontWeight: '700', letterSpacing: -1.2 }}>{t(item.title[0], item.title[1])}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 24 }}>{t(item.body[0], item.body[1])}</Text>
      </View>
    </View>
  </ScrollView>;
}

export function WelcomeCarouselScreen({ onComplete, onChangeLanguage, languageBusy = false }: {
  onComplete: () => void; onChangeLanguage?: (language: AppLanguage) => void; languageBusy?: boolean;
}) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const list = useRef<FlatList<(typeof PAGES)[number]>>(null);
  const current = useRef(0);
  const target = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => listener.remove();
  }, []);
  useEffect(() => { list.current?.scrollToOffset({ offset: current.current * width, animated: false }); }, [width]);
  const viewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const next = viewableItems[0]?.index;
    if (typeof next === 'number') {
      if (target.current !== null && next !== target.current) return;
      target.current = null; current.current = next; setIndex(next);
    }
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const go = (next: number) => {
    if (next > 2) { onComplete(); return; }
    target.current = next;
    current.current = next; setIndex(next);
    list.current?.scrollToIndex({ index: next, animated: !reducedMotion });
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, minHeight: 54, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
      {onChangeLanguage ? <LanguageSwitch language={language} onChange={onChangeLanguage} busy={languageBusy} /> : <View />}
      <Pressable accessibilityRole="button" onPress={onComplete} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{t('Saltar', 'Skip')}</Text>
      </Pressable>
    </View>
    <FlatList ref={list} data={PAGES} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }}
      extraData={{ width, language, index, viewportHeight, reducedMotion }} keyExtractor={(_, i) => String(i)}
      onLayout={event => setViewportHeight(event.nativeEvent.layout.height)}
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      onViewableItemsChanged={viewable} viewabilityConfig={viewabilityConfig} onScrollBeginDrag={() => { target.current = null; }}
      renderItem={({ item, index: page }) => <WelcomePage item={item} page={page} active={page === index} width={width} viewportHeight={viewportHeight} reducedMotion={reducedMotion} />} />
    <View style={{ paddingHorizontal: 24, paddingBottom: 16, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Anterior', 'Previous')} accessibilityState={{ disabled: index === 0 }} disabled={index === 0} onPress={() => go(index - 1)} style={{ minWidth: 72, minHeight: 48, justifyContent: 'center' }}>
          <Text style={{ color: colors.primary, opacity: index === 0 ? 0 : 1 }}>{t('Atrás', 'Back')}</Text>
        </Pressable>
        <View accessibilityLabel={t(`Página ${index + 1} de 3`, `Page ${index + 1} of 3`)} style={{ flexDirection: 'row', gap: 6 }}>
          {PAGES.map((_, i) => <View key={i} style={{ width: i === index ? 28 : 9, height: 7, borderRadius: 4, backgroundColor: i === index ? colors.primary : colors.border }} />)}
        </View>
        <Text style={{ color: colors.textSecondary, minWidth: 72, textAlign: 'right' }}>{index + 1} / 3</Text>
      </View>
      <EntryButton label={index === 2 ? t('Comenzar', 'Get started') : t('Continuar', 'Continue')} onPress={() => go(index + 1)} />
    </View>
  </SafeAreaView>;
}

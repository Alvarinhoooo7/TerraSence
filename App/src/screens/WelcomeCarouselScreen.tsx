import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AppIcon } from '../components/AppIcon';
import { AuthButton, SoilArtwork, authStyles } from '../components/auth/AuthUI';

const PAGES = [
  { eyebrow: ['DESDE LA TIERRA', 'FROM THE SOIL'], title: ['Conoce mejor\ntu campo.', 'Know your\nfield better.'], body: ['Cada decisión comienza por entender el suelo. Lleva esa información contigo, donde estés.', 'Every decision starts with understanding your soil. Take that knowledge wherever you go.'] },
  { eyebrow: ['CONECTA Y MIDE', 'CONNECT AND MEASURE'], title: ['Tu sonda.\nTu punto de partida.', 'Your probe.\nYour starting point.'], body: ['Conecta tu sonda por Bluetooth y consulta las condiciones del suelo desde tu teléfono.', 'Connect your probe over Bluetooth and check soil conditions from your phone.'] },
  { eyebrow: ['DEL DATO A LA DECISIÓN', 'FROM DATA TO DECISIONS'], title: ['Más contexto.\nMejores decisiones.', 'More context.\nBetter decisions.'], body: ['Consulta tu historial y orientaciones según el suelo y la etapa de tu cultivo. Con internet, suma el pronóstico.', 'View your history and guidance based on soil and crop stage. Add the forecast when online.'] },
] as const;

function PaginationDot({ isActive, primaryColor, borderActiveColor }: { isActive: boolean, primaryColor: string, borderActiveColor: string }) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(isActive ? 32 : 12, { damping: 12, stiffness: 150 }),
      backgroundColor: isActive ? primaryColor : borderActiveColor,
    };
  });

  return <Animated.View style={[{ height: 6, borderRadius: 3 }, animatedStyle]} />;
}

export function WelcomeCarouselScreen({ onComplete }: { onComplete: () => void }) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const list = useRef<FlatList<(typeof PAGES)[number]>>(null);
  const [index, setIndex] = useState(0);
  const currentIndex = useRef(0);
  const reducedMotion = useRef(true);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { reducedMotion.current = value; }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reducedMotion.current = value; });
    return () => subscription.remove();
  }, []);

  useEffect(() => { list.current?.scrollToOffset({ offset: currentIndex.current * width, animated: false }); }, [width]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const next = viewableItems[0]?.index;
    if (typeof next === 'number' && next !== currentIndex.current) {
      currentIndex.current = next;
      setIndex(next);
      Haptics.selectionAsync().catch(() => {});
    }
  }).current;

  const config = useRef({ itemVisiblePercentThreshold: 60 }).current;

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.top}>
      <View style={authStyles.brand}><AppIcon name="leaf" size={24} color={colors.primary} /><Text style={[authStyles.brandText, { color: colors.text }]}>TerraSense</Text></View>
      <Pressable accessibilityRole="button" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>null); onComplete(); }} style={authStyles.link}>
        <Text style={[authStyles.label, { color: colors.textSecondary }]}>{t('Saltar', 'Skip')}</Text>
      </Pressable>
    </Animated.View>

    <FlatList ref={list} data={PAGES} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
      extraData={{ width, colors, t }} keyExtractor={(_, page) => String(page)}
      getItemLayout={(_, page) => ({ length: width, offset: width * page, index: page })}
      onViewableItemsChanged={onViewableItemsChanged} viewabilityConfig={config}
      renderItem={({ item, index: page }) => <ScrollView style={{ width }} contentContainerStyle={styles.page}
        accessibilityElementsHidden={page !== index} importantForAccessibility={page === index ? 'auto' : 'no-hide-descendants'}>
        <SoilArtwork variant={page} />
        <View style={{ gap: 16, paddingTop: 32 }}>
          <Animated.Text entering={FadeInDown.delay(100).duration(500).springify()} style={[authStyles.eyebrow, { color: colors.primary }]}>{t(item.eyebrow[0], item.eyebrow[1])}</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(200).duration(500).springify()} accessibilityRole="header" style={[authStyles.title, { fontSize: 36, lineHeight: 42, color: colors.text }]}>{t(item.title[0], item.title[1])}</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(300).duration(500).springify()} style={[authStyles.body, { color: colors.textSecondary }]}>{t(item.body[0], item.body[1])}</Animated.Text>
        </View>
      </ScrollView>} />

    <Animated.View entering={FadeInDown.delay(400).duration(600).springify()} style={styles.footer}>
      <View style={styles.progress} accessibilityLabel={t(`Página ${index + 1} de 3`, `Page ${index + 1} of 3`)}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {PAGES.map((_, page) => (
            <PaginationDot key={page} isActive={page === index} primaryColor={colors.primary} borderActiveColor={colors.border} />
          ))}
        </View>
        <Text style={[authStyles.label, { color: colors.textSecondary, fontVariant: ['tabular-nums'] }]}>0{index + 1} / 03</Text>
      </View>
      <AuthButton label={index === 2 ? t('Comenzar', 'Get started') : t('Continuar', 'Continue')} onPress={() => {
        if (index === 2) onComplete();
        else {
          list.current?.scrollToIndex({ index: index + 1, animated: !reducedMotion.current });
        }
      }} />
    </Animated.View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, maxWidth: 520, width: '100%', alignSelf: 'center' },
  page: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  footer: { padding: 24, gap: 24, maxWidth: 520, width: '100%', alignSelf: 'center' },
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
});

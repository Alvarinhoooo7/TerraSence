import React, { useRef, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { AppIcon } from '../components/AppIcon';

const PAGES = [
  {
    eyebrow: 'QUIÉNES SOMOS',
    icon: '◉',
    title: 'Tecnología creada para trabajar con la tierra',
    body: 'TerraSense une instrumentación, electrónica y conocimiento agronómico para acercar información útil a quienes producen.',
  },
  {
    eyebrow: 'QUÉ HACEMOS',
    icon: '⌁',
    title: 'Convertimos lecturas en decisiones',
    body: 'Medimos condiciones del suelo y las explicamos con palabras claras, recomendaciones y un historial fácil de consultar.',
  },
  {
    eyebrow: 'POR QUÉ Y CÓMO',
    icon: '↗',
    title: 'Porque un número sin contexto no resuelve el problema',
    body: 'La sonda se conecta por Bluetooth y la app combina fase productiva, suelo y clima para proponer el siguiente paso.',
  },
] as const;

interface Props {
  onComplete: () => void;
}

export const WelcomeCarouselScreen: React.FC<Props> = ({ onComplete }) => {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const listRef = useRef<FlatList<(typeof PAGES)[number]>>(null);
  const [index, setIndex] = useState(0);

  const advance = () => {
    if (index === PAGES.length - 1) {
      onComplete();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const next = viewableItems[0]?.index;
      if (typeof next === 'number') setIndex(next);
    },
  ).current;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Text style={[styles.brand, { color: colors.primary }]}>TerraSense</Text>
        {index < PAGES.length - 1 && (
          <TouchableOpacity onPress={onComplete} style={styles.skip} accessibilityRole="button">
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Saltar</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(item) => item.eyebrow}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <ScrollView style={{ width }} contentContainerStyle={styles.page}>
            <View style={[styles.visual, { backgroundColor: colors.primaryDark }]}>
              <View style={styles.orbitOuter}><View style={styles.orbitInner}><AppIcon name={item === PAGES[0] ? 'leaf' : item === PAGES[1] ? 'probe' : 'map'} color="#C5E8AF" size={76} /></View></View>
            </View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{item.eyebrow}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text>
          </ScrollView>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((page, pageIndex) => (
            <View
              key={page.eyebrow}
              style={[
                styles.dot,
                {
                  width: pageIndex === index ? 28 : 8,
                  backgroundColor: pageIndex === index ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          onPress={advance}
          style={[styles.cta, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>
            {index === PAGES.length - 1 ? 'Comenzar' : 'Continuar'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    minHeight: 64,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { ...Typography.titleMedium },
  skip: { minHeight: Spacing.touchTarget, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  skipText: { ...Typography.bodyBold },
  page: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  visual: {
    height: 250,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  visualIcon: { color: '#FFFFFF', fontSize: 88, fontWeight: '300' },
  orbitOuter: { width: 210, height: 210, borderRadius: 105, borderWidth: 1, borderColor: '#42614E', alignItems: 'center', justifyContent: 'center' },
  orbitInner: { width: 155, height: 155, borderRadius: 78, borderWidth: 1, borderColor: '#648267', backgroundColor: '#203E2D', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...Typography.badge, letterSpacing: 1.2, marginBottom: Spacing.sm },
  title: { ...Typography.titleLarge, fontSize: 30, lineHeight: 36, marginBottom: Spacing.md },
  body: { ...Typography.bodyRegular, fontSize: 17, lineHeight: 25 },
  footer: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  dots: { height: 20, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  dot: { height: 8, borderRadius: 4 },
  cta: { minHeight: 56, borderRadius: Spacing.borderRadius, alignItems: 'center', justifyContent: 'center' },
  ctaText: { ...Typography.button, color: '#FFFFFF', fontSize: 17 },
});

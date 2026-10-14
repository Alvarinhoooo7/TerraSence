import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, TextInput, View } from 'react-native';
import Animated, { Easing, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Text } from './AppText';
import { AppIcon } from './AppIcon';
import { GuideTouchable } from './guide/GuideControls';
import { useEntryFocus } from './entry/EntryUI';
import { ScreenCard, ScreenOption, ScreenText } from './screen/ScreenUI';
import { enterDown, layoutFlow, motionTiming } from '../constants/motion';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { PHENOLOGICAL_STAGES, type PhenologicalStage } from '../types/app';
import {
  SPECIES_GROUPS, hasStageCriteria, searchSpecies, speciesName, type SpeciesEntry, type SpeciesGroup,
} from '../engine/speciesCatalog';

// Paleta de la bienvenida y de las ilustraciones de etapa: fondo verde oscuro en ambos temas.
const BG = '#17392C';
const LEAF = '#C6DFB4';
const GRAIN = '#E3C27A';
const TRUNK = '#8A6F4E';

/** Una planta por grupo del catálogo, dibujada con la base en el borde inferior de su caja. */
const PLANTS: { group: SpeciesGroup; x: number; w: number; h: number; art: React.ReactNode }[] = [
  { group: 'hortalizas', x: 40, w: 56, h: 44, art: <>
    <Ellipse cx="17" cy="33" rx="14" ry="11" fill="#7FB06B" />
    <Ellipse cx="39" cy="33" rx="14" ry="11" fill="#7FB06B" />
    <Ellipse cx="28" cy="25" rx="15" ry="15" fill={LEAF} />
    <Path d="M28 42V16M28 30 20 23M28 30 36 23" stroke="#5E8C5C" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </> },
  { group: 'frutales', x: 96, w: 64, h: 82, art: <>
    <Path d="M32 82V50M32 62 23 53M32 57 41 49" stroke={TRUNK} strokeWidth="4" fill="none" strokeLinecap="round" />
    <Circle cx="32" cy="30" r="25" fill="#5E9C5A" />
    <Circle cx="24" cy="23" r="14" fill="#6FAE66" />
    {[[20, 33], [39, 21], [43, 38], [28, 14], [33, 42]].map(([cx, cy]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" fill="#E86A5A" />)}
  </> },
  { group: 'berries', x: 152, w: 56, h: 46, art: <>
    <Ellipse cx="18" cy="32" rx="16" ry="13" fill="#4F8A55" />
    <Ellipse cx="38" cy="30" rx="17" ry="15" fill="#5E9C5A" />
    <Ellipse cx="28" cy="22" rx="13" ry="12" fill="#6FAE66" />
    {[[15, 28], [22, 35], [34, 22], [41, 31], [28, 15], [46, 24]].map(([cx, cy], i) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.2" fill={i % 2 ? '#3D5BA8' : '#6F8FE0'} />)}
  </> },
  { group: 'cultivos', x: 200, w: 40, h: 86, art: <>
    <Path d="M20 86C20 64 21 44 22 20" stroke={GRAIN} strokeWidth="2" fill="none" strokeLinecap="round" />
    {[0, 1, 2, 3, 4].map(i => {
      const y = 12 + i * 7;
      return <G key={i}>
        <Ellipse cx="18" cy={y} rx="2.6" ry="4.6" fill={GRAIN} transform={`rotate(-28 18 ${y})`} />
        <Ellipse cx="25" cy={y} rx="2.6" ry="4.6" fill={GRAIN} transform={`rotate(28 25 ${y})`} />
      </G>;
    })}
    <Path d="M21 62C14 58 10 52 9 46M21 70C28 66 31 60 32 54" stroke="#9CCB7E" strokeWidth="2" fill="none" strokeLinecap="round" />
  </> },
  { group: 'forrajeras', x: 244, w: 52, h: 42, art: <>
    <Path d="M10 42Q12 22 6 9M18 42Q18 18 22 5M26 42Q24 22 30 11M34 42Q36 20 44 9M42 42Q42 28 48 19" stroke="#9CCB7E" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Circle cx="22" cy="6" r="4" fill="#E3A1C0" />
    <Circle cx="44" cy="9" r="3.6" fill="#E3A1C0" />
  </> },
  { group: 'aromaticas', x: 288, w: 40, h: 62, art: <>
    <Path d="M20 62V12" stroke={LEAF} strokeWidth="2.4" strokeLinecap="round" />
    {[46, 34, 22].map(y => <G key={y}>
      <Ellipse cx="13" cy={y} rx="7" ry="3.6" fill="#8FC27A" transform={`rotate(-24 13 ${y})`} />
      <Ellipse cx="27" cy={y - 4} rx="7" ry="3.6" fill="#8FC27A" transform={`rotate(24 27 ${y - 4})`} />
    </G>)}
    {[[20, 8], [16, 12], [24, 12]].map(([cx, cy]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="#B79CE6" />)}
  </> },
  { group: 'forestales', x: 330, w: 52, h: 90, art: <>
    <Rect x="23" y="74" width="6" height="16" fill={TRUNK} />
    <Path d="M26 2 8 32H44Z" fill="#2F6B45" />
    <Path d="M26 18 5 52H47Z" fill="#2A5F3E" />
    <Path d="M26 36 2 76H50Z" fill="#245437" />
  </> },
];
const ART_W = 360, ART_H = 150, GROUND = 126;

function SwayingPlant({ plant, index, highlight, reduced }: { plant: typeof PLANTS[number]; index: number; highlight: SpeciesGroup | null; reduced: boolean }) {
  const sway = useSharedValue(0);
  const focus = useSharedValue(0);
  const chosen = highlight === plant.group;
  useEffect(() => {
    if (reduced) { sway.value = 0; return; }
    // Vaivén lento de ida y vuelta, con curva suave y sin rebote; cada planta con su propio desfase.
    const half = 1500 + index * 170;
    sway.value = withDelay(index * 120, withRepeat(withSequence(
      withTiming(1, { duration: half, easing: Easing.inOut(Easing.sin) }),
      withTiming(-1, { duration: half, easing: Easing.inOut(Easing.sin) }),
    ), -1, true));
  }, [index, reduced, sway]);
  useEffect(() => { focus.value = motionTiming(highlight == null ? 0 : chosen ? 1 : -1, 320); }, [chosen, focus, highlight]);
  const style = useAnimatedStyle(() => ({
    opacity: focus.value < 0 ? 1 + focus.value * .55 : 1,
    transform: [
      { translateY: focus.value > 0 ? -6 * focus.value : 0 },
      { scale: focus.value > 0 ? 1 + .14 * focus.value : 1 },
      { rotate: `${sway.value * (chosen ? 4 : 2.5)}deg` },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', left: `${(plant.x - plant.w / 2) / ART_W * 100}%`, bottom: `${(ART_H - GROUND) / ART_H * 100}%`,
    width: `${plant.w / ART_W * 100}%`, aspectRatio: plant.w / plant.h, transformOrigin: 'bottom' }, style]}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${plant.w} ${plant.h}`}>{plant.art}</Svg>
  </Animated.View>;
}

/** Huerta ilustrada: la planta del grupo de la especie elegida se adelanta y las demás se atenúan. */
export function SpeciesArt({ highlight }: { highlight: SpeciesGroup | null }) {
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  const target = PLANTS.find(p => p.group === highlight);
  useEffect(() => {
    glow.value = highlight && !reduced
      ? withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }), -1, true)
      : withTiming(highlight ? .6 : 0, { duration: 320 });
  }, [glow, highlight, reduced]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: .14 + .22 * glow.value, transform: [{ scale: .9 + .14 * glow.value }] }));
  return <View accessible={false} importantForAccessibility="no-hide-descendants"
    style={{ width: '100%', aspectRatio: ART_W / ART_H, borderRadius: 20, overflow: 'hidden', backgroundColor: BG }}>
    <Svg style={{ position: 'absolute', width: '100%', height: '100%' }} viewBox={`0 0 ${ART_W} ${ART_H}`} preserveAspectRatio="xMidYMid meet">
      <Circle cx="312" cy="22" r="78" fill="none" stroke="#3F604B" strokeWidth="1" />
      <Circle cx="312" cy="22" r="48" fill="none" stroke="#3F604B" strokeWidth="1" />
      <Path d={`M0 ${GROUND - 4}Q90 ${GROUND - 16} 180 ${GROUND - 4}T360 ${GROUND - 8}V150H0Z`} fill="#355B41" />
      <Path d="M0 140Q90 132 180 142T360 138V150H0Z" fill="#6B6A45" />
    </Svg>
    {target && <Animated.View style={[{ position: 'absolute', left: `${(target.x - 36) / ART_W * 100}%`, bottom: `${(ART_H - GROUND - 6) / ART_H * 100}%`,
      width: `${72 / ART_W * 100}%`, aspectRatio: 1, borderRadius: 999, backgroundColor: LEAF }, glowStyle]} />}
    {PLANTS.map((plant, i) => <SwayingPlant key={plant.group} plant={plant} index={i} highlight={highlight} reduced={reduced} />)}
  </View>;
}

/** Espacio bajo el buscador, sobre el teclado, para que se vean unos tres resultados. */
const SEARCH_RESULTS_ROOM = 220;

const groupInfo = (group: SpeciesGroup) => SPECIES_GROUPS.find(g => g.id === group)!;

/**
 * Selector de especie de vegetativo, floración y cosecha: barra desplegable con buscador,
 * lista agrupada y la especie elegida. «Saltar» y «Continuar» los pone la pantalla.
 */
export function SpeciesPicker({ stage, value, onChange, onMissing }: {
  stage: PhenologicalStage;
  value: SpeciesEntry | null;
  onChange: (species: SpeciesEntry) => void;
  onMissing: () => void;
}) {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const lang = language === 'en' ? 'en' : 'es';
  const revealFocus = useEntryFocus();
  const input = useRef<TextInput>(null);
  const [open, setOpen] = useState(value == null);
  const [query, setQuery] = useState('');
  // Grupos recogidos de entrada para no obligar a recorrer las 115 especies; abre el de la elegida.
  const [expanded, setExpanded] = useState<ReadonlySet<SpeciesGroup>>(() => new Set(value ? [value.group] : []));
  const results = useMemo(() => searchSpecies(query, lang), [query, lang]);
  const chevron = useSharedValue(open ? 1 : 0);
  useEffect(() => { chevron.value = motionTiming(open ? 1 : 0, 240); }, [chevron, open]);
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${chevron.value * 180}deg` }] }));
  const stageItem = PHENOLOGICAL_STAGES.find(s => s.id === stage);
  const stageName = (lang === 'en' ? stageItem?.labelEn : stageItem?.label)?.toLowerCase() ?? '';
  const groupName = (group: SpeciesGroup) => lang === 'en' ? groupInfo(group).en : groupInfo(group).es;

  const choose = (species: SpeciesEntry) => {
    void Haptics.selectionAsync().catch(() => undefined);
    Keyboard.dismiss();
    onChange(species);
    setOpen(false);
    setQuery('');
  };
  const toggle = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    if (open) Keyboard.dismiss();
    else if (value) setExpanded(current => new Set(current).add(value.group));
    setOpen(!open);
  };
  const toggleGroup = (group: SpeciesGroup) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setExpanded(current => {
      const next = new Set(current);
      if (!next.delete(group)) next.add(group);
      return next;
    });
  };

  const row = (species: SpeciesEntry, subtitle: string) => {
    const selected = value?.id === species.id;
    const name = speciesName(species, lang);
    return <Pressable key={species.id} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={name}
      accessibilityHint={subtitle} onPress={() => choose(species)}
      style={({ pressed }) => ({ minHeight: 54, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: selected ? `${colors.primary}22` : pressed ? `${colors.primary}12` : 'transparent' })}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: selected ? '700' : '600' }}>{name}</Text>
        {!!subtitle && <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 13 }}>{subtitle}</Text>}
      </View>
      {selected && <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: colors.primary, fontSize: 18 }}>●</Text>}
    </Pressable>;
  };
  const synonyms = (species: SpeciesEntry) => (lang === 'en' ? species.synonymsEn : species.synonymsEs).slice(0, 3).join(', ');

  const grouped = SPECIES_GROUPS.map(group => ({ group, items: results.filter(s => s.group === group.id) })).filter(g => g.items.length);
  const criteria = value ? hasStageCriteria(value.id, stage) : false;

  return <View style={{ gap: 14 }}>
    <Animated.View entering={enterDown(60)}><SpeciesArt highlight={value?.group ?? null} /></Animated.View>

    <Animated.View entering={enterDown(140)}>
      <GuideTouchable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={toggle}
        accessibilityLabel={value ? `${t('Especie', 'Species')}: ${speciesName(value, lang)}` : t('Elegir especie', 'Choose species')}
        guideTitle={t('Lista de especies', 'Species list')}
        guide={t('Abre la lista de especies y busca la tuya por nombre. Puedes escribir sin tildes.', 'Opens the species list so you can search for yours by name.')}
        style={{ minHeight: 68, borderRadius: 18, borderWidth: open || value ? 2 : 1, borderColor: open || value ? colors.primary : colors.border,
          backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
          <AppIcon name="leaf" color={LEAF} size={20} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          {value ? <>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{speciesName(value, lang)}</Text>
            <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 13 }}>{groupName(value.group)}</Text>
          </> : <Text style={{ color: colors.textSecondary, fontSize: 17 }}>{t('Elige una especie', 'Choose a species')}</Text>}
        </View>
        <Animated.View style={chevronStyle}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>▾</Text>
        </Animated.View>
      </GuideTouchable>
    </Animated.View>

    {open && <Animated.View entering={enterDown()} exiting={FadeOut.duration(160)} layout={layoutFlow()}
      style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 10, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, borderRadius: 14, borderWidth: 1.5,
        borderColor: query ? colors.primary : colors.border, backgroundColor: colors.background, paddingLeft: 14 }}>
        <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: colors.textSecondary, fontSize: 16 }}>⌕</Text>
        <TextInput ref={input} value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none" returnKeyType="search"
          onFocus={() => revealFocus(input.current, SEARCH_RESULTS_ROOM)} placeholder={t('Buscar: tomate, palta, trigo…', 'Search: tomato, avocado, wheat…')}
          placeholderTextColor={colors.textSecondary} accessibilityLabel={t('Buscar especie', 'Search species')}
          style={{ flex: 1, minHeight: 48, fontSize: 16, color: colors.text }} />
        {!!query && <Pressable accessibilityRole="button" accessibilityLabel={t('Borrar búsqueda', 'Clear search')} onPress={() => setQuery('')}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>
        </Pressable>}
      </View>
      <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary, fontSize: 13, paddingHorizontal: 6 }}>
        {results.length
          ? t(`${results.length} ${results.length === 1 ? 'especie' : 'especies'}`, `${results.length} ${results.length === 1 ? 'species' : 'species'}`)
          : t(`No encontramos «${query.trim()}».`, `No match for “${query.trim()}”.`)}
      </Text>
      {query.trim()
        ? results.map(species => row(species, groupName(species.group)))
        : grouped.map(({ group, items }) => {
          const isOpen = expanded.has(group.id);
          const title = `${(lang === 'en' ? group.en : group.es).toUpperCase()}${group.partial ? t(' · LISTA PARCIAL', ' · PARTIAL LIST') : ''}`;
          return <View key={group.id} style={{ gap: 2 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${lang === 'en' ? group.en : group.es}, ${items.length} ${items.length === 1 ? t('especie', 'species') : t('especies', 'species')}`}
              onPress={() => toggleGroup(group.id)}
              style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: pressed ? `${colors.primary}12` : 'transparent' })}>
              <Text style={{ flex: 1, color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>{title}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{items.length}</Text>
              <Text accessibilityElementsHidden importantForAccessibility="no"
                style={{ color: colors.primary, fontSize: 16, fontWeight: '700', transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>▾</Text>
            </Pressable>
            {isOpen && <Animated.View entering={enterDown()} exiting={FadeOut.duration(120)} style={{ gap: 2 }}>
              {items.map(species => row(species, synonyms(species) || species.scientific))}
            </Animated.View>}
          </View>;
        })}
      <View style={{ paddingTop: 6 }}>
        <ScreenOption title={t('No se encuentra en la lista', 'Not on the list')} subtitle={t('Seguir sin indicar especie', 'Continue without a species')}
          guide={t('Si tu planta no aparece, puedes medir igual sin especie.', 'If your plant is not listed, you can still measure without a species.')}
          onPress={() => { Keyboard.dismiss(); onMissing(); }} />
      </View>
    </Animated.View>}

    {value && !open && <Animated.View key={value.id} entering={enterDown()}>
      <ScreenCard accent={colors.primary}>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>{groupName(value.group).toUpperCase()}</Text>
        <View style={{ gap: 2 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{speciesName(value, lang)}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 15, fontStyle: 'italic' }}>{value.scientific}</Text>
        </View>
        <ScreenText>{criteria
          ? t(`La lectura sumará los criterios de esta especie para ${stageName}.`, `The reading will add this species’ criteria for ${stageName}.`)
          : t(`Todavía no hay criterios propios de esta especie para ${stageName}. La lectura usará el análisis general y quedará registrada con la especie.`,
            `There are no criteria specific to this species for ${stageName} yet. The reading will use the general assessment and be saved with the species.`)}</ScreenText>
        <Pressable accessibilityRole="button" onPress={toggle} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '700' }}>{t('Cambiar especie', 'Change species')}</Text>
        </Pressable>
      </ScreenCard>
    </Animated.View>}

    {!value && !open && <Animated.View entering={enterDown()}>
      <ScreenText>{t('Es opcional: sin especie, la lectura se interpreta igual con el análisis general.', 'It is optional: without a species, the reading is interpreted with the general assessment.')}</ScreenText>
    </Animated.View>}
  </View>;
}

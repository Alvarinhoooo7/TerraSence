import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
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

/** La planta de un grupo, en miniatura sobre un círculo verde oscuro, para las fichas de grupo. */
function GroupBadge({ group, size = 30 }: { group: SpeciesGroup; size?: number }) {
  const plant = PLANTS.find(p => p.group === group)!;
  const box = Math.max(plant.w, plant.h) + 8;
  return <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: BG, overflow: 'hidden' }}>
    <Svg width="100%" height="100%" viewBox={`${(plant.w - box) / 2} ${plant.h - box + 4} ${box} ${box}`}>{plant.art}</Svg>
  </View>;
}

function SearchGlyph({ color }: { color: string }) {
  return <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
    <Circle cx="11" cy="11" r="7" fill="none" stroke={color} strokeWidth="2" />
    <Path d="M16 16l5 5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>;
}

/**
 * Selector de especie de vegetativo, floración y cosecha: buscador siempre a la vista,
 * fichas de grupo que se deslizan de lado y la lista del grupo activo en una sola
 * tarjeta. Al elegir, la lista se recoge en la especie elegida. «Saltar» y «Continuar»
 * los pone la pantalla.
 */
export function SpeciesPicker({ stage, value, onChange, onMissing }: {
  stage: PhenologicalStage;
  value: SpeciesEntry | null;
  onChange: (species: SpeciesEntry) => void;
  onMissing: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  const { t, language } = useTranslation();
  const lang = language === 'en' ? 'en' : 'es';
  const revealFocus = useEntryFocus();
  const input = useRef<TextInput>(null);
  const [browsing, setBrowsing] = useState(value == null);
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<SpeciesGroup>(value?.group ?? SPECIES_GROUPS[0].id);
  const results = useMemo(() => searchSpecies(query, lang), [query, lang]);
  const searching = !!query.trim();
  const stageItem = PHENOLOGICAL_STAGES.find(s => s.id === stage);
  const stageName = (lang === 'en' ? stageItem?.labelEn : stageItem?.label)?.toLowerCase() ?? '';
  const groupName = (group: SpeciesGroup) => lang === 'en' ? groupInfo(group).en : groupInfo(group).es;
  const counts = useMemo(() => {
    const all = searchSpecies('', lang);
    return new Map(SPECIES_GROUPS.map(g => [g.id, all.filter(s => s.group === g.id).length]));
  }, [lang]);

  const choose = (species: SpeciesEntry) => {
    void Haptics.selectionAsync().catch(() => undefined);
    Keyboard.dismiss();
    onChange(species);
    setBrowsing(false);
    setQuery('');
  };
  const browse = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    if (value) setActiveGroup(value.group);
    setBrowsing(true);
  };
  const pickGroup = (group: SpeciesGroup) => {
    if (group !== activeGroup) void Haptics.selectionAsync().catch(() => undefined);
    setActiveGroup(group);
  };

  const row = (species: SpeciesEntry, subtitle: string, last: boolean) => {
    const selected = value?.id === species.id;
    const name = speciesName(species, lang);
    return <View key={species.id}>
      <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={name}
        accessibilityHint={subtitle} onPress={() => choose(species)}
        style={({ pressed }) => ({ minHeight: 60, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: selected ? colors.tintSuccess : pressed ? `${colors.primary}12` : 'transparent' })}>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ color: selected ? colors.primary : colors.text, fontSize: 16, fontWeight: selected ? '700' : '600' }}>{name}</Text>
          <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>{subtitle}</Text>
        </View>
        {selected
          ? <View accessible={false} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="check" size={15} color={colors.background} />
          </View>
          : <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: colors.textSecondary, fontSize: 20 }}>›</Text>}
      </Pressable>
      {!last && <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 14 }} />}
    </View>;
  };
  const subtitleFor = (species: SpeciesEntry) => searching
    ? `${groupName(species.group)} · ${species.scientific}`
    : species.scientific;

  const listed = searching ? results : results.filter(s => s.group === activeGroup);
  const active = groupInfo(activeGroup);
  const criteria = value ? hasStageCriteria(value.id, stage) : false;

  return <View style={{ gap: 14 }}>
    <Animated.View entering={enterDown(60)}><SpeciesArt highlight={value && !browsing ? value.group : searching ? null : activeGroup} /></Animated.View>

    {browsing && <Animated.View entering={enterDown(120)} exiting={FadeOut.duration(160)} layout={layoutFlow()} style={{ gap: 12 }}>
      {/* Buscador */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, borderRadius: 16, borderWidth: 1.5,
        borderColor: query ? colors.primary : colors.border, backgroundColor: colors.card, paddingLeft: 14 }}>
        <SearchGlyph color={colors.textSecondary} />
        <TextInput ref={input} value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none" returnKeyType="search"
          onFocus={() => revealFocus(input.current, SEARCH_RESULTS_ROOM)} placeholder={t('Buscar: tomate, palta, trigo…', 'Search: tomato, avocado, wheat…')}
          placeholderTextColor={colors.textSecondary} accessibilityLabel={t('Buscar especie', 'Search species')}
          style={{ flex: 1, minHeight: 50, fontSize: 16, color: colors.text }} />
        {!!query && <Pressable accessibilityRole="button" accessibilityLabel={t('Borrar búsqueda', 'Clear search')} onPress={() => setQuery('')}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>
        </Pressable>}
      </View>

      {/* Fichas de grupo: se deslizan de lado; la activa se rellena y su planta se adelanta en el dibujo. */}
      {!searching && <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist"
        style={{ marginHorizontal: -24 }} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
        {SPECIES_GROUPS.map(group => {
          const on = group.id === activeGroup;
          const count = counts.get(group.id) ?? 0;
          return <Pressable key={group.id} accessibilityRole="tab" accessibilityState={{ selected: on }}
            accessibilityLabel={`${lang === 'en' ? group.en : group.es}, ${count} ${count === 1 ? t('especie', 'species') : t('especies', 'species')}`}
            onPress={() => pickGroup(group.id)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingLeft: 8, paddingRight: 14, borderRadius: 999,
              borderWidth: 1, borderColor: on ? colors.primary : colors.border,
              backgroundColor: on ? colors.primary : pressed ? `${colors.primary}12` : colors.card })}>
            <GroupBadge group={group.id} />
            <Text style={{ color: on ? (isDark ? colors.background : '#FFFFFF') : colors.text, fontSize: 15, fontWeight: '700' }}>{lang === 'en' ? group.en : group.es}</Text>
            <Text style={{ color: on ? (isDark ? colors.background : '#FFFFFF') : colors.textSecondary, fontSize: 13, opacity: on ? 0.85 : 1 }}>{count}</Text>
          </Pressable>;
        })}
      </ScrollView>}

      <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary, fontSize: 13, paddingHorizontal: 4 }}>
        {searching
          ? (results.length
            ? t(`${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`, `${results.length} ${results.length === 1 ? 'result' : 'results'}`)
            : t(`No encontramos «${query.trim()}». Prueba con otro nombre o elige un grupo.`, `No match for “${query.trim()}”. Try another name or pick a group.`))
          : active.partial
            ? t('Lista parcial: estamos sumando más especies a este grupo.', 'Partial list: we are adding more species to this group.')
            : t(`${listed.length} especies en ${groupName(activeGroup).toLowerCase()}`, `${listed.length} species in ${groupName(activeGroup).toLowerCase()}`)}
      </Text>

      {/* Lista del grupo activo (o resultados de búsqueda) en una sola tarjeta. */}
      {!!listed.length && <Animated.View key={searching ? 'busqueda' : activeGroup} entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
        style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' }}>
        {listed.map((species, i) => row(species, subtitleFor(species), i === listed.length - 1))}
      </Animated.View>}

      <ScreenOption title={t('No se encuentra en la lista', 'Not on the list')} subtitle={t('Seguir sin indicar especie', 'Continue without a species')}
        guide={t('Si tu planta no aparece, puedes medir igual sin especie.', 'If your plant is not listed, you can still measure without a species.')}
        onPress={() => { Keyboard.dismiss(); onMissing(); }} />
    </Animated.View>}

    {value && !browsing && <Animated.View key={value.id} entering={enterDown()}>
      <ScreenCard accent={colors.primary}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <GroupBadge group={value.group} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>{groupName(value.group).toUpperCase()}</Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{speciesName(value, lang)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15, fontStyle: 'italic' }}>{value.scientific}</Text>
          </View>
        </View>
        <ScreenText>{criteria
          ? t(`La lectura sumará los criterios de esta especie para ${stageName}.`, `The reading will add this species’ criteria for ${stageName}.`)
          : t(`Todavía no hay criterios propios de esta especie para ${stageName}. La lectura usará el análisis general y quedará registrada con la especie.`,
            `There are no criteria specific to this species for ${stageName} yet. The reading will use the general assessment and be saved with the species.`)}</ScreenText>
        <GuideTouchable accessibilityRole="button" onPress={browse}
          guide={t('Vuelve a la lista para elegir otra especie.', 'Goes back to the list to choose another species.')}
          style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '700' }}>{t('Cambiar especie', 'Change species')}</Text>
        </GuideTouchable>
      </ScreenCard>
    </Animated.View>}

  </View>;
}

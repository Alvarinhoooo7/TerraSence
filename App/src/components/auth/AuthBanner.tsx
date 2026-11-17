import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../AppText';
import { ProbeGlyph } from '../art/ProbeGlyph';
import { LanguageSwitch } from '../entry/LanguageSwitch';
import { useEntryMetrics } from '../entry/EntryUI';
import { Typography } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { AppLanguage } from '../../types/preferences';

const BG = '#12281F';
const RING = '#1F3F31';
const LEAF = '#C6DFB4';

/**
 * Cabecera del acceso: el nombre de la app y la sonda enterrada en el campo, sobre `#12281F` en ambos
 * temas. Sube hasta el borde de la pantalla (cancela el área segura superior). En pantallas bajas o con
 * letra grande se encoge para no quitarle lugar al formulario.
 */
export function AuthBanner({ language, onChangeLanguage, busy = false }: { language: AppLanguage; onChangeLanguage?: (language: AppLanguage) => void; busy?: boolean }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { compact, veryCompact } = useEntryMetrics();
  const insets = useSafeAreaInsets();
  const height = veryCompact ? 96 : compact ? 160 : 230;
  return <View style={{ marginHorizontal: -24, marginTop: -insets.top, height: height + insets.top, paddingTop: insets.top, backgroundColor: BG,
    borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden' }}>
    {!veryCompact && <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: insets.top, right: 0, bottom: 0, left: 0 }}>
      <Svg width="100%" height="100%" viewBox="0 0 390 250" preserveAspectRatio="xMaxYMax slice">
        <Circle cx="300" cy="70" r="150" stroke={RING} strokeWidth="1" fill="none" />
        <Circle cx="300" cy="70" r="96" stroke={RING} strokeWidth="1" fill="none" />
        <ProbeGlyph x={300} y={44} scale={1.5} pinLength={56} />
        <Path d="M0 184Q98 164 195 186T390 178V250H0Z" fill="#355B41" />
        <Path d="M0 200Q98 182 195 204T390 194V250H0Z" fill="#6B6A45" />
        <Path d="M40 180l8-13 8 13M118 186l6-10 6 10M356 174l6-11 6 11" stroke={LEAF} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>}
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: veryCompact ? 8 : 20 }}>
      <View style={{ gap: 2 }}>
        <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 34, lineHeight: 40, letterSpacing: -1, ...Typography.display.bold }}>TerraSense</Text>
        {!veryCompact && <Text style={{ color: '#C4D4C9', fontSize: 15 }}>{t('Conoce tu suelo.', 'Know your soil.')}</Text>}
      </View>
      {!!onChangeLanguage && <View style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.card }}>
        <LanguageSwitch language={language} onChange={onChangeLanguage} busy={busy} />
      </View>}
    </View>
  </View>;
}

import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useAppTheme } from '../hooks/useAppTheme';
import { brandSvg } from './brandAsset';

export function BrandLogo({ width = 180 }: { width?: number }) {
  const { colors } = useAppTheme();
  return <View accessible accessibilityRole="image" accessibilityLabel="TerraSense · Soil Technologies" style={{ width, maxWidth: '100%', height: width * 235 / 590 }}>
    <SvgXml xml={brandSvg.replaceAll('#0f2e22', colors.text)} width="100%" height="100%" />
  </View>;
}

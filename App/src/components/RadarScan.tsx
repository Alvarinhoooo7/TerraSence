// src/components/RadarScan.tsx
//
// Indicador de búsqueda por Bluetooth.
//
// Buscar una sonda tarda varios segundos y puede fallar por causas que el
// agricultor no ve: la sonda dormida, fuera de alcance, o el Bluetooth apagado.
// Un `ActivityIndicator` genérico no distingue «buscando» de «colgado», y en
// terreno esa diferencia decide si la persona espera o se va.
//
// Los anillos salen del centro hacia afuera de forma continua: mientras algo se
// mueve hacia el borde, hay búsqueda en curso. Es la misma metáfora del sonar, que
// se entiende sin leer nada.
//
// Las animaciones corren en el hilo nativo (`useNativeDriver`), así que siguen
// fluidas aunque el hilo de JavaScript esté ocupado con el escaneo BLE, que es
// justo cuando se están mostrando.

import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';

const ANILLOS = 3;
const CICLO_MS = 2400;

function Anillo({ retardo, tamano, color }: { retardo: number; tamano: number; color: string }) {
  const progreso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.delay(retardo),
        Animated.timing(progreso, {
          toValue: 1,
          duration: CICLO_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [progreso, retardo]);

  return (
    <Animated.View
      style={[
        styles.anillo,
        {
          width: tamano,
          height: tamano,
          borderRadius: tamano / 2,
          borderColor: color,
          // Nace pequeño en el centro y se desvanece al llegar al borde.
          opacity: progreso.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
          transform: [{ scale: progreso.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }],
        },
      ]}
    />
  );
}

export function RadarScan({
  size = 160,
  children,
}: {
  size?: number;
  /** Contenido del centro: normalmente el icono del equipo que se busca. */
  children?: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const pulso = useRef(new Animated.Value(0)).current;
  // Respetar «reducir movimiento» del sistema: con la preferencia activa se deja
  // el centro quieto y sin anillos, que es lo que el ajuste pide.
  const [reducirMovimiento, setReducirMovimiento] = React.useState(false);

  useEffect(() => {
    let activo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(v => { if (activo) setReducirMovimiento(v); })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducirMovimiento);
    return () => { activo = false; sub.remove(); };
  }, []);

  useEffect(() => {
    if (reducirMovimiento) return;
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [pulso, reducirMovimiento]);

  return (
    <View
      style={[styles.contenedor, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityLabel={t('Buscando la sonda por Bluetooth', 'Searching for the probe over Bluetooth')}
    >
      {!reducirMovimiento &&
        Array.from({ length: ANILLOS }, (_, i) => (
          <Anillo
            key={i}
            retardo={(CICLO_MS / ANILLOS) * i}
            tamano={size}
            color={colors.primary}
          />
        ))}
      <Animated.View
        style={[
          styles.centro,
          {
            backgroundColor: colors.primary,
            width: size * 0.34,
            height: size * 0.34,
            borderRadius: size * 0.17,
            transform: reducirMovimiento
              ? []
              : [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', justifyContent: 'center' },
  anillo: { position: 'absolute', borderWidth: 2 },
  centro: { alignItems: 'center', justifyContent: 'center' },
});

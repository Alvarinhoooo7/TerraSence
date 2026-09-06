// src/components/FadeIn.tsx
//
// Entrada suave para el contenido de una pantalla.
//
// Existe para que todas las pantallas usen el mismo gesto en lugar de que cada una
// improvise el suyo: el contenido aparece subiendo unos píxeles mientras se funde.
// Encadenando `delay` en varios bloques se consigue que la pantalla se construya de
// arriba abajo, que es el orden en que se lee.
//
// El movimiento es corto a propósito (250 ms, 12 px). Una animación de entrada que
// se nota es una animación que estorba: aquí sólo suaviza el corte entre pantallas,
// que en terreno y con sol es donde más cuesta seguir qué cambió.

import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, type ViewStyle } from 'react-native';

export function FadeIn({
  children,
  delay = 0,
  /** Desplazamiento vertical inicial, en píxeles. 0 = sólo fundido. */
  offset = 12,
  duration = 250,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  offset?: number;
  duration?: number;
  style?: ViewStyle | ViewStyle[];
}) {
  const progreso = useRef(new Animated.Value(0)).current;
  const reducirMovimiento = useRef(false);

  useEffect(() => {
    let activo = true;

    const animar = () => {
      if (!activo) return;
      Animated.timing(progreso, {
        toValue: 1,
        // Con «reducir movimiento» se conserva el fundido pero no el desplazamiento,
        // y se acorta: el ajuste pide menos movimiento, no menos información.
        duration: reducirMovimiento.current ? 120 : duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then(v => { reducirMovimiento.current = v; })
      .catch(() => undefined)
      .finally(animar);

    return () => { activo = false; };
  }, [delay, duration, progreso]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progreso,
          transform: [
            {
              translateY: progreso.interpolate({
                inputRange: [0, 1],
                outputRange: [reducirMovimiento.current ? 0 : offset, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

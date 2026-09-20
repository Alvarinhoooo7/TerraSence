// Movimiento del flujo inicial: bienvenida, acceso, términos y verificación.
//
// Un muelle (`springify`, `withSpring`) sobrepasa el valor final y vuelve sobre él:
// eso es lo que se percibe como rebote. Aquí todo se mueve con una curva de salida,
// que llega al valor final y se detiene. Las duraciones están en un solo lugar para
// que las pantallas del flujo se sientan como una sola pieza.
//
// `ReduceMotion.System` respeta «reducir movimiento» del teléfono sin que cada
// pantalla tenga que consultarlo por su cuenta.

import { Easing, FadeIn, FadeInDown, LinearTransition, ReduceMotion, SlideInDown, withTiming } from 'react-native-reanimated';

export const Motion = {
  /** Aparición de un bloque de contenido. */
  enter: 320,
  /** Reacomodo de un formulario al cambiar de modo. */
  layout: 260,
  /** Hundido del botón al pulsarlo. */
  press: 120,
  /** Entrada de una hoja modal desde abajo. */
  sheet: 380,
  /** Desplazamiento asistido de un texto largo. */
  scroll: 800,
} as const;

/** Curva única del flujo: rápida al principio, sin rebote al final. */
export const MotionEasing = Easing.out(Easing.cubic);

/** Entrada desde abajo, escalonable con `delay` para encadenar bloques. */
export const enterDown = (delay = 0) =>
  FadeInDown.delay(delay).duration(Motion.enter).easing(MotionEasing).reduceMotion(ReduceMotion.System);

/**
 * Entrada de una hoja modal desde abajo. Sustituye a `animationType="slide"` del
 * `Modal` de React Native, cuya duración no se puede regular.
 */
export const sheetIn = () =>
  SlideInDown.duration(Motion.sheet).easing(MotionEasing).reduceMotion(ReduceMotion.System);

/** Fundido del fondo atenuado que acompaña a la hoja. */
export const backdropIn = () =>
  FadeIn.duration(Motion.sheet).reduceMotion(ReduceMotion.System);

/** Reacomodo de los hijos cuando el contenido cambia de tamaño o de orden. */
export const layoutFlow = () =>
  LinearTransition.duration(Motion.layout).easing(MotionEasing).reduceMotion(ReduceMotion.System);

/**
 * Valor animado sin muelle; por omisión, a la velocidad del pulsado.
 * Lleva `worklet` para poder usarse dentro de `useAnimatedStyle`, que corre en el
 * hilo de la interfaz, además de en los manejadores normales.
 */
export const motionTiming = (value: number, duration: number = Motion.press) => {
  'worklet';
  return withTiming(value, { duration, easing: MotionEasing });
};

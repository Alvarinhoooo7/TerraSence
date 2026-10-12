import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** «Reducir movimiento» del teléfono, para detener animaciones en bucle que `ReduceMotion.System` no cubre. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => listener.remove();
  }, []);
  return reduced;
}

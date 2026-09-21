/** Gesto local: diez pulsaciones, una sola activación y sólo en desarrollo. */
export function createDeveloperTap(enabled: boolean, activate: () => void) {
  let taps = 0;
  return () => {
    if (!enabled || taps >= 10) return;
    taps += 1;
    if (taps === 10) activate();
  };
}

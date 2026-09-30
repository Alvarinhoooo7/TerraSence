/** Captura la identidad y la generación de una operación que usa permisos. */
export function createAccountOperation(userId: string | undefined, currentUserId: () => string | undefined) {
  let generation = 0;
  let mounted = true;
  let controller = new AbortController();
  const cancel = () => {
    generation += 1;
    controller.abort();
    controller = new AbortController();
  };
  return {
    begin: () => {
      const mine = generation;
      const active = (() => mounted && mine === generation && !!userId && currentUserId() === userId && !controller.signal.aborted) as (() => boolean) & { signal: AbortSignal };
      active.signal = controller.signal;
      return active;
    },
    cancel,
    cancelIfAccountChanged: () => { if (currentUserId() !== userId) cancel(); },
    /** Vuelve a habilitar la operación al montar de nuevo (efectos que se repiten). */
    mount: () => { mounted = true; },
    unmount: () => { mounted = false; cancel(); },
  };
}

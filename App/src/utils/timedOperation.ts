/** Termina la espera y cancela la transacción nativa aunque ésta no responda. */
export async function timedOperation<T>(work: Promise<T>, timeoutMs: number, cancel: () => void, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(message));
        cancel();
      }, timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}

/** Bound library promises even if an injected repository ignores cancellation.
 * A timeout is unavailable, never proof that a write did not commit. */
export async function boundedAwaitV2<T>(start: () => Promise<T>, signal?: AbortSignal, timeoutMs = 10000): Promise<T> {
  if (signal?.aborted) throw new Error('cancelled')
  let timer: ReturnType<typeof setTimeout> | undefined, stop: (() => void) | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('unavailable')), Math.max(1, Math.min(timeoutMs, 10000)))
    stop = () => reject(new Error('cancelled')); signal?.addEventListener('abort', stop, { once: true })
  })
  try { return await Promise.race([start(), deadline]) }
  finally { clearTimeout(timer); if (stop) signal?.removeEventListener('abort', stop) }
}

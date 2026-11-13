import { BROADCAST_CHANNEL_NAME, LOCK_HEARTBEAT_MS, LOCK_WAIT_MS } from './constants';

export function openChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {
    return null;
  }
}

export async function withDownloadLock<T>(
  lockKey: string,
  fn: (isLeader: boolean) => Promise<T>,
): Promise<T> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav && 'locks' in nav && nav.locks) {
    let outcome!: T;
    await nav.locks.request(`mn-model-dl:${lockKey}`, { ifAvailable: true }, async (lock) => {
      outcome = await fn(lock !== null);
    });
    return outcome;
  }

  const channel = openChannel();
  if (!channel) return fn(true);

  let sawOther = false;
  const heartbeatListener = (ev: MessageEvent<{ type: string; key: string }>) => {
    if (ev.data?.type === 'heartbeat' && ev.data.key === lockKey) sawOther = true;
  };
  channel.addEventListener('message', heartbeatListener);
  await new Promise((r) => setTimeout(r, LOCK_WAIT_MS));
  channel.removeEventListener('message', heartbeatListener);

  const isLeader = !sawOther;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  if (isLeader) {
    heartbeatTimer = setInterval(
      () => channel.postMessage({ type: 'heartbeat', key: lockKey }),
      LOCK_HEARTBEAT_MS,
    );
  }
  try {
    return await fn(isLeader);
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    channel.close();
  }
}

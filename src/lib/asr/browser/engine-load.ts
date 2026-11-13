export const LOAD_STALL_MS = 45_000;

export function describeStall(ms: number): string {
  return (
    `Getting the speech model ready made no progress for ${Math.round(ms / 1000)} seconds. ` +
    'This usually means the browser cache holding the model files could not be read, so ' +
    'the files are being fetched again over the network — check your connection, and use ' +
    '“Delete downloaded models” in Settings › Speech model to start from a clean cache.'
  );
}

export const SESSION_STALL_MS = 10 * 60_000;

export function describeSessionStall(ms: number): string {
  return (
    `Starting the speech model made no progress for ${Math.round(ms / 60_000)} minutes. ` +
    'The model files arrived, but creating the on-device session never finished — ' +
    'this usually means the device ran out of memory for the model. Try the WASM backend ' +
    'in Settings › Speech model (its quantised encoder is far smaller), close other tabs, ' +
    'and use “Delete downloaded models” to start from a clean cache.'
  );
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const vendor = (navigator as Navigator & { vendor?: string }).vendor ?? '';
  const ua = navigator.userAgent ?? '';
  return /apple/i.test(vendor) && !/chrome|chromium|crios|fxios|edg/i.test(ua);
}

export function startStallWatchdog(stallMs: number, describe: (ms: number) => string): {

  stall: Promise<never>;

  noteProgress: () => void;

  dispose: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let done = false;

  let rejectStall: (reason: Error) => void = () => {};
  const stall = new Promise<never>((_, reject) => {
    rejectStall = reject;
  });

  stall.catch(() => {});

  const arm = () => {
    if (done) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      if (done) return;
      done = true;
      rejectStall(new Error(describe(stallMs)));
    }, stallMs);
  };
  arm();

  return {
    stall,
    noteProgress: arm,
    dispose: () => {
      done = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}

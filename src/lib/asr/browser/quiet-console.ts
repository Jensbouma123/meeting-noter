const NOISE: readonly RegExp[] = [
  /^\[Parakeet(\.js)?\]/,
  /^Parakeet\.js:/,
  /\[W:onnxruntime/,
  /\[I:onnxruntime/,
];

let installed = false;

function isNoise(args: unknown[]): boolean {
  const first = args[0];
  return typeof first === 'string' && NOISE.some((pattern) => pattern.test(first));
}

let debugOverride = false;

export function debugEnabled(): boolean {
  if (debugOverride) return true;
  try {
    return globalThis.localStorage?.getItem('asr-debug') === '1';
  } catch {
    return false;
  }
}

export function setQuietAsrConsoleDebug(on: boolean): void {
  debugOverride = on;
}

function isBrowserContext(): boolean {
  return typeof window !== 'undefined' || typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== 'undefined';
}

export function installQuietAsrConsole(): void {
  if (installed || !isBrowserContext() || debugEnabled()) return;
  installed = true;
  for (const level of ['log', 'info', 'warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      if (!debugOverride && isNoise(args)) return;
      original(...args);
    };
  }
}

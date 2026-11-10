/**
 * Keep `parakeet.js` and ONNX Runtime from flooding the console.
 *
 * Both log unconditionally: parakeet.js prints its backend probe and a line per
 * inference ("[Parakeet] Preprocessor: …"), and ORT's WASM build reports
 * warning-level messages ("[W:onnxruntime …] Unknown CPU vendor",
 * "VerifyEachNodeIsAssignedToAnEp") through `console.error` with a stack trace.
 * None of them is actionable, and a live recording runs an inference every
 * couple of seconds. Real errors (ORT "[E:…]", anything from this app) pass
 * through untouched.
 *
 * Set `localStorage['asr-debug'] = '1'` and reload to see everything again.
 */

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

/**
 * Set by the speech-model worker from the page's `asr-debug` flag: a worker
 * has no `localStorage` to read it from (see `engine-worker.ts`).
 */
let debugOverride = false;

export function debugEnabled(): boolean {
  if (debugOverride) return true;
  try {
    return globalThis.localStorage?.getItem('asr-debug') === '1';
  } catch {
    return false;
  }
}

/** Pass the page's `asr-debug` flag into a worker's console filter. */
export function setQuietAsrConsoleDebug(on: boolean): void {
  debugOverride = on;
}

/** A page or a worker — not Node, where tests run. */
function isBrowserContext(): boolean {
  return typeof window !== 'undefined' || typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== 'undefined';
}

/** Idempotent; a no-op outside the browser. The `asr-debug` flag is read per
 *  call, so the worker's override can arrive after the filter is installed. */
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

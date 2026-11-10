/**
 * Load-time plumbing shared by the speech engines (`parakeet.ts`,
 * `nemotron.ts`): the stall watchdogs that turn a silent hang into a stated
 * error, and the Safari check that picks a single WASM thread.
 */

/**
 * How long the model load may go without a single observable byte before it
 * is treated as stalled.
 *
 * Resolving the model's URLs is the one step in the load that can take
 * unbounded time *and* report nothing, and the failure it produces is a hang,
 * not an error: an IndexedDB read of a 2.44 GB file that never resolves, a
 * connection that stops producing chunks, or a `fetch` that never settles.
 * Nothing rejects, nothing logs, and the preparation bar sits on the last
 * stage it did reach ("Initializing model 35%", the file-probe weight) for as
 * long as the user cares to wait, with no way to tell a slow disk from a
 * dead one.
 *
 * Real progress — a byte count moving, or the promise settling — clears this
 * timer, so a genuinely slow but working multi-gigabyte transfer is never cut
 * off. Only *silence* is a failure.
 */
export const LOAD_STALL_MS = 45_000;

/** The stall message shown when `LOAD_STALL_MS` elapses with nothing observed. */
export function describeStall(ms: number): string {
  return (
    `Getting the speech model ready made no progress for ${Math.round(ms / 1000)} seconds. ` +
    'This usually means the browser cache holding the model files could not be read, so ' +
    'the files are being fetched again over the network — check your connection, and use ' +
    '“Delete downloaded models” in Settings › Speech model to start from a clean cache.'
  );
}

/**
 * How long ONNX session creation plus the warm-up inference may take before
 * the load is treated as stalled.
 *
 * Separate from `LOAD_STALL_MS` on purpose: resolving the URLs reports bytes
 * and can be judged on silence, but session creation reports nothing at all
   * while being legitimately slow — compiling the 1.24 GB fp16 encoder takes
   * minutes on older hardware. This deadline only catches a true hang (the
 * step with a history of never settling), so it is generous. Test-visible so
 * the hang case is pinnable without waiting it out.
 */
export const SESSION_STALL_MS = 10 * 60_000;

/** The actionable message a stalled session creation fails with. */
export function describeSessionStall(ms: number): string {
  return (
    `Starting the speech model made no progress for ${Math.round(ms / 60_000)} minutes. ` +
    'The model files arrived, but creating the on-device session never finished — ' +
    'this usually means the device ran out of memory for the model. Try the WASM backend ' +
    'in Settings › Speech model (its quantised encoder is far smaller), close other tabs, ' +
    'and use “Delete downloaded models” to start from a clean cache.'
  );
}

/**
 * Whether this browser is Safari.
 *
 * Safari gets a single WASM thread for session creation (see `_createModel`):
 * `parakeet.js` already single-threads when `SharedArrayBuffer` is missing,
 * but an explicit `1` also covers Safari *with* it, where a thread pool buys
 * nothing for one utterance at a time and costs WASM memory per thread — on
 * the tab that already died from an allocation peak.
 */
export function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const vendor = (navigator as Navigator & { vendor?: string }).vendor ?? '';
  const ua = navigator.userAgent ?? '';
  return /apple/i.test(vendor) && !/chrome|chromium|crios|fxios|edg/i.test(ua);
}

/**
 * A deadline that fires only on genuine silence.
 *
 * `noteProgress()` restarts it, so a slow multi-gigabyte transfer — which
 * reports bytes — is never cut off; the point is that the alternative to this
 * is not "slower", it is *silent forever*: a read that never resolves and a
 * `fetch` that never settles both leave the preparation bar parked on the
 * last stage it reached, with nothing in the console.
 *
 * Raced against the real work with `Promise.race`, which keeps a handler on
 * every input, so losing the race cannot surface as an unhandled rejection.
 * `dispose()` (in a `finally`) clears the timer.
 */
export function startStallWatchdog(stallMs: number, describe: (ms: number) => string): {
  /** Resolves never; rejects with the stall error when the deadline expires. */
  stall: Promise<never>;
  /** Call for every observed sign of life. */
  noteProgress: () => void;
  /** Stop the timer. Always call this, including on the success path. */
  dispose: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let done = false;

  let rejectStall: (reason: Error) => void = () => {};
  const stall = new Promise<never>((_, reject) => {
    rejectStall = reject;
  });
  // The rejection is always consumed by the race; this only stops Node from
  // treating it as unhandled if the timer wins before the race is set up.
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

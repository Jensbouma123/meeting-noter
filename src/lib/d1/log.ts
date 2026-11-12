/**
 * `[D1]` diagnostics that reach the page console in every browser, once.
 *
 * Safari's Web Inspector lists a worker's console apart from the page's, so
 * logs written inside the D1 worker are easy to miss. Inside the worker a sink
 * forwards each line to the main thread (`log` protocol message), where the
 * client prints it. With a sink installed the worker does NOT print the line
 * itself: Chromium merges a worker's console into the page's, so printing in
 * both places showed every line twice.
 *
 * Levels: `d1Debug` is verbose tracing, shown only with `localStorage['asr-debug'] = '1'`
 * (the app's shared debug flag, read by the client on the page: a worker has no
 * `localStorage`); `d1Info` is the always-on summary; `d1Warn` is a warning.
 */

export type D1LogLevel = 'debug' | 'info' | 'warn';

type LogSink = (level: D1LogLevel, args: unknown[]) => void;

let sink: LogSink | null = null;

/** Route every log line to `next` instead of the worker's own console (the worker posts them to the page). */
export function setD1LogSink(next: LogSink | null): void {
  sink = next;
}

/** Make one log argument structured-cloneable so `postMessage` never throws on it. */
function cloneable(arg: unknown): unknown {
  if (arg === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof arg)) return arg;
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  try {
    return JSON.parse(JSON.stringify(arg));
  } catch {
    return String(arg);
  }
}

function emit(level: D1LogLevel, args: unknown[]): void {
  if (!sink) {
    // No sink: on the page (or in a test). Debug lines stay quiet unless asked for.
    if (level === 'debug') return;
    console[level === 'warn' ? 'warn' : 'info'](...args);
    return;
  }
  try {
    sink(level, args.map(cloneable));
  } catch {
    // Diagnostics must never break the worker.
  }
}

/** Verbose tracing; shown only with the `asr-debug` flag. Never throws. */
export function d1Debug(...args: unknown[]): void {
  emit('debug', args);
}

/** The always-on summary line (backend choice, one line per batch). Never throws. */
export function d1Info(...args: unknown[]): void {
  emit('info', args);
}

/** A warning (e.g. WebGPU unusable, falling back). Never throws. */
export function d1Warn(...args: unknown[]): void {
  emit('warn', args);
}

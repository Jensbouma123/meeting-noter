/**
 * `[D1]` diagnostics that reach the page console in every browser.
 *
 * Safari's Web Inspector lists a worker's console apart from the page's, so
 * logs written inside the D1 worker are easy to miss. Inside the worker a sink
 * forwards each line to the main thread (`log` protocol message), where the
 * client prints it with `console.info`.
 */

type LogSink = (args: unknown[]) => void;

let sink: LogSink | null = null;

/** Route every `d1Log` line to `next` as well (the worker posts them to the page). */
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

/** `console.info` plus the sink. Never throws. */
export function d1Log(...args: unknown[]): void {
  console.info(...args);
  if (!sink) return;
  try {
    sink(args.map(cloneable));
  } catch {
    // Diagnostics must never break the worker.
  }
}

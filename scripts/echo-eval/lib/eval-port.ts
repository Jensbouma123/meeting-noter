// A fixed port keeps one browser origin across runs, so the model cache (IndexedDB, Cache Storage) survives.
export const DEFAULT_EVAL_PORT = 3333;

export function evalPort(raw: string | undefined): number {
  if (raw === undefined || raw === '') return DEFAULT_EVAL_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`ECHO_EVAL_PORT must be an integer from 1 to 65535, got ${raw}`);
  }
  return port;
}

export const portBusyMessage = (port: number): string =>
  `port ${port} is busy; stop whatever listens there (an earlier eval's next dev?) or set ECHO_EVAL_PORT. ` +
  'A different port is a new browser origin, so the models download again.';

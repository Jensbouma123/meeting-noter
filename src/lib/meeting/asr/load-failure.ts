const MEMORY_FAILURE = /out of memory|allocation failed|memory access|WebAssembly\.Memory|Array buffer allocation/i;

export function describeLoadFailure(message: string): string {
  if (!MEMORY_FAILURE.test(message)) return `Could not start the model on this device: ${message}`;
  return (
    `This device ran out of memory while starting the speech model (${message}). ` +
    'Close other tabs and try again; if it keeps happening, the smaller CPU-only ' +
    'model in Settings › Speech model uses far less memory.'
  );
}

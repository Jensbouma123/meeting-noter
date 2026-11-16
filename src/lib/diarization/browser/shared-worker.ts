let sharedWorker: Worker | null = null;
let liveDiarizers = 0;

export function acquireWorker(): Worker {
  liveDiarizers += 1;
  if (!sharedWorker) {
    sharedWorker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  }
  return sharedWorker;
}

export function releaseWorker(worker: Worker): void {
  liveDiarizers -= 1;
  if (liveDiarizers > 0 || sharedWorker !== worker) return;
  worker.terminate();
  sharedWorker = null;
}

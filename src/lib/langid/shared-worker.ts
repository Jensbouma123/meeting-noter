let sharedWorker: Worker | null = null;
let liveDetectors = 0;

export function acquireWorker(): Worker {
  liveDetectors += 1;
  if (!sharedWorker) {
    sharedWorker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  }
  return sharedWorker;
}

export function releaseWorker(worker: Worker): void {
  liveDetectors -= 1;
  if (liveDetectors > 0 || sharedWorker !== worker) return;
  worker.terminate();
  sharedWorker = null;
}

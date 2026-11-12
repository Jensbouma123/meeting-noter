/**
 * Worker entry for D1: deliberately free of heavy static imports.
 *
 * `worker.ts` statically imports onnxruntime-web and transformers. In a module
 * worker a throw (or hang) while evaluating those imports happens before any of
 * its code runs, and Safari then shows nothing: no log, no error event. This
 * entry therefore posts `boot` first (proof the script loaded), queues messages
 * that arrive meanwhile, and loads the heavy module with a dynamic `import()`
 * whose failure is posted back as `fatal`.
 *
 * No `typeof window` guard around the body: Next/Turbopack fold it to a constant in
 * client bundles and dead-strip the whole entry (empty script, no boot, no error).
 * Only the worker constructor loads this file, so it needs no environment check.
 */

import type { D1WorkerInMessage, D1WorkerOutMessage } from './protocol';

const ctx = self as unknown as {
  postMessage(message: D1WorkerOutMessage): void;
  onmessage: ((ev: MessageEvent<D1WorkerInMessage>) => void) | null;
};

const queue: D1WorkerInMessage[] = [];
ctx.onmessage = (ev) => {
  queue.push(ev.data);
};
ctx.postMessage({ type: 'boot' });
import('./worker')
  .then(({ startD1Worker }) => {
    const handle = startD1Worker(ctx);
    ctx.onmessage = (ev) => {
      void handle(ev.data);
    };
    for (const msg of queue.splice(0)) void handle(msg);
  })
  .catch((err: unknown) => {
    const e = err instanceof Error ? err : new Error(String(err));
    ctx.postMessage({ type: 'fatal', message: `${e.name}: ${e.message}` });
  });

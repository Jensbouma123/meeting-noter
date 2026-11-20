import { loadSeparatorModel, runSeparator } from './model';
import type { LoadedSeparator } from './types/model';
import type { SeparatorRequest, SeparatorResponse } from './types/messages';

const ctx = self as unknown as {
  postMessage(message: SeparatorResponse, transfer: Transferable[]): void;
  onmessage: ((ev: MessageEvent<SeparatorRequest>) => void) | null;
};

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));
let chain: Promise<void> = Promise.resolve();

async function handle(msg: SeparatorRequest): Promise<void> {
  let model: LoadedSeparator;
  try {
    model = await loadSeparatorModel();
  } catch (err) {
    ctx.postMessage({ id: msg.id, backend: 'failed', error: messageOf(err) }, []);
    return;
  }
  if (msg.type === 'warm') {
    ctx.postMessage({ id: msg.id, backend: model.backend }, []);
    return;
  }
  if (!model.session) {
    ctx.postMessage({ id: msg.id, backend: model.backend, error: 'MossFormer2 needs WebGPU' }, []);
    return;
  }
  try {
    const tracks = await runSeparator(model.session, msg.pcm);
    ctx.postMessage({ id: msg.id, backend: model.backend, tracks }, [tracks[0].buffer, tracks[1].buffer]);
  } catch (err) {
    ctx.postMessage({ id: msg.id, backend: model.backend, error: messageOf(err) }, []);
  }
}

ctx.onmessage = (event) => {
  const msg = event.data;
  chain = chain.then(() => handle(msg));
};

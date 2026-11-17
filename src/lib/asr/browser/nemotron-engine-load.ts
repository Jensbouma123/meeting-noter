import { loadNemotronRecognizer } from './nemotron-loader';
import type { NemotronLoadDeps } from './nemotron-engine-load.types';

export async function loadNemotronEngineModel(deps: NemotronLoadDeps): Promise<void> {
  deps.setStatus('loading');
  try {
    await loadNemotronRecognizer(
      deps.config,
      deps.vocabulary,
      (fn) => deps.queue.run(fn),
      (progress) => deps.events.onLoadProgress?.(progress),
      deps.setRecognizer,
    );
    deps.setStatus('ready');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.setStatus('error');
    deps.events.onError(`Could not start the model on this device: ${message}`);
    throw err;
  }
}

import {
  configFromManifest,
  createBrowserASREngine,
  type AsrEngine,
  type AsrModelManifest,
} from '@/lib/asr/browser';
import { webgpuEncoderOf } from '@/lib/asr/browser/model-manifest-selection';
import { asrState } from './state';
import { buildEngineEvents } from './engine-events';
import { stepDownAfterWebgpuFailure } from './webgpu-fallback';

export async function createEngine(
  modelRepo: string | undefined,
  manifest: AsrModelManifest,
): Promise<AsrEngine | null> {
  const config = { ...configFromManifest(manifest), ...(modelRepo ? { modelRepo } : {}) };
  const engine = createBrowserASREngine(config, buildEngineEvents());

  try {
    await engine.ensureLoaded();
  } catch (err) {
    const failedEncoder = webgpuEncoderOf(manifest);
    if (failedEncoder === null) throw err;
    stepDownAfterWebgpuFailure(failedEncoder, err);
    return null;
  }

  asrState.engine = engine;
  return engine;
}

import type { LoadedState, ModelLoader, ModelLoaderConfig } from './types';

export function createModelLoader(config: ModelLoaderConfig): ModelLoader {
  const { modelId, device, dtype, onProgress, importTransformers } = config;
  let state: LoadedState | null = null;
  let disposed = false;

  async function load(needAudio: boolean): Promise<LoadedState> {
    if (disposed) throw new Error('EmbeddingGemma2: instance is disposed; create a new one');
    if (state && (state.hasAudio || !needAudio)) return state;

    const t = await importTransformers();
    let processor: LoadedState['processor'] | null = state?.processor ?? null;
    if (state) {
      await state.model.dispose();
      state = null;
    }

    const modelConfig = await t.AutoConfig.from_pretrained(modelId);
    const editable = modelConfig as unknown as { vision_config: unknown; audio_config: unknown };
    editable.vision_config = null;
    if (!needAudio) editable.audio_config = null;

    const model = await t.AutoModel.from_pretrained(modelId, {
      config: modelConfig,
      device,
      dtype,
      progress_callback: onProgress,
    } as Parameters<typeof t.AutoModel.from_pretrained>[1]);
    if (!processor) {
      processor = (await t.AutoProcessor.from_pretrained(modelId)) as unknown as LoadedState['processor'];
    }

    state = {
      model: model as unknown as LoadedState['model'],
      processor,
      hasAudio: needAudio,
    };
    return state;
  }

  async function release(): Promise<void> {
    disposed = true;
    if (state) {
      const old = state;
      state = null;
      await old.model.dispose();
    }
  }

  return { load, release };
}

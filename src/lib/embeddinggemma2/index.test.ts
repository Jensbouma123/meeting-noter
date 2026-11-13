import { describe, expect, it, vi } from 'vitest';
import { EG2_DIM, EG2_MAX_AUDIO_SECONDS } from './constants';
import { createEmbeddingGemma2 } from './index';

function fakeTransformers(
  outputFor: (rows: number) => { data: Float32Array; dim: number } = (rows) => {
    const data = new Float32Array(rows * EG2_DIM);
    for (let i = 0; i < rows; i++) data[i * EG2_DIM] = 3 + i;
    return { data, dim: EG2_DIM };
  },
) {
  const loads: Array<{ config: { vision_config: unknown; audio_config: unknown }; dtype: unknown }> = [];
  const disposed = vi.fn(async () => {});
  const processorCalls: unknown[][] = [];
  const processor = vi.fn(async (...args: unknown[]) => {
    processorCalls.push(args);
    const texts = Array.isArray(args[0]) ? args[0] : [];
    return { rows: texts.length || 1 };
  });
  const model = vi.fn(async (inputs: { rows: number }) => {
    const { data, dim } = outputFor(inputs.rows);
    return { sentence_embedding: { data, dims: [inputs.rows, dim] } };
  });
  const AutoModel = {
    from_pretrained: vi.fn(async (_id: string, opts: { config: (typeof loads)[number]['config']; dtype: unknown }) => {
      loads.push({ config: { ...opts.config }, dtype: opts.dtype });
      return Object.assign(model, { dispose: disposed });
    }),
  };
  const AutoConfig = {
    from_pretrained: vi.fn(async () => ({ vision_config: {}, audio_config: {} })),
  };
  const AutoProcessor = { from_pretrained: vi.fn(async () => processor) };
  const importTransformers = vi.fn(
    async () => ({ AutoModel, AutoConfig, AutoProcessor }) as unknown as typeof import('@huggingface/transformers'),
  );
  return { importTransformers, AutoModel, loads, disposed, processorCalls, model };
}

describe('createEmbeddingGemma2', () => {
  it('loads nothing at construction', () => {
    const fake = fakeTransformers();
    createEmbeddingGemma2({ device: 'cpu' }, { importTransformers: fake.importTransformers });
    expect(fake.importTransformers).not.toHaveBeenCalled();
    expect(fake.AutoModel.from_pretrained).not.toHaveBeenCalled();
  });

  it('text-only load drops vision and audio configs and returns unit 768-d rows', async () => {
    const fake = fakeTransformers();
    const eg2 = createEmbeddingGemma2({ device: 'cpu' }, { importTransformers: fake.importTransformers });
    const [a, b] = await eg2.embedText(['hello', 'world'], { prefix: 'task: search result | query: ' });

    expect(fake.loads).toHaveLength(1);
    expect(fake.loads[0].config.vision_config).toBeNull();
    expect(fake.loads[0].config.audio_config).toBeNull();
    expect(fake.loads[0].dtype).toEqual({ model: 'q4', audio_encoder: 'q4' });
    expect(fake.processorCalls[0][0]).toEqual([
      'task: search result | query: hello',
      'task: search result | query: world',
    ]);
    for (const v of [a, b]) {
      expect(v).toBeInstanceOf(Float32Array);
      expect(v.length).toBe(EG2_DIM);
      expect(Math.hypot(...v)).toBeCloseTo(1, 5);
    }
  });

  it('embedText([]) resolves without loading', async () => {
    const fake = fakeTransformers();
    const eg2 = createEmbeddingGemma2({ device: 'cpu' }, { importTransformers: fake.importTransformers });
    await expect(eg2.embedText([])).resolves.toEqual([]);
    expect(fake.AutoModel.from_pretrained).not.toHaveBeenCalled();
  });

  it('first audio call swaps the text-only model for one with the audio encoder, once', async () => {
    const fake = fakeTransformers();
    const eg2 = createEmbeddingGemma2({ device: 'cpu' }, { importTransformers: fake.importTransformers });
    await eg2.embedText(['x']);
    const v = await eg2.embedAudio(new Float32Array(16_000 * 10));
    await eg2.embedAudio(new Float32Array(16_000));

    expect(fake.loads).toHaveLength(2);
    expect(fake.disposed).toHaveBeenCalledTimes(1);
    expect(fake.loads[1].config.audio_config).not.toBeNull();
    expect(fake.loads[1].config.vision_config).toBeNull();
    expect(v.length).toBe(EG2_DIM);
    expect(Math.hypot(...v)).toBeCloseTo(1, 5);
  });

  it('rejects audio that is not Float32Array, empty, or over the 327 s limit without loading', async () => {
    const fake = fakeTransformers();
    const eg2 = createEmbeddingGemma2({ device: 'cpu' }, { importTransformers: fake.importTransformers });
    await expect(eg2.embedAudio([] as unknown as Float32Array)).rejects.toThrow(TypeError);
    await expect(eg2.embedAudio(new Float32Array(0))).rejects.toThrow(RangeError);
    await expect(eg2.embedAudio(new Float32Array(16_000 * (EG2_MAX_AUDIO_SECONDS + 1)))).rejects.toThrow(RangeError);
    expect(fake.importTransformers).not.toHaveBeenCalled();
  });

  it('rejects output with the wrong dimension', async () => {
    const fake = fakeTransformers(() => ({ data: new Float32Array(512), dim: 512 }));
    const eg2 = createEmbeddingGemma2({ device: 'cpu' }, { importTransformers: fake.importTransformers });
    await expect(eg2.embedText(['x'])).rejects.toThrow(/expected \[1, 768\] output/);
  });

  it('dispose frees the model and makes later calls fail', async () => {
    const fake = fakeTransformers();
    const eg2 = createEmbeddingGemma2({ device: 'cpu' }, { importTransformers: fake.importTransformers });
    await eg2.embedText(['x']);
    await eg2.dispose();
    expect(fake.disposed).toHaveBeenCalledTimes(1);
    await expect(eg2.embedText(['y'])).rejects.toThrow(/disposed/);
  });
});

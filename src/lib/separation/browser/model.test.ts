import { beforeEach, describe, expect, it, vi } from 'vitest';

const download = vi.fn<(...args: unknown[]) => Promise<string>>(async () => 'blob:sep-model');
const createSession = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  session: { tag: 'gpu' },
  backend: 'webgpu',
}));

vi.mock('@/lib/asr/browser/resumable-download', () => ({ downloadHfFileResumable: download }));
vi.mock('@/lib/diarization/browser/downloader', () => ({
  modelSource: (url: string) => url,
  revokeModelUrls: () => {},
}));
vi.mock('@/lib/diarization/browser/onnx-session', () => ({ Tensor: class {}, createSession }));

describe('loadSeparatorModel', () => {
  beforeEach(() => {
    vi.resetModules();
    download.mockClear();
    createSession.mockClear();
  });

  it('loads the Einsum-free WebGPU rewrite from its override URL, not the published HF file', async () => {
    const { loadSeparatorModel } = await import('./model');

    const loaded = await loadSeparatorModel();

    expect(download).toHaveBeenCalledTimes(1);
    const [repo, filename, , options] = download.mock.calls[0];
    expect(repo).toBe('iazShadow/mossformer2-ss-16k-onnx');
    expect(filename).toBe('mossformer2_ss_16k.webgpu.onnx');
    expect(options).toEqual({ urlOverride: '/models/mossformer2-ss-16k/mossformer2_ss_16k.webgpu.onnx' });
    expect(createSession).toHaveBeenCalledWith('blob:sep-model');
    expect(loaded).toEqual({ session: { tag: 'gpu' }, backend: 'webgpu' });
  });

  it('takes the model URL from NEXT_PUBLIC_MOSSFORMER2_URL when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOSSFORMER2_URL', 'https://models.example/sep.onnx');
    try {
      const { loadSeparatorModel } = await import('./model');
      await loadSeparatorModel();
      expect(download.mock.calls[0][3]).toEqual({ urlOverride: 'https://models.example/sep.onnx' });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

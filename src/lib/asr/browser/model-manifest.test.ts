import { describe, expect, it } from 'vitest';
import { NEMOTRON_ASR_WEBGPU } from './model-manifest-nemotron';
import { PARAKEET_TDT_V3_WEBGPU, PARAKEET_TDT_V3_WEBGPU_FP16, PARAKEET_TDT_V3_WASM } from './model-manifest-parakeet';
import { WEBGPU_ENCODER_FALLBACKS, asrManifestFallbackOrder, manifestForBackend, nextWebgpuEncoder, webgpuEncoderOf, webgpuManifestForEncoder } from './model-manifest-selection';
import type { AsrModelManifest } from './types/model-manifest';
describe.each([
  ['webgpu', PARAKEET_TDT_V3_WEBGPU],
  ['wasm', PARAKEET_TDT_V3_WASM],
  ['nemotron', NEMOTRON_ASR_WEBGPU],
] satisfies Array<[string, AsrModelManifest]>)('%s manifest matches the real Hugging Face repo', (_label, manifest) => {
  it('lists only files that exist in the repo tree (or in fileUrlOverrides)', async () => {
    const [org, name] = manifest.modelRepo.split('/');
    const url = `https://huggingface.co/api/models/${encodeURIComponent(org)}/${encodeURIComponent(name)}/tree/main?recursive=1`;
    const res = await fetch(url);
    expect(res.ok, `HF tree API returned ${res.status} for ${manifest.modelRepo}`).toBe(true);

    const payload = (await res.json()) as Array<{ type?: string; path?: string }>;
    const repoFiles = new Set(
      payload.filter((n) => n.type === 'file' && typeof n.path === 'string').map((n) => n.path as string),
    );

    for (const file of manifest.files) {
      if (manifest.fileUrlOverrides?.[file] !== undefined) {
        continue;
      }
      expect(
        repoFiles.has(file),
        `manifest expects "${file}" but ${manifest.modelRepo} does not have it — ` +
          `this is the exact shape of bug that shipped a repo pointing at a missing encoder file`,
      ).toBe(true);
    }
  });

  it('resolves every listed file to a live download (no 404s)', async () => {
    const files = manifest.files.filter((file) => manifest.fileUrlOverrides?.[file] === undefined);
    const results = await Promise.all(
      files.map(async (file) => {
        const encodedFile = file.split('/').map(encodeURIComponent).join('/');
        const url = `https://huggingface.co/${manifest.modelRepo}/resolve/main/${encodedFile}`;
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        return { file, url, res };
      }),
    );
    for (const { file, url, res } of results) {
      expect(res.ok, `expected 200 for "${file}" at ${url}, got ${res.status}`).toBe(true);
    }
  }, 30_000);

  it('declares an override URL for every file the repo does not ship', async () => {
    const [org, name] = manifest.modelRepo.split('/');
    const url = `https://huggingface.co/api/models/${encodeURIComponent(org)}/${encodeURIComponent(name)}/tree/main?recursive=1`;
    const res = await fetch(url);
    expect(res.ok).toBe(true);
    const payload = (await res.json()) as Array<{ type?: string; path?: string }>;
    const repoFiles = new Set(
      payload.filter((n) => n.type === 'file' && typeof n.path === 'string').map((n) => n.path as string),
    );
    for (const file of manifest.files) {
      if (!repoFiles.has(file)) {
        expect(
          manifest.fileUrlOverrides?.[file],
          `"${file}" is not in ${manifest.modelRepo} and has no fileUrlOverrides entry — the download would 404`,
        ).toBeTruthy();
      }
    }
    for (const file of Object.keys(manifest.fileUrlOverrides ?? {})) {
      expect(manifest.files, `override for "${file}" but the manifest does not list it`).toContain(file);
    }
  });

  it('does not list the fp32 encoder’s external data blob for the WASM variant', () => {
    if (manifest.asrBackend === 'wasm') {
      expect(manifest.files.some((f) => f.endsWith('.data'))).toBe(false);
    }
  });
});

describe('backend/quant contract', () => {
  it('defaults WebGPU to the q4f16 encoder — fastest and most accurate in §3', () => {
    expect(PARAKEET_TDT_V3_WEBGPU.asrBackend).toBe('webgpu');
    expect(PARAKEET_TDT_V3_WEBGPU.encoderQuant).toBe('q4f16');
    expect(PARAKEET_TDT_V3_WEBGPU.variant).toBe('webgpu-q4f16');
    expect(PARAKEET_TDT_V3_WEBGPU.files).toContain('encoder-model.q4f16.onnx');
    expect(PARAKEET_TDT_V3_WEBGPU.files.some((f) => f.endsWith('.data'))).toBe(false);
    expect(PARAKEET_TDT_V3_WEBGPU.fileUrlOverrides?.['encoder-model.q4f16.onnx']).toBeTruthy();
    expect(PARAKEET_TDT_V3_WEBGPU.fallbackSizeBytes).toBe(534_052_753);
  });

  it('keeps fp16 as the WebGPU fallback rung, not as the default', () => {
    expect(PARAKEET_TDT_V3_WEBGPU_FP16.asrBackend).toBe('webgpu');
    expect(PARAKEET_TDT_V3_WEBGPU_FP16.encoderQuant).toBe('fp16');
    expect(PARAKEET_TDT_V3_WEBGPU_FP16.variant).toBe('webgpu-fp16');
    expect(PARAKEET_TDT_V3_WEBGPU_FP16.files).toContain('encoder-model.fp16.onnx');
    expect(PARAKEET_TDT_V3_WEBGPU_FP16.fallbackSizeBytes).toBe(1_257_541_902);
    expect(PARAKEET_TDT_V3_WEBGPU_FP16.files).not.toEqual(PARAKEET_TDT_V3_WEBGPU.files);
  });

  it('keeps the WASM variant a single-file int8 encoder Safari can hold', () => {
    expect(PARAKEET_TDT_V3_WASM.asrBackend).toBe('wasm');
    expect(PARAKEET_TDT_V3_WASM.backend).toBe('wasm');
    expect(PARAKEET_TDT_V3_WASM.encoderQuant).toBe('int8');
    expect(PARAKEET_TDT_V3_WASM.variant).toBe('wasm-int8');
    expect(PARAKEET_TDT_V3_WASM.files).toContain('encoder-model.int8.onnx');
    expect(PARAKEET_TDT_V3_WASM.files.some((f) => f.endsWith('.data'))).toBe(false);
    expect(PARAKEET_TDT_V3_WASM.fallbackSizeBytes).toBeLessThan(1_000_000_000);
  });

  it('resolves each backend to its own variant', () => {
    expect(manifestForBackend('webgpu')).toBe(PARAKEET_TDT_V3_WEBGPU);
    expect(manifestForBackend('wasm')).toBe(PARAKEET_TDT_V3_WASM);
  });
});

describe('the WebGPU fallback order', () => {
  it('is q4f16, then fp16, then the CPU model', () => {
    expect(asrManifestFallbackOrder().map((m) => m.variant)).toEqual([
      'webgpu-q4f16',
      'webgpu-fp16',
      'wasm-int8',
    ]);
    expect(WEBGPU_ENCODER_FALLBACKS).toEqual(['q4f16', 'fp16']);
  });

  it('names the next rung, and reports the end of the chain honestly', () => {
    expect(nextWebgpuEncoder('q4f16')).toBe('fp16');
    expect(nextWebgpuEncoder('fp16')).toBeNull();
    expect(webgpuManifestForEncoder('q4f16')).toBe(PARAKEET_TDT_V3_WEBGPU);
    expect(webgpuManifestForEncoder('fp16')).toBe(PARAKEET_TDT_V3_WEBGPU_FP16);
  });

  it('identifies which rung a manifest is, and refuses to read one off WASM', () => {
    expect(webgpuEncoderOf(PARAKEET_TDT_V3_WEBGPU)).toBe('q4f16');
    expect(webgpuEncoderOf(PARAKEET_TDT_V3_WEBGPU_FP16)).toBe('fp16');
    expect(webgpuEncoderOf(PARAKEET_TDT_V3_WASM)).toBeNull();
  });
});

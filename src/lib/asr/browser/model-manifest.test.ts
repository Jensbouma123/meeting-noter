import { describe, expect, it, vi } from 'vitest';
import {
  NEMOTRON_ASR_WEBGPU,
  PARAKEET_TDT_V3_WEBGPU,
  PARAKEET_TDT_V3_WEBGPU_FP16,
  PARAKEET_TDT_V3_WASM,
  WEBGPU_ENCODER_FALLBACKS,
  asrManifestFallbackOrder,
  manifestForBackend,
  nextWebgpuEncoder,
  probeModelSize,
  webgpuEncoderOf,
  webgpuManifestForEncoder,
  type AsrModelManifest,
} from './model-manifest';

/**
 * Guards against exactly the bug this manifest's own top comment documents:
 * the registry pointed at a repo that didn't actually ship the file the
 * manifest listed, and nothing caught it until a user hit a 404 mid-download.
 * These hit the real Hugging Face API — no local fixture to drift from the
 * repo it's supposed to describe.
 *
 * Runs for both backend variants. Files with a `fileUrlOverrides` entry
 * (the self-built fp16 encoder) are checked differently: the HF tree cannot
 * know about them, so the test asserts they are *declared* as overrides
 * instead of asserting they exist upstream.
 */
describe.each([
  ['webgpu', PARAKEET_TDT_V3_WEBGPU],
  ['wasm', PARAKEET_TDT_V3_WASM],
  // Its WASM variant lists the very same files.
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
        // Self-hosted: the tree cannot know about it. The declaration
        // itself is the contract (see the override test below).
        continue;
      }
      expect(
        repoFiles.has(file),
        `manifest expects "${file}" but ${manifest.modelRepo} does not have it — ` +
          `this is the exact shape of bug that shipped a repo pointing at a missing encoder file`,
      ).toBe(true);
    }
  });

  // One HEAD per file, each a redirect to the CDN: in parallel, and with
  // room for a slow network, or the default 5 s times out before a 404 can.
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
    // The fp16 encoder is self-built (scripts/convert-parakeet-v3.py), not
    // upstream — without an override the downloader would 404 on it. Every
    // manifest file missing from the tree must have one, and every override
    // must point at a file the manifest actually lists.
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
    // The whole point of the WASM manifest: it must never pull in the 2.4 GB
    // `.data` blob that only the fp32 (WebGPU) encoder needs.
    if (manifest.asrBackend === 'wasm') {
      expect(manifest.files.some((f) => f.endsWith('.data'))).toBe(false);
    }
  });
});

/**
 * The backend/quant contract — pure, no network. WebGPU runs the self-built
 * q4f16 encoder (bench §3: RTF 0.069, WER 0.478, 516 MB) and falls back to the
 * fp16 one; WASM runs the upstream int8 encoder, at RTF 1.41, which is why it
 * is only ever used on a finished recording. If either side drifts, the
 * backend routing in `backend-detect.ts` silently stops meaning what it says.
 */
describe('backend/quant contract', () => {
  it('defaults WebGPU to the q4f16 encoder — fastest and most accurate in §3', () => {
    expect(PARAKEET_TDT_V3_WEBGPU.asrBackend).toBe('webgpu');
    expect(PARAKEET_TDT_V3_WEBGPU.encoderQuant).toBe('q4f16');
    expect(PARAKEET_TDT_V3_WEBGPU.variant).toBe('webgpu-q4f16');
    expect(PARAKEET_TDT_V3_WEBGPU.files).toContain('encoder-model.q4f16.onnx');
    expect(PARAKEET_TDT_V3_WEBGPU.files.some((f) => f.endsWith('.data'))).toBe(false);
    expect(PARAKEET_TDT_V3_WEBGPU.fileUrlOverrides?.['encoder-model.q4f16.onnx']).toBeTruthy();
    // 516 MB, so the WebGPU download is smaller than the CPU one (670 MB).
    expect(PARAKEET_TDT_V3_WEBGPU.fallbackSizeBytes).toBe(534_052_753);
  });

  it('keeps fp16 as the WebGPU fallback rung, not as the default', () => {
    expect(PARAKEET_TDT_V3_WEBGPU_FP16.asrBackend).toBe('webgpu');
    expect(PARAKEET_TDT_V3_WEBGPU_FP16.encoderQuant).toBe('fp16');
    expect(PARAKEET_TDT_V3_WEBGPU_FP16.variant).toBe('webgpu-fp16');
    expect(PARAKEET_TDT_V3_WEBGPU_FP16.files).toContain('encoder-model.fp16.onnx');
    expect(PARAKEET_TDT_V3_WEBGPU_FP16.fallbackSizeBytes).toBe(1_257_541_902);
    // The two WebGPU variants differ in file, size and identity — the registry
    // keys its "is this the entry I already have?" check on that difference.
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

/**
 * The fallback order itself. It is the whole runtime recovery policy — a chain
 * that quietly skipped fp16 would look perfect on the machine it was written on
 * (where q4f16 loads) and fail on the only device that needed the rung.
 */
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
    // The CPU manifest failing is a real error, not a reason to try a smaller
    // encoder — there is nothing below it.
    expect(webgpuEncoderOf(PARAKEET_TDT_V3_WASM)).toBeNull();
  });
});

/**
 * The size the user is shown before they consent, and the size their progress
 * bar is measured against. `fallbackSizeBytes` and `fileSizes` are the same
 * fact written twice, so a test that they agree is the only thing standing
 * between a manifest edit and "Download 1.17 GiB" for a 534 MB download.
 */
describe('declared file sizes', () => {
  it.each([
    ['webgpu-q4f16', PARAKEET_TDT_V3_WEBGPU],
    ['webgpu-fp16', PARAKEET_TDT_V3_WEBGPU_FP16],
    ['wasm-int8', PARAKEET_TDT_V3_WASM],
  ])('%s sums its own file sizes', (_label, manifest) => {
    const total = manifest.files.reduce((sum, file) => sum + (manifest.fileSizes[file] ?? 0), 0);
    expect(total).toBe(manifest.fallbackSizeBytes);
    // Every file the manifest fetches has a size, and nothing else does.
    expect(Object.keys(manifest.fileSizes).sort()).toEqual([...manifest.files].sort());
  });

  it('quotes the q4f16 encoder at the size the file on disk actually has', async () => {
    // `public/models/…/encoder-model.q4f16.onnx` is 515,756,810 bytes as built
    // by scripts/convert-parakeet-v3.py, and that is the number the consent
    // dialog quotes before the live probe corrects it.
    expect(PARAKEET_TDT_V3_WEBGPU.fileSizes['encoder-model.q4f16.onnx']).toBe(515_756_810);
  });

  it('probes the q4f16 override, so the measured total is the q4f16 one', async () => {
    // The live measurement is what the download/progress/delete surfaces show
    // once it lands. It has to measure the file that is actually fetched: the
    // HF tree knows nothing about either self-built encoder, so the override
    // URL is the only source for the encoder's size.
    const heads: string[] = [];
    const tree: Record<string, number> = {
      'decoder_joint-model.int8.onnx': 18_202_004,
      'vocab.txt': 93_939,
    };
    const stub = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/models/')) {
        return new Response(
          JSON.stringify(
            Object.entries(tree).map(([path, size]) => ({ type: 'file', path, size })),
          ),
          { status: 200 },
        );
      }
      if (init?.method === 'HEAD') {
        heads.push(url);
        return new Response(null, {
          status: 200,
          headers: { 'content-length': String(515_756_810) },
        });
      }
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', stub);
    try {
      const total = await probeModelSize(PARAKEET_TDT_V3_WEBGPU);
      expect(total).toBe(534_052_753);
      // The q4f16 override URL, not the fp16 one and not a HF file.
      expect(heads).toEqual([PARAKEET_TDT_V3_WEBGPU.fileUrlOverrides?.['encoder-model.q4f16.onnx']]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

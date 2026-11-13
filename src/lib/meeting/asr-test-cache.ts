import { vi } from 'vitest';
import type { ManifestFiles } from './types/asr-test';

export const WASM_MANIFEST: ManifestFiles = {
  modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
  files: ['encoder-model.int8.onnx', 'decoder_joint-model.int8.onnx', 'vocab.txt'],
};

export async function seedManifestCache(manifest: ManifestFiles): Promise<void> {
  const { ensureHfFileCached } = await import('@/lib/asr/browser/resumable-download');
  const content = new Uint8Array(64).map((_, i) => i % 251);
  const hosted = manifest.files.filter((f) => manifest.fileUrlOverrides?.[f] === undefined);

  const stubFetch = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const file =
      decodeURIComponent(url.split('/resolve/main/')[1] ?? '') || (url.split('/').pop() ?? '');

    if (url.includes('/api/models/')) {
      return new Response(
        JSON.stringify(hosted.map((name) => ({ type: 'file', path: name, size: content.length }))),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (init?.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: { 'content-length': String(content.length), etag: `"${file}"` },
      });
    }
    return new Response(content, { status: 200 });
  });
  const realFetch = globalThis.fetch;
  globalThis.fetch = stubFetch as unknown as typeof fetch;
  try {
    for (const file of manifest.files) {
      await ensureHfFileCached(manifest.modelRepo, file, 'main', {
        ...(manifest.fileUrlOverrides?.[file] ? { urlOverride: manifest.fileUrlOverrides[file] } : {}),
      });
    }
  } finally {
    globalThis.fetch = realFetch;
  }
}

export async function consentAndCache(manifest: ManifestFiles = WASM_MANIFEST): Promise<void> {
  await seedManifestCache(manifest);
  const registry = { ...(await import('@/lib/asr/browser/model-registry-status')), ...(await import('@/lib/asr/browser/model-registry-consent')) };
  registry.markCached('parakeet-ttd');
  registry.recordConsent('accepted', ['parakeet-ttd']);
}

export function stubWebgpuAdapter(): void {
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('navigator', {
    ...(globalThis.navigator as unknown as Record<string, unknown>),
    gpu: { requestAdapter: async () => ({ isFallbackAdapter: false }) },
  });
}

export async function clearModelCache(): Promise<void> {
  const { deleteModelCache } = await import('@/lib/asr/browser/resumable-download');
  await deleteModelCache();
}

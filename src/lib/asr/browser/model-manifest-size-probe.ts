import type { AsrModelManifest } from './types/model-manifest';

function treeUrl(modelRepo: string, revision = 'main'): string {
  const encoded = modelRepo.split('/').map(encodeURIComponent).join('/');
  return `https://huggingface.co/api/models/${encoded}/tree/${encodeURIComponent(revision)}?recursive=1`;
}

async function treeSizesFor(modelRepo: string, signal?: AbortSignal): Promise<Map<string, number> | null> {
  const res = await fetch(treeUrl(modelRepo), { signal });
  if (!res.ok) return null;
  const payload: unknown = await res.json();
  if (!Array.isArray(payload)) return null;

  const sizes = new Map<string, number>();
  for (const node of payload) {
    if (node && typeof node === 'object') {
      const { path, size } = node as { path?: unknown; size?: unknown };
      if (typeof path === 'string' && typeof size === 'number') {
        sizes.set(path, size);
      }
    }
  }
  return sizes;
}

async function headContentLength(url: string, signal?: AbortSignal): Promise<number | null> {
  const res = await fetch(url, { method: 'HEAD', signal });
  if (!res.ok) return null;
  const length = Number(res.headers.get('content-length') ?? NaN);
  return Number.isFinite(length) && length > 0 ? length : null;
}

export async function probeModelSize(
  manifest: AsrModelManifest,
  signal?: AbortSignal,
): Promise<number | null> {
  try {
    const treeSizes = await treeSizesFor(manifest.modelRepo, signal);
    let total = 0;
    for (const file of manifest.files) {
      const override = manifest.fileUrlOverrides?.[file];
      if (override !== undefined) {
        const size = await headContentLength(override, signal);
        if (size === null) return null;
        total += size;
        continue;
      }
      if (treeSizes === null) return null;
      if (!treeSizes.has(file)) return null;
      total += treeSizes.get(file) as number;
    }
    return total;
  } catch {
    return null;
  }
}

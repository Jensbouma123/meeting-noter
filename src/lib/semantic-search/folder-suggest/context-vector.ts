import type { FolderRow } from '@/lib/meeting-db/types';
import { withEmbedder } from '../service';
import { normalizedCopy } from '../vector-math';
import type { ContextVectorDeps } from './types/context-vector-deps';

const cache = new Map<string, { text: string; vector: Float32Array }>();

export function clearContextVectorCache(): void {
  cache.clear();
}

export function contextText(folder: Pick<FolderRow, 'name' | 'context'>): string | null {
  const context = folder.context.trim();
  return context ? `${folder.name.trim()}\n${context}` : null;
}

/** Embeds name + context of folders that have a context. Silently skips when the search model is not loaded. */
export async function loadFolderContextVectors(
  folders: readonly FolderRow[],
  deps: ContextVectorDeps = { run: withEmbedder },
): Promise<Record<string, Float32Array>> {
  const out: Record<string, Float32Array> = {};
  const stale: Array<{ id: string; text: string }> = [];
  for (const folder of folders) {
    const text = contextText(folder);
    if (!text) {
      cache.delete(folder.id);
      continue;
    }
    const hit = cache.get(folder.id);
    if (hit?.text === text) out[folder.id] = hit.vector;
    else stale.push({ id: folder.id, text });
  }
  if (stale.length === 0) return out;
  try {
    const vectors = await deps.run((embedder) => embedder.embed(stale.map((s) => s.text), 'document'));
    stale.forEach(({ id, text }, i) => {
      if (!vectors[i]) return;
      const vector = normalizedCopy(vectors[i]);
      cache.set(id, { text, vector });
      out[id] = vector;
    });
  } catch {
    // model missing or embedding failed: suggest from meetings only
  }
  return out;
}

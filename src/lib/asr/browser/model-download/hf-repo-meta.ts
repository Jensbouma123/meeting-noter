import type { HfTreeEntry, RepoFileMeta } from '../types/download-cache-state';
import { REPO_TREE_TIMEOUT_MS } from './constants';

const treeCache = new Map<string, Promise<HfTreeEntry[] | null>>();

function fetchRepoTree(repoId: string, revision: string): Promise<HfTreeEntry[] | null> {
  const cacheKey = `${repoId}@${revision}`;
  const cached = treeCache.get(cacheKey);
  if (cached) return cached;

  const encoded = repoId.split('/').map(encodeURIComponent).join('/');
  const url = `https://huggingface.co/api/models/${encoded}/tree/${encodeURIComponent(revision)}?recursive=1`;
  const promise = (async (): Promise<HfTreeEntry[] | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REPO_TREE_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      return res.ok ? ((await res.json()) as HfTreeEntry[]) : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })().then((tree) => {
    if (tree === null) treeCache.delete(cacheKey);
    return tree;
  });
  treeCache.set(cacheKey, promise);
  return promise;
}

export async function getRepoFileMeta(
  repoId: string,
  revision: string,
  filename: string,
): Promise<RepoFileMeta | null> {
  const tree = await fetchRepoTree(repoId, revision);
  if (!tree) return null;

  const entry = tree.find((n) => n.path === filename);
  if (!entry || typeof entry.size !== 'number') return null;

  const sha256 = typeof entry.lfs?.oid === 'string' ? entry.lfs.oid : null;
  return { size: entry.size, sha256 };
}

export async function headFileMeta(url: string): Promise<{ size: number; sha256: null }> {
  const head = await fetch(url, { method: 'HEAD' });
  if (!head.ok) {
    throw new Error(`HEAD ${head.status} ${head.statusText} (${url})`);
  }
  const size = Number(head.headers.get('content-length') ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`no usable content-length (${url})`);
  }
  return { size, sha256: null };
}

export function resolveFileUrl(repoId: string, filename: string, revision: string): string {
  const encodedRepo = repoId.split('/').map(encodeURIComponent).join('/');
  const encodedFile = filename.split('/').map(encodeURIComponent).join('/');
  return `https://huggingface.co/${encodedRepo}/resolve/${encodeURIComponent(revision)}/${encodedFile}`;
}

import type { OpfsDirectoryLike, SpillBackend, SpillEnvironment } from '../types/rescore';
import { IdbSpillBackend } from './idb-spill-backend';
import { OpfsSpillBackend } from './opfs-spill-backend';

function defaultEnvironment(): SpillEnvironment {
  const storage = globalThis.navigator?.storage;
  return {
    getDirectory: storage?.getDirectory
      ? () => storage.getDirectory() as unknown as Promise<OpfsDirectoryLike>
      : undefined,
    indexedDB: globalThis.indexedDB,
  };
}

async function openOpfs(name: string, env: SpillEnvironment): Promise<SpillBackend | null> {
  if (!env.getDirectory) return null;
  try {
    const dir = await env.getDirectory();
    const file = await dir.getFileHandle(name, { create: true });
    if (!file.createSyncAccessHandle) {
      await dir.removeEntry(name).catch(() => undefined);
      return null;
    }
    const handle = await file.createSyncAccessHandle();
    handle.truncate(0);
    return new OpfsSpillBackend(dir, name, handle);
  } catch {
    return null;
  }
}

export async function openSpillBackend(
  name: string,
  env: SpillEnvironment = defaultEnvironment(),
): Promise<SpillBackend> {
  const opfs = await openOpfs(name, env);
  if (opfs) return opfs;
  if (!env.indexedDB) throw new Error('No spill storage available');
  return IdbSpillBackend.open(name, env.indexedDB);
}

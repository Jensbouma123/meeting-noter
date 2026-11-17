import { useEffect, useState } from 'react';
import type { FolderRow } from '@/lib/meeting-db/types';
import { contextText, loadFolderContextVectors } from '@/lib/semantic-search/folder-suggest/context-vector';
import { onSearchModelReady } from '@/lib/semantic-search/model-gate';

export function useFolderContextVectors(folders: readonly FolderRow[]): Record<string, Float32Array> {
  const [vectors, setVectors] = useState<Record<string, Float32Array>>({});
  const key = JSON.stringify(folders.map((f) => [f.id, contextText(f)]).filter(([, text]) => text));
  useEffect(() => {
    let live = true;
    const load = () => {
      void loadFolderContextVectors(folders).then((next) => {
        if (live) setVectors(next);
      });
    };
    load();
    const off = onSearchModelReady(load);
    return () => {
      live = false;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures name/context changes
  }, [key]);
  return vectors;
}

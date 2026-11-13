import { useCallback } from 'react';
import { searchLibrary } from '@/lib/semantic-search/library-search';
import type { Hit } from '@/lib/semantic-search/types';

export function useSemanticLibrarySearch(): (query: string, k: number) => Promise<Hit[]> {
  return useCallback((query: string, k: number) => searchLibrary(query, k), []);
}

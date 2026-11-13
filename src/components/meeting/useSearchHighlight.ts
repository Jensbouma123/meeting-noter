import { useEffect } from 'react';
import { buildHighlightRanges } from './buildHighlightRanges';
import { clearSearchHighlights, getHighlightApi } from './highlightApi';
import type { UseSearchHighlightArgs } from './useSearchHighlight.types';

export function useSearchHighlight({
  segments,
  query,
  matches,
  activeMatch,
  clampedActive,
  getScrollElement,
}: UseSearchHighlightArgs) {
  useEffect(() => {
    const api = getHighlightApi();
    clearSearchHighlights(api);
    const container = getScrollElement();
    if (!container || !api || query.length === 0 || !activeMatch) return;

    const { baseRanges, activeRanges } = buildHighlightRanges(container, matches, clampedActive);

    if (baseRanges.length > 0) {
      api.registry.set('mn-search', new api.Highlight(...baseRanges));
    }
    if (activeRanges.length > 0) {
      api.registry.set('mn-search-active', new api.Highlight(...activeRanges));
    }
    return () => clearSearchHighlights(api);
  }, [segments, query, matches, activeMatch, clampedActive, getScrollElement]);
}

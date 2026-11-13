import type {
  HighlightApi,
  HighlightConstructor,
  HighlightRegistryLike,
} from './highlightApi.types';

export function getHighlightApi(): HighlightApi | null {
  try {
    const css = CSS as unknown as { highlights?: HighlightRegistryLike };
    const w = window as unknown as { Highlight?: HighlightConstructor };
    if (!css.highlights || !w.Highlight) return null;
    return { registry: css.highlights, Highlight: w.Highlight };
  } catch {
    return null;
  }
}

export function clearSearchHighlights(api: HighlightApi | null) {
  api?.registry.delete('mn-search');
  api?.registry.delete('mn-search-active');
}

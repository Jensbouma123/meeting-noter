import { SEG_SELECTOR, cssEscape, itemSegments } from './transcriptItems';
import type { SearchRootOptions } from './buildSearchRoot.types';

export function buildSearchRoot({ el, lines, onJump }: SearchRootOptions): HTMLElement {
  const root = {
    querySelector: (selector: string): Element | null => {
      const found = el.querySelector(selector);
      if (found) return found;
      const wanted = SEG_SELECTOR.exec(selector)?.[1];
      if (wanted === undefined) return null;
      let segId: string | undefined;
      const index = lines.findIndex((item) => {
        segId = itemSegments(item).find((seg) => cssEscape(seg.id) === wanted)?.id;
        return segId !== undefined;
      });
      if (index === -1 || segId === undefined) return null;
      onJump(segId, index);
      return null;
    },
    querySelectorAll: (selector: string) => el.querySelectorAll(selector),
  };
  return root as unknown as HTMLElement;
}

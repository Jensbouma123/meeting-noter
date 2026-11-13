import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VirtualListRange } from '@jensbouma123/acciva-ui';
import { ACTIVE_TURN_CLASS, SEG_SELECTOR, cssEscape, itemSegments } from './transcriptItems';
import type { UseTranscriptSearchJumpOptions } from './LiveTranscript.types';

export function useTranscriptSearchJump({ listRef, getScrollElement, lines, segments }: UseTranscriptSearchJumpOptions) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [windowVersion, setWindowVersion] = useState(0);
  const pendingSegRef = useRef<string | null>(null);
  const ringRef = useRef<Element | null>(null);
  const lastRangeRef = useRef<VirtualListRange>({ start: -1, end: -1 });

  useEffect(() => {
    const open = () => setSearchOpen(true);
    window.addEventListener('mn:search', open);
    return () => window.removeEventListener('mn:search', open);
  }, []);

  const clearRing = useCallback(() => {
    ringRef.current?.classList.remove(ACTIVE_TURN_CLASS);
    ringRef.current = null;
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    clearRing();
    pendingSegRef.current = null;
  }, [clearRing]);

  const getSearchRoot = useCallback((): HTMLElement | null => {
    const el = getScrollElement();
    if (!el) return null;
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
        clearRing();
        pendingSegRef.current = segId;
        listRef.current?.scrollToIndex(index, 'center');
        return null;
      },
      querySelectorAll: (selector: string) => el.querySelectorAll(selector),
    };
    return root as unknown as HTMLElement;
  }, [getScrollElement, clearRing, lines, listRef]);

  const onVisibleRangeChange = useCallback((range: VirtualListRange) => {
    const last = lastRangeRef.current;
    if (last.start === range.start && last.end === range.end) return;
    lastRangeRef.current = range;
    if (searchOpen) setWindowVersion((v) => v + 1);
  }, [searchOpen]);

  useEffect(() => {
    const pending = pendingSegRef.current;
    const el = getScrollElement();
    if (pending === null || !el) return;
    const node = el.querySelector(`[data-seg-id="${cssEscape(pending)}"]`);
    if (!node) return;
    pendingSegRef.current = null;
    node.classList.add(ACTIVE_TURN_CLASS);
    ringRef.current = node;
    node.scrollIntoView({ block: 'center' });
  }, [windowVersion, getScrollElement]);

  const searchSegments = useMemo(
    () => (windowVersion >= 0 ? [...segments] : segments),
    [segments, windowVersion],
  );

  return { searchOpen, closeSearch, getSearchRoot, onVisibleRangeChange, searchSegments };
}

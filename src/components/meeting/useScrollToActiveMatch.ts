import { useEffect, useEffectEvent, useRef } from 'react';
import { clearSearchHighlights, getHighlightApi } from './highlightApi';
import { ACTIVE_TURN_CLASS } from './transcriptSearchConstants';
import type { UseScrollToActiveMatchArgs } from './useScrollToActiveMatch.types';

export function useScrollToActiveMatch({
  activeMatch,
  query,
  getScrollElement,
  onNavigatedAway,
}: UseScrollToActiveMatchArgs) {
  const activeTurnRef = useRef<Element | null>(null);
  const lastScrolledKeyRef = useRef<string | null>(null);

  const scrollToMatch = useEffectEvent(() => {
    const container = getScrollElement();
    if (!container || !activeMatch || query.length === 0) return;
    const key = `${activeMatch.segId}:${activeMatch.start}`;
    if (lastScrolledKeyRef.current === key) return;
    lastScrolledKeyRef.current = key;

    if (activeTurnRef.current !== null) {
      activeTurnRef.current.classList.remove(ACTIVE_TURN_CLASS);
      activeTurnRef.current = null;
    }
    let turn: Element | null = null;
    try {
      turn = container.querySelector(`[data-seg-id="${CSS.escape(activeMatch.segId)}"]`);
    } catch {
      turn = null;
    }
    if (turn) {
      turn.classList.add(ACTIVE_TURN_CLASS);
      activeTurnRef.current = turn;
      turn.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    onNavigatedAway?.();
  });

  useEffect(() => {
    scrollToMatch();
  }, [activeMatch, query]);

  useEffect(
    () => () => {
      activeTurnRef.current?.classList.remove(ACTIVE_TURN_CLASS);
      clearSearchHighlights(getHighlightApi());
    },
    [],
  );
}

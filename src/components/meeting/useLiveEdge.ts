import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { LIVE_EDGE_PX } from './transcriptItems';
import type { UseLiveEdgeOptions } from './LiveTranscript.types';

export function useLiveEdge({ listRef, showList, autoScrollEnabled, segments, status }: UseLiveEdgeOptions) {
  const stickRef = useRef(true);
  const [stuck, setStuck] = useState(true);

  const getScrollElement = useCallback((): HTMLElement | null => {
    return listRef.current?.getScrollElement() ?? null;
  }, [listRef]);

  const stickToEnd = useCallback(() => {
    const el = getScrollElement();
    if (el) el.scrollTop = el.scrollHeight;
  }, [getScrollElement]);

  const stickOnResize = useEffectEvent(() => {
    if (stickRef.current && autoScrollEnabled) stickToEnd();
  });

  useEffect(() => {
    const el = getScrollElement();
    if (!el || !showList) return;
    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < LIVE_EDGE_PX;
      stickRef.current = near;
      setStuck((prev) => (prev === near ? prev : near));
    };
    el.addEventListener('scroll', onScroll, { passive: true });

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      const spacer = el.firstElementChild;
      let width = el.clientWidth;
      observer = new ResizeObserver(() => stickOnResize());
      if (spacer) observer.observe(spacer);
      const widthObserver = new ResizeObserver(() => {
        if (el.clientWidth === width) return;
        width = el.clientWidth;
        listRef.current?.measureAll();
      });
      widthObserver.observe(el);
      return () => {
        el.removeEventListener('scroll', onScroll);
        observer?.disconnect();
        widthObserver.disconnect();
      };
    }
    return () => el.removeEventListener('scroll', onScroll);
  }, [getScrollElement, showList, listRef]);

  const leaveLiveEdge = useCallback(() => {
    stickRef.current = false;
    setStuck((prev) => (prev === false ? prev : false));
  }, []);

  const followSegments = useEffectEvent(() => {
    if (!autoScrollEnabled || !stickRef.current) return;
    stickToEnd();
  });
  useEffect(() => {
    followSegments();
  }, [segments, autoScrollEnabled]);

  const scrollToLatest = useCallback(() => {
    stickRef.current = true;
    setStuck(true);
    stickToEnd();
  }, [stickToEnd]);

  const showJumpToLatest = !stuck && (status === 'live' || status === 'paused');

  return { getScrollElement, leaveLiveEdge, scrollToLatest, showJumpToLatest };
}

import { useEffect, useRef, type RefObject } from 'react';
import { useSearchParams } from 'next/navigation';
import type { VirtualListHandle } from '@jensbouma123/acciva-ui';
import { SEEK_EVENT } from '@/lib/meeting/seek-event';
import { itemSegments } from './transcriptItems';
import type { TranscriptItem } from './LiveTranscript.types';

export function seekIndex(items: TranscriptItem[], seconds: number): number {
  const index = items.findIndex((item) => itemSegments(item).some((seg) => seg.end >= seconds));
  return index === -1 ? items.length - 1 : index;
}

export function useSeekFromQuery(listRef: RefObject<VirtualListHandle | null>, items: TranscriptItem[]) {
  const raw = useSearchParams()?.get('t') ?? null;
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (raw === null || items.length === 0 || done.current === raw || !listRef.current) return;
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds < 0) return;
    done.current = raw;
    listRef.current.scrollToIndex(seekIndex(items, seconds), 'center');
  }, [raw, items, listRef]);

  useEffect(() => {
    const onSeek = (e: Event) => {
      const seconds = (e as CustomEvent<number>).detail;
      if (typeof seconds === 'number' && items.length > 0) listRef.current?.scrollToIndex(seekIndex(items, seconds), 'center');
    };
    window.addEventListener(SEEK_EVENT, onSeek);
    return () => window.removeEventListener(SEEK_EVENT, onSeek);
  }, [items, listRef]);
}

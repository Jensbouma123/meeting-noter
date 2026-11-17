import { useEffect, type RefObject } from 'react';
import type { VirtualListHandle } from '@jensbouma123/acciva-ui';
import { useFlashOnAdd } from '@/hooks/useFlashOnAdd';
import { REVEAL_EVENT } from '@/lib/meeting/seek-event';
import { itemKey, itemSegments } from './transcriptItems';
import type { TranscriptItem } from './LiveTranscript.types';

export function useRevealSegment(listRef: RefObject<VirtualListHandle | null>, items: TranscriptItem[]) {
  const { flash, rowProps } = useFlashOnAdd('center');

  useEffect(() => {
    const onReveal = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const index = items.findIndex((item) => itemSegments(item).some((seg) => seg.id === id));
      if (index === -1) return;
      listRef.current?.scrollToIndex(index, 'center');
      flash(itemKey(items[index]));
    };
    window.addEventListener(REVEAL_EVENT, onReveal);
    return () => window.removeEventListener(REVEAL_EVENT, onReveal);
  }, [items, listRef, flash]);

  return rowProps;
}

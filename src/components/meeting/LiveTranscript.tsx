'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { VirtualList, type VirtualListHandle } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { FixWordAction } from './FixWordAction';
import { JumpToLatestButton } from './JumpToLatestButton';
import { TranscriptEmptyState } from './TranscriptEmptyState';
import { TranscriptLineRow } from './TranscriptLineRow';
import { TranscriptListening } from './TranscriptListening';
import { TranscriptOverlapRow } from './TranscriptOverlapRow';
import { TranscriptSearch } from './TranscriptSearch';
import { meeting } from './store';
import { buildTranscriptItems, estimateItemHeight, itemKey, turnGridClass } from './transcriptItems';
import { useLiveEdge } from './useLiveEdge';
import { useSeekFromQuery } from './useSeekFromQuery';
import { useTranscriptSearchJump } from './useTranscriptSearchJump';
import type { LiveTranscriptProps, TranscriptItem } from './LiveTranscript.types';

export function LiveTranscript({
  sessionId,
  segments,
  speakers,
  status,
  autoScrollEnabled,
  onStartRecording,
  modelReady,
  modelReadiness,
  onOpenSettings,
}: LiveTranscriptProps) {
  const t = useT('transcript');
  const listRef = useRef<VirtualListHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fixWord = useCallback((heard: string, word: string) => meeting.fixWord(heard, word), []);

  const lines = useMemo(() => buildTranscriptItems(segments), [segments]);
  const isIdle = status === 'idle' && segments.length === 0;
  const listening = (status === 'live' || status === 'paused') && segments.length === 0;
  const showList = lines.length > 0;

  const { getScrollElement, leaveLiveEdge, scrollToLatest, showJumpToLatest } = useLiveEdge({
    listRef,
    showList,
    autoScrollEnabled,
    segments,
    status,
  });
  const { searchOpen, closeSearch, getSearchRoot, onVisibleRangeChange, searchSegments } = useTranscriptSearchJump({
    listRef,
    getScrollElement,
    lines,
    segments,
  });

  useSeekFromQuery(listRef, lines);

  const pastHour = segments.some((seg) => seg.start >= 3600);
  const rowClass = turnGridClass(pastHour);

  useEffect(() => {
    listRef.current?.measureAll();
  }, [pastHour]);

  const renderItem = (item: TranscriptItem, index: number) => {
    const rowProps = { index, isLast: index === lines.length - 1, rowClass, sessionId, speakers };
    return item.kind === 'line' ? (
      <TranscriptLineRow item={item} {...rowProps} />
    ) : (
      <TranscriptOverlapRow item={item} {...rowProps} />
    );
  };

  return (
    <div ref={rootRef} className="relative flex h-full flex-1 flex-col overflow-hidden">
      <FixWordAction containerRef={rootRef} segments={segments} onFix={fixWord} />
      {searchOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center px-4">
          <div className="pointer-events-auto">
            <TranscriptSearch
              segments={searchSegments}
              getScrollElement={getSearchRoot}
              onClose={closeSearch}
              onNavigatedAway={leaveLiveEdge}
            />
          </div>
        </div>
      )}

      {isIdle ? (
        <TranscriptEmptyState
          modelReady={modelReady}
          modelReadiness={modelReadiness}
          onStartRecording={onStartRecording}
          onOpenSettings={onOpenSettings}
        />
      ) : listening ? (
        <TranscriptListening />
      ) : (
        <div className="min-h-0 flex-1">
          <VirtualList
            listRef={listRef}
            items={lines}
            itemHeight={estimateItemHeight}
            dynamic
            overscan={6}
            height="100%"
            getItemKey={itemKey}
            renderItem={(item, { index }) => renderItem(item, index)}
            interactive={false}
            role="list"
            itemRole="listitem"
            aria-label={t('transcriptLabel')}
            onVisibleRangeChange={onVisibleRangeChange}
            className="h-full w-full"
          />
        </div>
      )}

      {showJumpToLatest && <JumpToLatestButton onClick={scrollToLatest} />}
    </div>
  );
}

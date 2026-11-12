'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Segment, Speaker, Status, SystemVia } from '@/lib/meeting';
import { formatClock, splitTranscript } from '@/lib/meeting/export';
import { TranscriptTurn } from './TranscriptTurn';
import { TranscriptSearch } from './TranscriptSearch';
import { FixWordAction } from './FixWordAction';
import { meeting } from './store';
import { getSpeakerColor } from './speaker-theme';
import {
  Badge,
  Button,
  EmptyState,
  Text,
  VirtualList,
  type VirtualListHandle,
  type VirtualListRange,
} from '@jensbouma123/acciva-ui';
import { ArrowDown, Info, Mic } from 'lucide-react';
import type { ModelReadiness } from './modelReadiness';
import type { SettingsSectionId } from '@/components/settings/sections';
import { useT } from '@/lib/i18n/useT';
import { addAction, addDecision } from '@/lib/meeting/notes';

interface LiveTranscriptProps {
  sessionId?: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  status: Status;
  autoScrollEnabled: boolean;
  /**
   * @deprecated Vestigial — system audio always goes through tab/screen
   * sharing now (there is no more "automatic" native-capture mode; see
   * `capture.ts`). Kept only because `MeetingView` still passes it down;
   * no longer read here.
   */
  systemVia?: SystemVia;
  onStartRecording: () => void;
  /** Whether the speech model is downloaded and loaded. */
  modelReady: boolean;
  /** Full readiness state, for a more specific empty-state message. */
  modelReadiness?: ModelReadiness;
  onOpenSettings: (section?: SettingsSectionId) => void;
}

/** Class TranscriptSearch puts on the line it is showing (see its CSS). */
const ACTIVE_TURN_CLASS = 'mn-search-active-turn';
const SEG_SELECTOR = /^\[data-seg-id="(.*)"\]$/;
/** Within this many px of the bottom counts as "at the live edge". */
const LIVE_EDGE_PX = 80;

const cssEscape = (value: string): string =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value;

/** Drops the rule `TranscriptTurn` draws left of a line (its text box, the
 *  `.turn-block`'s child), from `sm` up, in an overlap column. */
const COLUMN_WITHOUT_LINE_RULE = 'sm:[&_.turn-block>div]:border-l-0 sm:[&_.turn-block>div]:pl-0';

/** One transcript line and whether it opens a speaker turn (see `splitTranscript`). */
interface Line {
  kind: 'line';
  seg: Segment;
  turnStart: boolean;
}

/** A stretch of overlapping speech, within one source or across the mic and
 *  the call: one column per speaker with words in it, each holding that
 *  speaker's lines in time order. Always two or more. */
interface Overlap {
  kind: 'overlap';
  /** Its first line's id. */
  id: string;
  start: number;
  columns: { speaker: string; segs: Segment[] }[];
}

/** One virtualised row. */
type Item = Line | Overlap;

const lineHeight = (text: string, charsPerLine = 60) =>
  Math.max(1, Math.ceil(text.length / charsPerLine)) * 26;

/**
 * First-paint height guess for a row (~72ch wide). Rows are measured once
 * mounted, so this only has to be close enough to keep the scrollbar and the
 * not-yet-seen tail roughly right. An overlap guesses its side-by-side
 * height: the tallest column, a speaker name above each.
 */
function estimateRowHeight(item: Item): number {
  if (item.kind === 'line') return lineHeight(item.seg.text) + 12;
  const width = 60 / item.columns.length;
  const columns = item.columns.map((c) => c.segs.reduce((h, seg) => h + lineHeight(seg.text, width), 26));
  return Math.max(...columns) + 12;
}

const estimateItemHeight = (_index: number, item: Item) => estimateRowHeight(item);
const itemKey = (item: Item) => (item.kind === 'line' ? item.seg.id : `overlap:${item.id}`);
const itemSegments = (item: Item): Segment[] =>
  item.kind === 'line' ? [item.seg] : item.columns.flatMap((c) => c.segs);

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
  // The transcript is a `VirtualList` (only the lines near the viewport are
  // in the DOM); its handle reaches the scrolling viewport and scrolls by line
  // index, which is how a search match that isn't mounted gets brought in.
  const listRef = useRef<VirtualListHandle>(null);
  // Glued to the live edge? Ref for the hot path (no re-render per partial),
  // state mirror only to show/hide the jump pill.
  const stickRef = useRef(true);
  const [stuck, setStuck] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchOpenRef = useRef(false);
  const autoScrollRef = useRef(autoScrollEnabled);
  // Bumped when the mounted window of lines changes while searching, so the
  // search re-applies its highlights to the freshly mounted rows.
  const [windowVersion, setWindowVersion] = useState(0);
  const pendingSegRef = useRef<string | null>(null);
  const ringRef = useRef<Element | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fixWord = useCallback((heard: string, word: string) => meeting.fixWord(heard, word), []);

  useEffect(() => {
    autoScrollRef.current = autoScrollEnabled;
  }, [autoScrollEnabled]);
  useEffect(() => {
    searchOpenRef.current = searchOpen;
  }, [searchOpen]);

  const getScrollElement = useCallback((): HTMLElement | null => {
    return listRef.current?.getScrollElement() ?? null;
  }, []);

  // Presentation-only: segments in time order, cut into turns and overlaps by
  // the same rules as the export (see `splitTranscript`). One row per line,
  // the speaker in the row itself: a line is shown before diarization has
  // confirmed who said it, and a late reassignment then only changes that
  // row's label, where a header row of its own would push everything around
  // it. Overlapping speech is one row of its own, a column per speaker.
  const lines = useMemo(
    () =>
      splitTranscript(segments).flatMap((block): Item[] =>
        block.kind === 'turn'
          ? block.segments.map((seg, i): Line => ({ kind: 'line', seg, turnStart: i === 0 }))
          : [{
              kind: 'overlap',
              id: block.segments[0].id,
              start: block.segments[0].start,
              columns: block.speakers
                .map((speaker) => ({ speaker, segs: block.segments.filter((seg) => seg.speaker === speaker) }))
                .filter((column) => column.segs.length > 0),
            }],
      ),
    [segments],
  );
  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  const isIdle = status === 'idle' && segments.length === 0;
  const listening = (status === 'live' || status === 'paused') && segments.length === 0;
  const showList = lines.length > 0;

  const stickToEnd = useCallback(() => {
    const el = getScrollElement();
    if (el) el.scrollTop = el.scrollHeight;
  }, [getScrollElement]);

  // Track whether the user is at the live edge, and keep the view glued there
  // while they are. The viewport is a native scroller inside `VirtualList`, so
  // we listen to it directly. Rows above the fold re-measure (and the spacer
  // height changes) after we've scrolled, so the spacer's ResizeObserver
  // re-pins the end in the same frame instead of leaving a gap.
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
      observer = new ResizeObserver(() => {
        if (stickRef.current && autoScrollRef.current) stickToEnd();
      });
      if (spacer) observer.observe(spacer);
      // A width change rewraps every line, so cached heights of unmounted rows
      // are stale: drop them and let mounted rows re-measure.
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
  }, [getScrollElement, showList, stickToEnd]);

  // Keyboard-shortcut contract: the global handler dispatches 'mn:search'.
  useEffect(() => {
    const open = () => setSearchOpen(true);
    window.addEventListener('mn:search', open);
    return () => window.removeEventListener('mn:search', open);
  }, []);

  // A search jump leaves the live edge: stop sticking so streaming partials
  // no longer yank the view until the user jumps back to latest.
  const leaveLiveEdge = useCallback(() => {
    stickRef.current = false;
    setStuck((prev) => (prev === false ? prev : false));
  }, []);

  // Stick to the live edge on new/updated segments. Instant assignment —
  // smooth scrolling here would queue an animation per partial and lag.
  useEffect(() => {
    if (!autoScrollEnabled || !stickRef.current) return;
    stickToEnd();
  }, [segments, autoScrollEnabled, stickToEnd]);

  const scrollToLatest = useCallback(() => {
    stickRef.current = true;
    setStuck(true);
    stickToEnd();
  }, [stickToEnd]);

  const showJumpToLatest = !stuck && (status === 'live' || status === 'paused');

  const clearRing = useCallback(() => {
    ringRef.current?.classList.remove(ACTIVE_TURN_CLASS);
    ringRef.current = null;
  }, []);

  useEffect(() => {
    if (!searchOpen) {
      clearRing();
      pendingSegRef.current = null;
    }
  }, [searchOpen, clearRing]);

  // TranscriptSearch finds a match's line with `querySelector` on the viewport.
  // Virtualised, an off-screen line isn't there: on that miss we scroll it
  // into the window (the search then re-highlights via `windowVersion`).
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
        const index = linesRef.current.findIndex((item) => {
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
  }, [getScrollElement, clearRing]);

  // VirtualList reports a fresh range object on every render, so compare the
  // bounds or this would loop.
  const lastRangeRef = useRef<VirtualListRange>({ start: -1, end: -1 });
  const onVisibleRangeChange = useCallback((range: VirtualListRange) => {
    const last = lastRangeRef.current;
    if (last.start === range.start && last.end === range.end) return;
    lastRangeRef.current = range;
    if (searchOpenRef.current) setWindowVersion((v) => v + 1);
  }, []);

  // Once a jumped-to line is mounted, ring it and centre it exactly (the row
  // heights above it were estimates when we first scrolled).
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

  // The search only re-reads `segments` to re-apply highlights; a fresh array
  // per mounted-window change makes it do so for rows that just mounted.
  const searchSegments = useMemo(
    () => (windowVersion >= 0 ? [...segments] : segments),
    [segments, windowVersion],
  );

  // The live percentage lives solely in the TopBar pill now, so this empty
  // state only distinguishes the states that change what the user should do.
  const preparing = modelReadiness === 'loading' || modelReadiness === 'downloading';
  const failed = modelReadiness === 'failed';
  const emptyTitle = preparing
    ? t('speechPreparing')
    : failed
      ? t('speechFailed')
      : t('speechMissing');
  const emptyBody = preparing
    ? t('speechPreparingDescription')
    : failed
      ? t('speechFailedDescription')
      : t('speechMissingDescription');

  // Hover/focus actions on a final line: save it to the notes as an action
  // item or a decision, remembering the segment it came from.
  const turnActions = (seg: Segment) =>
    sessionId
      ? {
          createAction: () => { addAction(sessionId, seg.text, { sourceSegmentId: seg.id }); },
          markDecision: () => { addDecision(sessionId, seg.text, seg.id); },
        }
      : undefined;

  // Timestamp gutter, then the speaker column: wide enough for hh:mm:ss once
  // the meeting passes an hour, and narrower on a phone. The phone speaker
  // column still fits "Speaker 1"/"Speaker 2" (dot + gap + ~9 chars) without
  // ellipsis — the name must stay fully readable at 390px.
  const pastHour = segments.some((seg) => seg.start >= 3600);
  const rowClass = `grid items-baseline gap-x-2 sm:gap-x-3 ${
    pastHour
      ? 'grid-cols-[3.75rem_6rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_7rem_minmax(0,1fr)]'
      : 'grid-cols-[2.5rem_6rem_minmax(0,1fr)] sm:grid-cols-[3.5rem_7rem_minmax(0,1fr)]'
  }`;

  // The gutter width changes how every line wraps.
  useEffect(() => {
    listRef.current?.measureAll();
  }, [pastHour]);

  const speakerStyle = (id: string, source: Segment['source']) => {
    const speaker = speakers[id];
    const colorIndex = speaker?.colorIndex ?? 0;
    return {
      label: speaker?.label ?? (source === 'mic' ? t('you') : t('unknownSpeaker')),
      colorIndex,
      color: getSpeakerColor(colorIndex),
    };
  };

  // Overlapping speech: the timestamp, then the speakers side by side from a
  // shared top edge, one column each in its speaker's colour. On a phone the
  // columns stack instead, one bracket down their left spanning them all.
  const renderOverlap = ({ start, columns }: Overlap, index: number) => {
    const last = index === lines.length - 1;
    // A column's own source: the mic's and the call's speakers can overlap.
    const names = columns.map((c) => speakerStyle(c.speaker, c.segs[0].source).label);
    const groupLabel = t('overlap').replace('{names}', names.join(t('and')));
    return (
      <div className={`mn-vrow px-4 md:px-8 ${index === 0 ? 'pt-6' : ''} ${last ? 'pb-40' : ''}`}>
        <div className="mx-auto w-full max-w-[calc(72ch+10rem)]">
          <div
            role="group"
            aria-label={groupLabel}
            data-overlap=""
            data-turn-start=""
            className={`${rowClass} relative py-1.5 ${
              index > 0 ? 'before:absolute before:inset-x-0 before:top-0 before:border-t before:border-border-subtle/40' : ''
            }`}
          >
            <Text as="span" size="xs" variant="muted" font="mono" className="select-none text-right tabular-nums">
              {formatClock(start)}
            </Text>
            <div className="relative col-span-2 min-w-0 pl-3 sm:pl-0">
              <span
                data-overlap-bracket=""
                aria-hidden="true"
                title={groupLabel}
                className="absolute inset-y-1 left-0 w-1.5 rounded-l-sm border-y-2 border-l-2 border-text-muted/50 sm:hidden"
              />
              <div
                className="flex flex-col gap-y-2 sm:grid sm:gap-x-4"
                style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
              >
                {columns.map(({ speaker: id, segs }) => {
                  const { label, colorIndex, color } = speakerStyle(id, segs[0].source);
                  // From `sm` the column's own bar, in the speaker's colour,
                  // is its rule: the grey one each line draws is dropped
                  // there, or the column showed two. A phone keeps only the
                  // grey one, under the bracket.
                  return (
                    <div
                      key={id}
                      data-overlap-speaker={id}
                      className={`relative min-w-0 sm:pl-3 ${COLUMN_WITHOUT_LINE_RULE}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-0.5 left-0 hidden w-0.5 rounded-full sm:block ${color.dotClass}`}
                      />
                      <span className="flex min-w-0 items-baseline gap-1.5 select-none">
                        <span className={`inline-block size-2 shrink-0 self-center rounded-full ${color.dotClass}`} aria-hidden="true" />
                        <Text as="span" size="sm" weight="semibold" className={`truncate ${color.textClass}`}>
                          {label}
                        </Text>
                      </span>
                      {segs.map((seg) => (
                        <div key={seg.id} data-seg-id={seg.id} className="min-w-0">
                          <TranscriptTurn
                            actions={turnActions(seg)}
                            segment={seg}
                            speakerLabel={label}
                            speakerColorIndex={colorIndex}
                            showHeader={false}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderItem = (item: Item, index: number) =>
    item.kind === 'line' ? renderLine(item, index) : renderOverlap(item, index);

  const renderLine = ({ seg, turnStart }: Line, index: number) => {
    const speaker = speakers[seg.speaker];
    const speakerLabel = speaker?.label ?? (seg.source === 'mic' ? t('you') : t('unknownSpeaker'));
    const speakerColor = speaker?.colorIndex ?? 0;
    const colorStyle = getSpeakerColor(speakerColor);
    const sourceLabel = seg.source === 'mic' ? t('mic') : t('call');
    const last = index === lines.length - 1;

    // The row is the measured box. Every row has the same shape whether it
    // opens a turn or continues one — the name is shown or kept invisible in
    // its own column, the turn rule is drawn in the row's padding — so a
    // speaker label that changes after the line appeared never moves a line.
    return (
      <div
        className={`mn-vrow px-4 md:px-8 ${index === 0 ? 'pt-6' : ''} ${last ? 'pb-40' : ''}`}
      >
        <div className="mx-auto w-full max-w-[calc(72ch+10rem)]">
          <div
            data-speaker={seg.speaker}
            data-turn-start={turnStart ? '' : undefined}
            className={`${rowClass} relative py-1.5 ${
              turnStart && index > 0
                ? 'before:absolute before:inset-x-0 before:top-0 before:border-t before:border-border-subtle/40'
                : ''
            }`}
          >
            <Text
              as="span"
              size="xs"
              variant="muted"
              font="mono"
              className="select-none text-right tabular-nums"
            >
              {formatClock(seg.start)}
            </Text>
            {seg.unconfirmed ? (
              <span
                data-speaker-pending=""
                role="status"
                aria-label={t('pendingSpeaker')}
                title={t('pendingSpeaker')}
                className={`flex min-w-0 items-baseline gap-1.5 select-none ${turnStart ? '' : 'invisible'}`}
              >
                <span className="inline-flex shrink-0 gap-0.5 self-center" aria-hidden="true">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="size-1 animate-pulse rounded-full bg-text-muted motion-reduce:animate-none"
                      style={{ animationDelay: `${dot * 150}ms` }}
                    />
                  ))}
                </span>
                <Text as="span" size="sm" variant="muted" className="truncate">
                  {t('identifying')}
                </Text>
              </span>
            ) : (
            <span className="flex min-w-0 items-baseline gap-1.5 select-none" title={`${speakerLabel} · ${sourceLabel}`}>
              <span
                className={`inline-block size-2 shrink-0 self-center rounded-full transition-colors duration-200 ${colorStyle.dotClass}`}
                aria-hidden="true"
              />
              {/* Kept, invisible, on a continuation line so its baseline and
                  width match a turn's first line. */}
              <Text
                as="span"
                size="sm"
                weight="semibold"
                className={`truncate ${colorStyle.textClass} ${turnStart ? '' : 'invisible'}`}
              >
                {speakerLabel}
              </Text>
              {turnStart && <span className="sr-only">({sourceLabel})</span>}
            </span>
            )}
            {/* Only the line itself: search offsets count every text node in here. */}
            <div data-seg-id={seg.id} className="min-w-0">
              <TranscriptTurn
                actions={turnActions(seg)}
                segment={seg}
                speakerLabel={speakerLabel}
                speakerColorIndex={speakerColor}
                showHeader={false}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={rootRef} className="relative flex h-full flex-1 flex-col overflow-hidden">
      <FixWordAction containerRef={rootRef} segments={segments} onFix={fixWord} />
      {/* In-app transcript search overlay */}
      {searchOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center px-4">
          <div className="pointer-events-auto">
            <TranscriptSearch
              segments={searchSegments}
              getScrollElement={getSearchRoot}
              onClose={() => setSearchOpen(false)}
              onNavigatedAway={leaveLiveEdge}
            />
          </div>
        </div>
      )}

      {isIdle ? (
        <div
          role="region"
          aria-label={t('transcriptLabel')}
          className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-6 md:px-8"
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-5">
            <EmptyState
              size="md"
              icon={<Mic className="size-6" aria-hidden="true" />}
              title={modelReady ? t('ready') : emptyTitle}
              description={modelReady ? t('readyDescription') : emptyBody}
              action={
                modelReady ? (
                  <Button variant="primary" size={{ base: 'md', md: 'sm' }} onClick={onStartRecording}>
                    {t('record')}
                    <kbd className="contents">
                      <Badge variant="neutral" size="sm" className="ml-2 font-mono" aria-hidden="true">
                        R
                      </Badge>
                    </kbd>
                  </Button>
                ) : !preparing ? (
                  <Button
                    variant="secondary"
                    size={{ base: 'md', md: 'sm' }}
                    onClick={() => onOpenSettings('advanced')}
                  >
                    {failed ? t('openSettings') : t('setupModel')}
                  </Button>
                ) : undefined
              }
            />
            <div className="flex w-full items-start justify-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-center">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <Text size="xs" variant="muted">
                {t('callTip')}
              </Text>
            </div>
          </div>
        </div>
      ) : listening ? (
        <div
          role="region"
          aria-label={t('transcriptLabel')}
          className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-6 md:px-8"
        >
          <EmptyState
            compact
            size="sm"
            icon={<Mic className="size-5" aria-hidden="true" />}
            title={t('listening')}
            description={t('listeningDescription')}
          />
        </div>
      ) : (
        /* Live timeline: a row per line — timestamp, speaker, text. Rows are
           measured (dynamic) and must size to their content: no
           content-visibility/contain on them (see globals.css note on .turn-block). */
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
            // Partial text updates several times per second; a polite live region
            // would spam screen readers, so this stays a plain labelled region.
            aria-label={t('transcriptLabel')}
            onVisibleRangeChange={onVisibleRangeChange}
            className="h-full w-full"
          />
        </div>
      )}

      {/* "Jump to latest" floating pill */}
      {showJumpToLatest && (
        <div className="pointer-events-auto absolute bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2 animate-banner-enter">
          <Button
            variant="secondary"
            size={{ base: 'md', md: 'sm' }}
            onClick={scrollToLatest}
            leadingIcon={
              <ArrowDown className="size-3.5 animate-bounce text-primary motion-reduce:animate-none" />
            }
            className="rounded-full shadow-elevation-2"
          >
            {t('jump')}
          </Button>
        </div>
      )}
    </div>
  );
}

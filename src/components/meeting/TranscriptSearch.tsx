'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import type { Segment } from '@/lib/meeting';
import { useT } from '@/lib/i18n/useT';
import { Button, Card, HStack, Input, Text } from '@jensbouma123/acciva-ui';

export interface SearchMatch {
  segId: string;
  start: number;
  end: number;
}

interface TranscriptSearchProps {
  segments: Segment[];
  /** The transcript's scrolling viewport. A getter, not a ref: the host
   *  scrolls via a `ScrollView` handle, which only exposes `getScrollElement`. */
  getScrollElement: () => HTMLElement | null;
  onClose: () => void;
  /** Fired when the active match moves — the host uses it to leave the live edge. */
  onNavigatedAway?: () => void;
}

/** All case-insensitive occurrences of query across segments, in segment order. */
export function findMatches(segments: Segment[], query: string): SearchMatch[] {
  const q = query.toLowerCase();
  if (q.length === 0) return [];
  const out: SearchMatch[] = [];
  for (const seg of segments) {
    const text = seg.text.toLowerCase();
    let from = 0;
    while (from <= text.length) {
      const i = text.indexOf(q, from);
      if (i === -1) break;
      out.push({ segId: seg.id, start: i, end: i + q.length });
      from = i + Math.max(1, q.length);
    }
  }
  return out;
}

type HighlightConstructor = new (...ranges: Range[]) => object;

interface HighlightRegistryLike {
  set(name: string, highlight: object): void;
  delete(name: string): void;
}

function getHighlightApi(): {
  registry: HighlightRegistryLike;
  Highlight: HighlightConstructor;
} | null {
  try {
    const css = CSS as unknown as { highlights?: HighlightRegistryLike };
    const w = window as unknown as { Highlight?: HighlightConstructor };
    if (!css.highlights || !w.Highlight) return null;
    return { registry: css.highlights, Highlight: w.Highlight };
  } catch {
    return null;
  }
}

const MAX_HIGHLIGHT_RANGES = 1000;
const ACTIVE_TURN_CLASS = 'mn-search-active-turn';

const SEARCH_HIGHLIGHT_CSS = `
::highlight(mn-search) { background-color: color-mix(in oklab, var(--color-warning-400) 45%, transparent); color: inherit; }
::highlight(mn-search-active) { background-color: color-mix(in oklab, var(--color-warning-500) 60%, transparent); color: inherit; }
.${ACTIVE_TURN_CLASS} { background-color: color-mix(in oklab, var(--color-warning-400) 8%, transparent); border-radius: 0.5rem; box-shadow: inset 2px 0 0 0 var(--color-warning-500); }
`;

function collectTextNodes(root: Element): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeValue && node.nodeValue.length > 0) out.push(node as Text);
    node = walker.nextNode();
  }
  return out;
}

export function TranscriptSearch({
  segments,
  getScrollElement,
  onClose,
  onNavigatedAway,
}: TranscriptSearchProps) {
  const t = useT('transcript');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const activeTurnRef = useRef<Element | null>(null);
  const lastScrolledKeyRef = useRef<string | null>(null);

  const matches = useMemo(() => findMatches(segments, query), [segments, query]);
  const clampedActive = matches.length === 0 ? 0 : Math.min(active, matches.length - 1);
  const activeMatch = matches.length === 0 ? null : matches[clampedActive];

  // (active resets to the first match in the input onChange below)

  // Scroll the active match's turn into view + ring it. Skipped when only the
  // transcript grew (partials streaming) so live updates never yank the view.
  useEffect(() => {
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
  }, [activeMatch, query, getScrollElement, onNavigatedAway]);

  // Substring highlighting via the CSS Custom Highlight API (no DOM mutation,
  // so React-owned turn nodes are never disturbed). Re-applied whenever the
  // transcript updates; falls back to the active-turn ring when unsupported.
  useEffect(() => {
    const api = getHighlightApi();
    if (api) {
      api.registry.delete('mn-search');
      api.registry.delete('mn-search-active');
    }
    const container = getScrollElement();
    if (!container || !api || query.length === 0 || !activeMatch) return;

    const bySeg = new Map<string, SearchMatch[]>();
    for (const m of matches) {
      const list = bySeg.get(m.segId);
      if (list) list.push(m);
      else bySeg.set(m.segId, [m]);
    }

    const baseRanges: Range[] = [];
    const activeRanges: Range[] = [];
    let globalIdx = 0;
    const activeGlobalIdx = clampedActive;
    const turns = container.querySelectorAll('[data-seg-id]');
    for (const turn of turns) {
      const segId = turn.getAttribute('data-seg-id') ?? '';
      const segMatches = bySeg.get(segId);
      if (!segMatches || segMatches.length === 0) continue;
      const nodes = collectTextNodes(turn);
      let offset = 0;
      const spans = nodes.map((node) => {
        const start = offset;
        offset += node.nodeValue?.length ?? 0;
        return { node, start, end: offset };
      });
      for (const m of segMatches) {
        for (const span of spans) {
          const a = Math.max(span.start, m.start);
          const b = Math.min(span.end, m.end);
          if (b > a) {
            const range = document.createRange();
            range.setStart(span.node, a - span.start);
            range.setEnd(span.node, b - span.start);
            if (globalIdx === activeGlobalIdx) activeRanges.push(range);
            else baseRanges.push(range);
          }
        }
        globalIdx += 1;
      }
      if (baseRanges.length + activeRanges.length >= MAX_HIGHLIGHT_RANGES) break;
    }

    if (baseRanges.length > 0) {
      api.registry.set('mn-search', new api.Highlight(...baseRanges));
    }
    if (activeRanges.length > 0) {
      api.registry.set('mn-search-active', new api.Highlight(...activeRanges));
    }
    return () => {
      api.registry.delete('mn-search');
      api.registry.delete('mn-search-active');
    };
  }, [segments, query, matches, activeMatch, clampedActive, getScrollElement]);

  // Clear the active-turn ring on unmount.
  useEffect(
    () => () => {
      activeTurnRef.current?.classList.remove(ACTIVE_TURN_CLASS);
      const api = getHighlightApi();
      api?.registry.delete('mn-search');
      api?.registry.delete('mn-search-active');
    },
    [],
  );

  const goNext = () => {
    if (matches.length === 0) return;
    setActive((prev) => (prev + 1) % matches.length);
  };

  const goPrev = () => {
    if (matches.length === 0) return;
    setActive((prev) => (prev - 1 + matches.length) % matches.length);
  };

  const countLabel =
    query.length === 0
      ? ''
      : matches.length === 0
        ? t('noResults')
        : t('resultCount').replace('{current}', String(clampedActive + 1)).replace('{total}', String(matches.length));

  return (
    <Card
      variant="elevated"
      padding="sm"
      className="w-full max-w-md animate-banner-enter shadow-elevation-3"
      role="search"
      aria-label={t('searchLabel')}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <HStack spacing="xs" className="w-full">
        <Input
          autoFocus
          type="search"
          size="sm"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (e.shiftKey) goPrev();
              else goNext();
            }
          }}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchLabel')}
          leadingIcon={<Search className="size-3.5" aria-hidden="true" />}
          clearable={query.length > 0}
          onClear={() => {
            setQuery('');
            setActive(0);
          }}
          className="min-w-32 flex-1"
        />

        <Text
          as="span"
          size="xs"
          font="mono"
          variant="muted"
          aria-live="polite"
          className="whitespace-nowrap text-center tabular-nums empty:hidden"
        >
          {countLabel}
        </Text>

        <Button
          variant="ghost"
          size="sm"
          iconOnly
          className="touch-target-44"
          onClick={goPrev}
          disabled={matches.length === 0}
          tooltip={t('previous')}
          leadingIcon={<ChevronUp className="size-4" />}
        />
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          className="touch-target-44"
          onClick={goNext}
          disabled={matches.length === 0}
          tooltip={t('next')}
          leadingIcon={<ChevronDown className="size-4" />}
        />
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          className="touch-target-44"
          onClick={onClose}
          tooltip={t('close')}
          leadingIcon={<X className="size-4" />}
        />
      </HStack>
      <style>{SEARCH_HIGHLIGHT_CSS}</style>
    </Card>
  );
}

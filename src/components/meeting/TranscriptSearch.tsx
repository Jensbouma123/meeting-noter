'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { Button, Card, HStack, Input, Text } from '@jensbouma123/acciva-ui';
import { findMatches } from './findSearchMatches';
import { SEARCH_HIGHLIGHT_CSS } from './transcriptSearchConstants';
import { useScrollToActiveMatch } from './useScrollToActiveMatch';
import { useSearchHighlight } from './useSearchHighlight';
import type { TranscriptSearchProps } from './TranscriptSearch.types';

export function TranscriptSearch({
  segments,
  getScrollElement,
  onClose,
  onNavigatedAway,
}: TranscriptSearchProps) {
  const t = useT('transcript');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const matches = useMemo(() => findMatches(segments, query), [segments, query]);
  const clampedActive = matches.length === 0 ? 0 : Math.min(active, matches.length - 1);
  const activeMatch = matches.length === 0 ? null : matches[clampedActive];

  useScrollToActiveMatch({ activeMatch, query, getScrollElement, onNavigatedAway });
  useSearchHighlight({ segments, query, matches, activeMatch, clampedActive, getScrollElement });

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

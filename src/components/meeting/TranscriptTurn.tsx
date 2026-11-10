'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import type { Segment } from '@/lib/meeting';
import { getSpeakerColor } from './speaker-theme';
import { Badge, HStack, Text } from '@jensbouma123/acciva-ui';

interface TranscriptTurnProps {
  segment: Segment;
  speakerLabel: string;
  speakerColorIndex: number;
  /** First line of a run by the same speaker: shows name, time and source once. */
  showHeader?: boolean;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Split text into alternating word / whitespace tokens so new words can
 * animate in gently while already-shown words keep stable DOM nodes.
 * Interim partials re-transcribe the open utterance in place, so the token
 * stream mostly grows at the tail; corrections mid-buffer simply re-render
 * without animation.
 */
function tokenize(text: string): { word: boolean; value: string }[] {
  const parts = text.split(/(\s+)/);
  return parts.filter((p) => p.length > 0).map((p) => ({ word: /\S/.test(p), value: p }));
}

export const TranscriptTurn = React.memo(
  function TranscriptTurn({
    segment,
    speakerLabel,
    speakerColorIndex,
    showHeader = true,
  }: TranscriptTurnProps) {
    const colorStyle = getSpeakerColor(speakerColorIndex);
    const isFinal = segment.final;

    const tokens = useMemo(() => tokenize(segment.text), [segment.text]);
    // Number of tokens shown on the previous commit; only the tail past
    // this index animates in, so old words never replay or shift.
    const shownCountRef = useRef(tokens.length);
    const animateFrom = Math.min(shownCountRef.current, tokens.length);
    useEffect(() => {
      shownCountRef.current = tokens.length;
    }, [tokens.length]);

    return (
      <article
        className={`turn-block group flex flex-col gap-1.5 animate-turn-enter ${showHeader ? 'pt-1' : ''}`}
      >
        {/* Speaker metadata header — once per run of same-speaker lines */}
        {showHeader && (
          <HStack spacing="sm" align="center" className="select-none">
            <span
              className={`size-2.5 shrink-0 rounded-full ${colorStyle.dotClass}`}
              aria-hidden="true"
            />
            <Text as="span" size="sm" weight="semibold" className={`${colorStyle.textClass} transition-opacity ${isFinal ? '' : 'opacity-70'}`}>
              {speakerLabel}
            </Text>
            <Text as="span" size="xs" variant="muted" font="mono" className="tabular-nums">
              {formatTimestamp(segment.start)}
            </Text>
            {/* `Badge` resolves to the `--badge-*-*` roles, which the dark theme
              redefines — the hand-rolled `bg-elevation-1` + `text-muted-*`
              pair it replaced did not adapt. */}
            <Badge variant="neutral" size="xxs">
              {segment.source === 'mic' ? 'Mic' : 'Call'}
            </Badge>
            {!isFinal && (
              <Badge variant="primary" size="xxs" dot>
                Listening…
              </Badge>
            )}
          </HStack>
        )}

        {/* Spoken content: interim text renders in the same node, dimmed,
            and finalizing only fades opacity — no layout change. */}
        <div className="border-l-2 border-border-subtle/40 pl-4.5 transition-colors group-hover:border-border-subtle">
          <Text
            as="p"
            size="md"
            className={`font-sans tracking-normal transition-opacity duration-200 ${
              isFinal ? 'opacity-100' : 'opacity-60'
            }`}
          >
            {tokens.map((tok, i) =>
              tok.word ? (
                <span key={i} className={i >= animateFrom ? 'mn-word-new' : undefined}>
                  {tok.value}
                </span>
              ) : (
                <React.Fragment key={i}>{tok.value}</React.Fragment>
              ),
            )}
            {/* Caret keeps its box when final so the line never reflows. */}
            {!isFinal && <span className="sr-only">Listening…</span>}
            <span
              className={`ml-1 inline-block h-4 w-1.5 rounded-sm bg-primary align-middle ${
                isFinal ? 'invisible' : 'animate-soft-caret'
              }`}
              aria-hidden="true"
            />
          </Text>
        </div>
      </article>
    );
  },
  (prev, next) =>
    prev.segment.id === next.segment.id &&
    prev.segment.text === next.segment.text &&
    prev.segment.final === next.segment.final &&
    prev.segment.start === next.segment.start &&
    prev.segment.source === next.segment.source &&
    prev.speakerLabel === next.speakerLabel &&
    prev.speakerColorIndex === next.speakerColorIndex &&
    prev.showHeader === next.showHeader,
);

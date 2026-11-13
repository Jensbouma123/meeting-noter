'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Text } from '@jensbouma123/acciva-ui';
import { TranscriptTurnActions } from './TranscriptTurnActions';
import { TranscriptTurnHeader } from './TranscriptTurnHeader';
import { splitIntoWordAndSpaceTokens } from './transcriptTurnFormat';
import type { TranscriptTurnProps } from './TranscriptTurn.types';

export const TranscriptTurn = React.memo(
  function TranscriptTurn({
    segment,
    speakerLabel,
    speakerColorIndex,
    showHeader = true,
    actions,
  }: TranscriptTurnProps) {
    const isFinal = segment.final;

    const tokens = useMemo(() => splitIntoWordAndSpaceTokens(segment.text), [segment.text]);
    const shownCountRef = useRef(tokens.length);
    const animateFrom = Math.min(shownCountRef.current, tokens.length);
    useEffect(() => {
      shownCountRef.current = tokens.length;
    }, [tokens.length]);

    return (
      <article
        className={`turn-block group flex flex-col gap-1.5 animate-turn-enter ${showHeader ? 'pt-1' : ''}`}
      >
        {showHeader && (
          <TranscriptTurnHeader
            segment={segment}
            speakerLabel={speakerLabel}
            speakerColorIndex={speakerColorIndex}
          />
        )}

        <div className="flex items-start gap-2 border-l-2 border-border-subtle/40 pl-4.5 transition-colors group-hover:border-border-subtle">
          <Text
            as="p"
            size="md"
            className={`min-w-0 flex-1 font-sans tracking-normal transition-opacity duration-200 ${
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
            {!isFinal && <span className="sr-only">Listening…</span>}
            <span
              className={`ml-1 inline-block h-4 w-1.5 rounded-sm bg-primary align-middle ${
                isFinal ? 'invisible' : 'animate-soft-caret'
              }`}
              aria-hidden="true"
            />
          </Text>
          {actions && segment.final && <TranscriptTurnActions actions={actions} />}
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

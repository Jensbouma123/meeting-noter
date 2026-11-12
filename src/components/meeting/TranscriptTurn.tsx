'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, MoreHorizontal } from 'lucide-react';
import type { Segment } from '@/lib/meeting';
import { getSpeakerColor } from './speaker-theme';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  Text,
} from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';

interface TranscriptTurnProps {
  segment: Segment;
  speakerLabel: string;
  speakerColorIndex: number;
  /** First line of a run by the same speaker: shows name, time and source once. */
  showHeader?: boolean;
  actions?: { createAction: () => void; markDecision: () => void };
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
    actions,
  }: TranscriptTurnProps) {
    const t = useT('transcript');
    const colorStyle = getSpeakerColor(speakerColorIndex);
    const isFinal = segment.final;
    // Which note this line was saved as, so the click gives visible feedback.
    const [added, setAdded] = useState<'action' | 'decision' | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);

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
              {segment.source === 'mic' ? t('mic') : t('call')}
            </Badge>
            {!isFinal && (
              <Badge variant="primary" size="xxs" dot>
                {t('listening')}
              </Badge>
            )}
          </HStack>
        )}

        {/* Spoken content: interim text renders in the same node, dimmed,
            and finalizing only fades opacity — no layout change. */}
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
            {/* Caret keeps its box when final so the line never reflows. */}
            {!isFinal && <span className="sr-only">Listening…</span>}
            <span
              className={`ml-1 inline-block h-4 w-1.5 rounded-sm bg-primary align-middle ${
                isFinal ? 'invisible' : 'animate-soft-caret'
              }`}
              aria-hidden="true"
            />
          </Text>
          {actions && segment.final && (
            <div
              className={`ml-auto flex shrink-0 items-center gap-1 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 ${
                menuOpen ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <span role="status" aria-live="polite" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {added && (
                  <>
                    <Check aria-hidden="true" className="size-3.5" />
                    {added === 'action' ? t('actionAdded') : t('decisionAdded')}
                  </>
                )}
              </span>
              <DropdownMenu onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    iconOnly
                    tooltip={t('lineActions')}
                    aria-label={t('lineActions')}
                    leadingIcon={<MoreHorizontal className="size-4" />}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { actions.createAction(); setAdded('action'); }}>
                    {t('createAction')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { actions.markDecision(); setAdded('decision'); }}>
                    {t('markDecision')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
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

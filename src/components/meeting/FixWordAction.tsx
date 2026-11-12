'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Button, FormField, HStack, Input, Modal, Text, VStack } from '@jensbouma123/acciva-ui';
import { SpellCheck } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import type { Segment } from '@/lib/meeting';

/** Longest selection offered for fixing: a word or a short phrase, not a paragraph. */
const MAX_SELECTION_CHARS = 60;
const MAX_SELECTION_WORDS = 5;

interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface Picked {
  heard: string;
  /** The selection's bounding box, in viewport pixels. */
  rect: Box;
  /** The transcript's bounding box: the toolbar stays inside it. */
  bounds: Box;
}

/** Gap between the selection and the toolbar, and the toolbar's pointer height. */
const GAP = 8;
const EDGE = 4;

export interface ToolbarPlacement {
  top: number;
  left: number;
  side: 'above' | 'below';
  /** Pointer offset from the toolbar's left edge, aimed at the selection centre. */
  arrowX: number;
}

/**
 * Centre the toolbar on the selection, above it; flip below when there is no
 * room above (inside `bounds`), and clamp sideways so it stays inside `bounds`.
 * The selection itself is never covered.
 */
export function placeToolbar(rect: Box, bounds: Box, size: { width: number; height: number }): ToolbarPlacement {
  const side = rect.top - GAP - size.height >= bounds.top ? 'above' : 'below';
  const top = side === 'above' ? rect.top - GAP - size.height : rect.bottom + GAP;
  const centre = (rect.left + rect.right) / 2;
  const min = bounds.left + EDGE;
  const max = Math.max(min, bounds.right - EDGE - size.width);
  const left = Math.min(Math.max(centre - size.width / 2, min), max);
  return { top, left, side, arrowX: Math.min(Math.max(centre - left, 12), Math.max(12, size.width - 12)) };
}

/** The selected text, when it is a word or short phrase inside one finished line of `container`. */
function pickSelection(container: HTMLElement, segments: readonly Segment[]): Picked | null {
  const selection = typeof window !== 'undefined' ? window.getSelection() : null;
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const heard = selection.toString().trim().replace(/\s+/g, ' ');
  if (!heard || heard.length > MAX_SELECTION_CHARS || heard.split(' ').length > MAX_SELECTION_WORDS) return null;
  const lineOf = (node: Node | null) =>
    (node instanceof Element ? node : node?.parentElement)?.closest<HTMLElement>('[data-seg-id]') ?? null;
  const line = lineOf(selection.anchorNode);
  if (!line || line !== lineOf(selection.focusNode) || !container.contains(line)) return null;
  const segment = segments.find((s) => s.id === line.dataset.segId);
  if (!segment?.final) return null;
  const r = selection.getRangeAt(0).getBoundingClientRect?.();
  const rect = r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : { top: 0, bottom: 0, left: 0, right: 0 };
  const b = container.getBoundingClientRect();
  return { heard, rect, bounds: { top: b.top, bottom: b.bottom, left: b.left, right: b.right } };
}

/**
 * "Fix this word": select a misheard word in a finished line, press the
 * button that appears beside it, type the right spelling. The word is saved
 * to the word list (Settings › Transcription) with what the transcript showed
 * as how it gets misheard, and the transcript is corrected straight away.
 */
export function FixWordAction({
  containerRef,
  segments,
  onFix,
}: {
  containerRef: RefObject<HTMLElement | null>;
  segments: readonly Segment[];
  onFix: (heard: string, word: string) => void;
}) {
  const t = useT('transcript');
  const [picked, setPicked] = useState<Picked | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const barRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<ToolbarPlacement | null>(null);

  // Measure the toolbar, then place it; it stays hidden until placed.
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!picked || !bar) return setPlacement(null);
    const { width, height } = bar.getBoundingClientRect();
    setPlacement(placeToolbar(picked.rect, picked.bounds, { width, height }));
  }, [picked]);

  useEffect(() => {
    const update = () => {
      const container = containerRef.current;
      setPicked(container ? pickSelection(container, segments) : null);
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, [containerRef, segments]);

  const open = useCallback(() => {
    if (!picked) return;
    setEditing(picked.heard);
    setDraft(picked.heard);
    setPicked(null);
    window.getSelection()?.removeAllRanges();
  }, [picked]);

  const close = useCallback(() => setEditing(null), []);

  const save = useCallback(() => {
    const word = draft.trim();
    if (editing === null || !word) return;
    onFix(editing, word);
    setEditing(null);
  }, [draft, editing, onFix]);

  return (
    <>
      {picked && editing === null && (
        <div
          ref={barRef}
          role="toolbar"
          aria-label={t('fixWord.button')}
          data-side={placement?.side}
          className="fixed z-40 flex items-center rounded-lg border border-border bg-elevation-3 p-0.5 text-foreground shadow-elevation-3 dark:bg-elevation-4"
          style={{ top: placement?.top ?? 0, left: placement?.left ?? 0, visibility: placement ? 'visible' : 'hidden' }}
        >
          <Button
            variant="ghost"
            size="sm"
            // Keep the selection: a mousedown would otherwise clear it before the click.
            onMouseDown={(e) => e.preventDefault()}
            onClick={open}
            leadingIcon={<SpellCheck className="size-3.5" aria-hidden="true" />}
            className="text-foreground"
          >
            {t('fixWord.button')}
          </Button>
          <span
            aria-hidden="true"
            data-testid="fix-word-pointer"
            className={`absolute size-2 -translate-x-1/2 rotate-45 border-border bg-elevation-3 dark:bg-elevation-4 ${
              placement?.side === 'below' ? '-top-1 border-l border-t' : '-bottom-1 border-b border-r'
            }`}
            style={{ left: placement?.arrowX ?? 0 }}
          />
        </div>
      )}
      <Modal
        open={editing !== null}
        onClose={close}
        title={t('fixWord.title')}
        description={t('fixWord.description')}
        size="sm"
        footer={
          <HStack spacing="sm">
            <Button variant="outline" onClick={close}>
              {t('fixWord.cancel')}
            </Button>
            <Button variant="primary" onClick={save} disabled={draft.trim().length === 0}>
              {t('fixWord.save')}
            </Button>
          </HStack>
        }
      >
        <VStack spacing="md" fill>
          <Text size="sm" variant="muted">
            {t('fixWord.says').replace('{heard}', editing ?? '')}
          </Text>
          <FormField id="fix-word-spelling" label={t('fixWord.label')}>
            <Input
              id="fix-word-spelling"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  save();
                }
              }}
              placeholder={t('fixWord.placeholder')}
              autoComplete="off"
              autoFocus
            />
          </FormField>
        </VStack>
      </Modal>
    </>
  );
}

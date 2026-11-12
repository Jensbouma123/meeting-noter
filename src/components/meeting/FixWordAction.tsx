'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
import { Button, FormField, HStack, Input, Modal, Text, VStack } from '@jensbouma123/acciva-ui';
import { SpellCheck } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import type { Segment } from '@/lib/meeting';

/** Longest selection offered for fixing: a word or a short phrase, not a paragraph. */
const MAX_SELECTION_CHARS = 60;
const MAX_SELECTION_WORDS = 5;

interface Picked {
  heard: string;
  /** Where to float the button, in viewport pixels. */
  top: number;
  left: number;
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
  const rect = selection.getRangeAt(0).getBoundingClientRect?.();
  return { heard, top: rect ? rect.top : 0, left: rect ? rect.left + rect.width / 2 : 0 };
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
          className="fixed z-40 -translate-x-1/2 -translate-y-full pb-2"
          style={{ top: picked.top, left: picked.left }}
        >
          <Button
            variant="secondary"
            size="sm"
            // Keep the selection: a mousedown would otherwise clear it before the click.
            onMouseDown={(e) => e.preventDefault()}
            onClick={open}
            leadingIcon={<SpellCheck className="size-3.5" aria-hidden="true" />}
            className="shadow-elevation-2"
          >
            {t('fixWord.button')}
          </Button>
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

'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FixWordDialog } from './FixWordDialog';
import { FixWordToolbar } from './FixWordToolbar';
import { pickSelection } from './pickSelection';
import { placeToolbar } from './placeToolbar';
import type { FixWordActionProps, PickedSelection, ToolbarPlacement } from './FixWordAction.types';

export function FixWordAction({ containerRef, segments, onFix }: FixWordActionProps) {
  const [picked, setPicked] = useState<PickedSelection | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const barRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<ToolbarPlacement | null>(null);

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
      {picked && editing === null && <FixWordToolbar barRef={barRef} placement={placement} onOpen={open} />}
      <FixWordDialog heard={editing} draft={draft} onDraftChange={setDraft} onClose={close} onSave={save} />
    </>
  );
}

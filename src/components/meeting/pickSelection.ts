import type { Segment } from '@/lib/meeting';
import type { PickedSelection } from './FixWordAction.types';

const MAX_SELECTION_CHARS = 60;
const MAX_SELECTION_WORDS = 5;

function segmentLineOf(node: Node | null): HTMLElement | null {
  return (node instanceof Element ? node : node?.parentElement)?.closest<HTMLElement>('[data-seg-id]') ?? null;
}

export function pickSelection(container: HTMLElement, segments: readonly Segment[]): PickedSelection | null {
  const selection = typeof window !== 'undefined' ? window.getSelection() : null;
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const heard = selection.toString().trim().replace(/\s+/g, ' ');
  if (!heard || heard.length > MAX_SELECTION_CHARS || heard.split(' ').length > MAX_SELECTION_WORDS) return null;
  const line = segmentLineOf(selection.anchorNode);
  if (!line || line !== segmentLineOf(selection.focusNode) || !container.contains(line)) return null;
  const segment = segments.find((s) => s.id === line.dataset.segId);
  if (!segment?.final) return null;
  const r = selection.getRangeAt(0).getBoundingClientRect?.();
  const rect = r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : { top: 0, bottom: 0, left: 0, right: 0 };
  const b = container.getBoundingClientRect();
  return { heard, rect, bounds: { top: b.top, bottom: b.bottom, left: b.left, right: b.right } };
}

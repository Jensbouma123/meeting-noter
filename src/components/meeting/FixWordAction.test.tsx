// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Segment } from '@/lib/meeting';
import { FixWordAction, placeToolbar } from './FixWordAction';

const seg = (id: string, text: string, final = true): Segment => ({
  id,
  source: 'mic',
  speaker: 'mic:0',
  text,
  start: 0,
  end: 1,
  final,
});

function Harness({ segments, onFix }: { segments: Segment[]; onFix: (heard: string, word: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref}>
      {segments.map((s) => (
        <div key={s.id} data-seg-id={s.id}>
          <p>{s.text}</p>
        </div>
      ))}
      <FixWordAction containerRef={ref} segments={segments} onFix={onFix} />
    </div>
  );
}

/** Select `word` inside the line `id`, the way a user drags over it. */
function select(container: HTMLElement, id: string, word: string) {
  const text = container.querySelector(`[data-seg-id="${id}"] p`)!.firstChild as Text;
  const at = text.data.indexOf(word);
  const range = document.createRange();
  range.setStart(text, at);
  range.setEnd(text, at + word.length);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });
}

beforeEach(() => {
  // acciva-ui 0.17 Modal is a native <dialog>; jsdom has no showModal/close.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  cleanup();
  window.getSelection()?.removeAllRanges();
});

describe('FixWordAction', () => {
  it('fixes a selected word: type the right spelling, save, and it is handed on with what was heard', () => {
    const onFix = vi.fn();
    const { container } = render(<Harness segments={[seg('a', 'We work at Fromna now.')]} onFix={onFix} />);

    select(container, 'a', 'Fromna');
    fireEvent.click(screen.getByRole('button', { name: /fix this word/i }));

    expect(screen.getByText(/The transcript says “Fromna”/)).toBeInTheDocument();
    const input = screen.getByLabelText(/correct spelling/i);
    expect(input).toHaveValue('Fromna');
    fireEvent.change(input, { target: { value: 'Framna' } });
    fireEvent.click(screen.getByRole('button', { name: /save word/i }));

    expect(onFix).toHaveBeenCalledTimes(1);
    expect(onFix).toHaveBeenCalledWith('Fromna', 'Framna');
  });

  it('saves with Enter as well', () => {
    const onFix = vi.fn();
    const { container } = render(<Harness segments={[seg('a', 'Talk to Hezelar today')]} onFix={onFix} />);
    select(container, 'a', 'Hezelar');
    fireEvent.click(screen.getByRole('button', { name: /fix this word/i }));
    const input = screen.getByLabelText(/correct spelling/i);
    fireEvent.change(input, { target: { value: 'Hezelaer' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onFix).toHaveBeenCalledWith('Hezelar', 'Hezelaer');
  });

  it('offers nothing on a line that is still being heard, or for a long selection', () => {
    const { container } = render(
      <Harness
        segments={[seg('live', 'Fromna is talking', false), seg('long', 'one two three four five six seven')]}
        onFix={vi.fn()}
      />,
    );
    select(container, 'live', 'Fromna');
    expect(screen.queryByRole('button', { name: /fix this word/i })).not.toBeInTheDocument();
    select(container, 'long', 'one two three four five six');
    expect(screen.queryByRole('button', { name: /fix this word/i })).not.toBeInTheDocument();
  });

  it('cancel saves nothing', () => {
    const onFix = vi.fn();
    const { container } = render(<Harness segments={[seg('a', 'At Fromna')]} onFix={onFix} />);
    select(container, 'a', 'Fromna');
    fireEvent.click(screen.getByRole('button', { name: /fix this word/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onFix).not.toHaveBeenCalled();
  });
});

describe('FixWordAction toolbar', () => {
  it('renders an opaque labelled toolbar with the button inside', () => {
    const { container } = render(<Harness segments={[seg('a', 'At Fromna now')]} onFix={vi.fn()} />);
    select(container, 'a', 'Fromna');
    const bar = screen.getByRole('toolbar', { name: /fix this word/i });
    expect(bar.className).toMatch(/bg-elevation-3/);
    expect(bar.className).not.toMatch(/\/\d+/);
    expect(bar.className).toMatch(/border-border/);
    expect(bar).toContainElement(screen.getByRole('button', { name: /fix this word/i }));
  });
});

describe('placeToolbar', () => {
  const bounds = { top: 0, bottom: 600, left: 100, right: 700 };
  const size = { width: 120, height: 32 };

  it('sits above the selection, centred, with a gap', () => {
    const p = placeToolbar({ top: 200, bottom: 218, left: 300, right: 360 }, bounds, size);
    expect(p.side).toBe('above');
    expect(p.top).toBe(200 - 8 - 32);
    expect(p.left).toBe(330 - 60);
    expect(p.arrowX).toBe(60);
    expect(p.top + size.height).toBeLessThanOrEqual(200);
  });

  it('flips below when there is no room above', () => {
    const p = placeToolbar({ top: 20, bottom: 38, left: 300, right: 360 }, bounds, size);
    expect(p.side).toBe('below');
    expect(p.top).toBe(38 + 8);
  });

  it('stays inside the transcript sideways and keeps the pointer on the selection', () => {
    const left = placeToolbar({ top: 200, bottom: 218, left: 102, right: 130 }, bounds, size);
    expect(left.left).toBe(104);
    expect(left.arrowX).toBe(12);
    const right = placeToolbar({ top: 200, bottom: 218, left: 670, right: 698 }, bounds, size);
    expect(right.left + size.width).toBe(696);
    expect(right.arrowX).toBeGreaterThan(60);
  });
});

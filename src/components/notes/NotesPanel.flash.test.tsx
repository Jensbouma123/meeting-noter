// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveInsights } from '@/lib/semantic-search/insights/store';
import { NotesPanel } from './NotesPanel';

const items = [
  {
    id: 'decision:s1:0',
    kind: 'decision' as const,
    text: 'We ship on Friday.',
    segmentId: 's1',
    speakerId: 'mic:0',
    start: 65,
    score: 0.7,
  },
  {
    id: 'action:s2:0',
    kind: 'action' as const,
    text: 'I will send the notes.',
    segmentId: 's2',
    speakerId: 'mic:0',
    start: 90,
    score: 0.7,
  },
];
const scroll = vi.fn();

function mockMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  scroll.mockClear();
  Element.prototype.scrollIntoView = scroll;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{"ok":true}')),
  );
  saveInsights('m1', { version: 2, items, dismissed: [] });
  mockMotion(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe.each([
  ['decision', 'We ship on Friday.'],
  ['action', 'I will send the notes.'],
])('adding a suggested %s', (_kind, text) => {
  it('scrolls to the new row, highlights it, and clears after one second', () => {
    render(<NotesPanel sessionId="m1" />);
    fireEvent.click(screen.getByLabelText(`Accept: ${text}`));
    const row = screen.getByText(new RegExp(text)).closest('li')!;
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
    expect(scroll.mock.contexts[0]).toBe(row);
    expect(row.className).toContain('bg-primary-500/15');
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(row.className).toContain('bg-primary-500/15');
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(row.className).not.toContain('bg-primary-500/15');
  });

  it('scrolls instantly and drops the fade when reduced motion is preferred', () => {
    mockMotion(true);
    render(<NotesPanel sessionId="m1" />);
    fireEvent.click(screen.getByLabelText(`Accept: ${text}`));
    const row = screen.getByText(new RegExp(text)).closest('li')!;
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'nearest' });
    expect(row.className).toContain('bg-primary-500/15');
    expect(row.className).toContain('motion-reduce:transition-none');
  });
});

it('does not highlight rows added manually', () => {
  render(<NotesPanel sessionId="m1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Add decision' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Add decision' }), { target: { value: 'Manual' } });
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Add decision' }), { key: 'Enter' });
  expect(scroll).not.toHaveBeenCalled();
});

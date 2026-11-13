// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Chapter, Hit } from '@/lib/semantic-search/types';
import { ChaptersList } from './ChaptersList';
import { makeSnippet, SearchPanel } from './SearchPanel';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const hit = (meetingId: string, index: number, start: number, text: string): Hit => ({
  meetingId,
  score: 0.9,
  window: { meetingId, index, start, end: start + 30, text },
});

const chapter = (index: number, start: number, end: number, title: string): Chapter => ({
  meetingId: 'm1',
  index,
  start,
  end,
  windowStart: 0,
  windowEnd: 1,
  title,
  terms: [title],
});

describe('makeSnippet', () => {
  it('returns short text unchanged', () => {
    expect(makeSnippet('  hello   world ', 'x')).toBe('hello world');
  });

  it('centres a long text on the first matching term', () => {
    const text = `${'alpha '.repeat(60)}budget review ${'omega '.repeat(60)}`;
    const snip = makeSnippet(text, 'budget', 80);
    expect(snip).toContain('budget');
    expect(snip.startsWith('…')).toBe(true);
    expect(snip.length).toBeLessThanOrEqual(82);
  });

  it('falls back to the start when no term matches', () => {
    const snip = makeSnippet('a'.repeat(300), 'zzz', 50);
    expect(snip).toBe(`${'a'.repeat(50)}…`);
  });
});

describe('SearchPanel', () => {
  it('shows ranked hits with title, timestamp, snippet and session link', async () => {
    const search = vi.fn(async () => [
      hit('m1', 0, 65, 'we agreed on the roadmap'),
      hit('m2', 3, 300, 'roadmap next quarter'),
    ]);
    render(
      <SearchPanel
        search={search}
        meetingTitles={{ m1: 'Planning' }}
        sessionHref={(id, s) => `/sessions/${id}?t=${s}`}
        debounceMs={0}
      />,
    );

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'roadmap' } });

    const results = await screen.findByLabelText('Search results');
    const items = results.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(search).toHaveBeenCalledWith('roadmap', 8);

    expect(screen.getByText('Planning').closest('a')).toHaveAttribute('href', '/sessions/m1?t=65');
    expect(screen.getByText('m2').closest('a')).toHaveAttribute('href', '/sessions/m2?t=300');
    expect(screen.getByText('01:05 · 01:35')).toBeInTheDocument();
    expect(screen.getByText('we agreed on the roadmap')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    render(
      <SearchPanel search={async () => []} sessionHref={() => '#'} debounceMs={0} />,
    );
    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'nope' } });
    expect(await screen.findByText('No matches')).toBeInTheDocument();
  });

  it('returns to the idle view when the query is cleared, dropping the old results', async () => {
    const search = vi.fn(async () => [hit('m1', 0, 0, 'roadmap item')]);
    render(<SearchPanel search={search} sessionHref={() => '#'} debounceMs={0} />);
    const input = screen.getByLabelText('Search query');

    fireEvent.change(input, { target: { value: 'roadmap' } });
    expect(await screen.findByText('roadmap item')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '' } });
    expect(screen.queryByLabelText('Search results')).not.toBeInTheDocument();
    expect(screen.queryByText('No matches')).not.toBeInTheDocument();
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument();
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('does not query for a blank input', () => {
    const search = vi.fn(async () => []);
    render(<SearchPanel search={search} sessionHref={() => '#'} debounceMs={0} />);
    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: '   ' } });
    expect(search).not.toHaveBeenCalled();
  });

  it('shows an error when the search rejects', async () => {
    render(
      <SearchPanel
        search={async () => {
          throw new Error('index not ready');
        }}
        sessionHref={() => '#'}
        debounceMs={0}
      />,
    );
    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'x' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('index not ready');
  });

  it('drops a stale response when a newer query has been issued', async () => {
    const resolvers: Record<string, (h: Hit[]) => void> = {};
    const search = vi.fn(
      (q: string) => new Promise<Hit[]>((resolve) => (resolvers[q] = resolve)),
    );
    render(<SearchPanel search={search} sessionHref={() => '#'} debounceMs={0} />);
    const input = screen.getByLabelText('Search query');

    fireEvent.change(input, { target: { value: 'first' } });
    await waitFor(() => expect(search).toHaveBeenCalledWith('first', 8));
    fireEvent.change(input, { target: { value: 'second' } });
    await waitFor(() => expect(search).toHaveBeenCalledWith('second', 8));

    await act(async () => {
      resolvers.second([hit('m2', 0, 0, 'second result')]);
    });
    await act(async () => {
      resolvers.first([hit('m1', 0, 0, 'first result')]);
    });

    expect(screen.getByText('second result')).toBeInTheDocument();
    expect(screen.queryByText('first result')).not.toBeInTheDocument();
  });
});

describe('ChaptersList', () => {
  it('renders chapters with time ranges and seeks on click', () => {
    const onSeek = vi.fn();
    render(
      <ChaptersList
        chapters={[chapter(0, 0, 120, 'budget · hiring'), chapter(1, 120, 300, 'launch')]}
        onSeek={onSeek}
      />,
    );

    expect(screen.getByText('00:00 – 02:00')).toBeInTheDocument();
    expect(screen.getByText('launch')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Chapter 2: launch/ }));
    expect(onSeek).toHaveBeenCalledWith(120);
  });

  it('shows an empty state with no chapters', () => {
    render(<ChaptersList chapters={[]} onSeek={() => {}} />);
    expect(screen.getByText('No chapters')).toBeInTheDocument();
  });
});

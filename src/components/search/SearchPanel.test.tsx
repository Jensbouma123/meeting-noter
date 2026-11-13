// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Hit } from '@/lib/semantic-search/types';
import { SearchPanel } from './SearchPanel';
import { hit } from './fixtures';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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

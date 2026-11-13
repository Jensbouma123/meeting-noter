// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import { hit } from './fixtures';
import { LibrarySearch } from './LibrarySearch';

const searchLibrary = vi.fn();
vi.mock('@/lib/semantic-search/library-search', () => ({ searchLibrary: (...a: unknown[]) => searchLibrary(...a) }));

afterEach(cleanup);

const sessions = [{ sessionId: 'm1', title: 'Planning' }] as SessionMetadata[];

describe('LibrarySearch', () => {
  it('links hits to the session with ?t=', async () => {
    searchLibrary.mockResolvedValue([hit('m1', 0, 65.4, 'roadmap talk')]);
    render(<LibrarySearch sessions={sessions} progress={null} />);
    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'roadmap' } });
    const link = (await screen.findByText('Planning', {}, { timeout: 2000 })).closest('a');
    expect(link).toHaveAttribute('href', '/sessions/m1?t=65');
  });

  it('shows indexing progress', () => {
    render(<LibrarySearch sessions={sessions} progress={{ total: 5, done: 2, failed: 0, aborted: false }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Indexing meetings… 2/5');
  });

  it('shows done state', () => {
    render(<LibrarySearch sessions={sessions} progress={{ total: 5, done: 5, failed: 0, aborted: false }} />);
    expect(screen.getByRole('status')).toHaveTextContent('All meetings are searchable');
  });
});

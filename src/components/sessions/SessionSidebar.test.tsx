// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import { SessionSidebar } from './SessionSidebar';
import { draft } from './rail/test-support/draftSession';

const state = vi.hoisted(() => ({ sessions: [] as SessionMetadata[], meetingFolders: {} as Record<string, string | null> }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('./rail/useBackfillIndex', () => ({ useBackfillIndex: () => {} }));
vi.mock('./rail/useSessionIndex', () => ({ useSessionIndex: () => ({ sessions: state.sessions, remove: vi.fn(), clear: vi.fn() }) }));
vi.mock('./rail/useFolderSuggestions', () => ({ useFolderSuggestions: () => ({}) }));
vi.mock('./rail/useOnDemandSuggestion', () => ({ useOnDemandSuggestion: () => ({ views: {}, pendingId: null, suggest: vi.fn() }) }));
vi.mock('./rail/useSessionSearch', () => ({ useSessionSearch: () => ({ query: '', setQuery: vi.fn(), searching: false, groups: [] }) }));
vi.mock('./folders/useFolderController', () => ({
  useFolderController: () => ({ meetingFolders: state.meetingFolders, folders: [], requestMove: vi.fn() }),
}));
vi.mock('./rail/RailHeader', () => ({ RailHeader: () => null }));
vi.mock('./rail/RailSearch', () => ({ RailSearch: () => null }));
vi.mock('./rail/DeleteSessionDialog', () => ({ DeleteSessionDialog: () => null }));
vi.mock('./rail/ClearTranscriptDialog', () => ({ ClearTranscriptDialog: () => null }));
vi.mock('./rail/CollapsedRail', () => ({ CollapsedRail: () => null }));
vi.mock('./rail/RailBody', () => ({
  RailBody: ({ sessions, renderRow }: { sessions: SessionMetadata[]; renderRow: (s: SessionMetadata) => ReactNode }) => <>{sessions.map((s) => renderRow(s))}</>,
}));

afterEach(() => {
  cleanup();
  state.sessions = [];
  state.meetingFolders = {};
});

function renderSidebarWith(session: SessionMetadata) {
  state.sessions = [session];
  return render(<SessionSidebar activeSessionId={null} onOpenSession={vi.fn()} onNewSession={vi.fn()} open onToggle={vi.fn()} />);
}

describe('SessionSidebar Suggest folder', () => {
  it('hides "Suggest folder" for a meeting that is already in a folder', () => {
    state.meetingFolders = { 'sess-1': 'folder-a' };
    renderSidebarWith({ ...draft(), sessionId: 'sess-1' });
    fireEvent.click(screen.getByRole('button', { name: 'More actions for “Standup”' }));
    expect(screen.queryByRole('menuitem', { name: 'Suggest folder', hidden: true })).toBeNull();
  });

  it('shows "Suggest folder" for a meeting that is not in a folder', () => {
    state.meetingFolders = {};
    renderSidebarWith({ ...draft(), sessionId: 'sess-1' });
    fireEvent.click(screen.getByRole('button', { name: 'More actions for “Standup”' }));
    expect(screen.getByRole('menuitem', { name: 'Suggest folder', hidden: true })).toBeInTheDocument();
  });
});

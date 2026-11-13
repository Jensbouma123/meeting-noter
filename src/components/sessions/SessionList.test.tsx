// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SessionMetadata } from '@/lib/meeting/session-store';
import { getRailBadgeState, RailSessionRow } from './SessionList';
import {
  bindTranscriptSession,
  clearIdleSession,
  setState,
} from '@/lib/meeting/store';

const draft = (overrides: Partial<SessionMetadata> = {}): SessionMetadata => ({
  sessionId: 'sess-1',
  title: 'Standup',
  segmentCount: 0,
  durationSeconds: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isDraft: true,
  ...overrides,
});

const noop = () => {};

function row(session: SessionMetadata) {
  return (
    <RailSessionRow session={session} isActive onOpen={noop} onClear={noop} onDelete={noop} />
  );
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  act(() => {
    setState({ status: 'idle' });
    clearIdleSession();
    bindTranscriptSession(null);
  });
  vi.unstubAllGlobals();
  cleanup();
});

describe('getRailBadgeState', () => {
  it('prefers recording over the draft flag while capturing', () => {
    expect(getRailBadgeState(draft(), true)).toBe('recording');
  });

  it('shows the draft badge only when not recording', () => {
    expect(getRailBadgeState(draft(), false)).toBe('draft');
  });

  it('shows no badge for a recorded session', () => {
    expect(
      getRailBadgeState(draft({ isDraft: false, segmentCount: 2, durationSeconds: 65 }), false),
    ).toBe('none');
  });
});

describe('RailSessionRow more menu', () => {
  function openMenu(sessionTitle: string) {
    fireEvent.click(screen.getByRole('button', { name: `More actions for “${sessionTitle}”` }));
  }

  it('hides "Open" for the meeting that is currently open', () => {
    render(row(draft()));
    openMenu('Standup');
    expect(screen.getByRole('menuitem', { name: 'Clear transcript', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete meeting', hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Open', hidden: true })).toBeNull();
  });

  it('keeps "Open" for a meeting that is not currently open', () => {
    render(
      <RailSessionRow session={draft()} isActive={false} onOpen={noop} onClear={noop} onDelete={noop} />,
    );
    openMenu('Standup');
    expect(screen.getByRole('menuitem', { name: 'Open', hidden: true })).toBeInTheDocument();
  });
});

describe('RailSessionRow recording badge', () => {
  it('shows "Not recorded" for a draft that is not recording', () => {
    render(row(draft()));
    expect(screen.getByText('Not recorded')).toBeInTheDocument();
    expect(screen.queryByText('Recording')).toBeNull();
  });

  it('shows a recording state while the session is being recorded', () => {
    const { rerender } = render(row(draft()));
    expect(screen.getByText('Not recorded')).toBeInTheDocument();
    act(() => {
      bindTranscriptSession('sess-1');
      setState({ status: 'live' });
    });
    rerender(row(draft()));
    expect(screen.getByText('Recording')).toBeInTheDocument();
    expect(screen.queryByText('Not recorded')).toBeNull();
  });

  it('shows the duration like other rows after stopping', () => {
    const { rerender } = render(row(draft()));
    act(() => {
      bindTranscriptSession('sess-1');
      setState({ status: 'live' });
    });
    rerender(row(draft()));
    expect(screen.getByText('Recording')).toBeInTheDocument();
    // Stop: the refreshed index entry carries the duration.
    act(() => {
      setState({ status: 'idle' });
    });
    rerender(row(draft({ isDraft: false, segmentCount: 2, durationSeconds: 65 })));
    expect(screen.queryByText('Recording')).toBeNull();
    expect(screen.queryByText('Not recorded')).toBeNull();
    expect(screen.getByText(/· 01:05$/)).toBeInTheDocument();
  });
});

describe('RailSessionRow folder path in search', () => {
  it('shows the folder path ahead of the time and duration', () => {
    render(
      <RailSessionRow session={draft({ isDraft: false, segmentCount: 2, durationSeconds: 65 })} isActive={false} onOpen={noop} onClear={noop} onDelete={noop} pathLabel="Work / Q1" />,
    );
    expect(screen.getByText(/^Work \/ Q1 · /)).toBeInTheDocument();
  });

  it('shows no path when the meeting is unfiled', () => {
    render(
      <RailSessionRow session={draft({ isDraft: false, segmentCount: 2, durationSeconds: 65 })} isActive={false} onOpen={noop} onClear={noop} onDelete={noop} />,
    );
    expect(screen.queryByText(/\//)).toBeNull();
  });
});

describe('RailSessionRow leading icon', () => {
  it('renders a muted pencil icon for drafts and no leading audio icon for recorded sessions', () => {
    const { container, rerender } = render(
      <RailSessionRow session={draft({ isDraft: true })} isActive={false} onOpen={noop} onClear={noop} onDelete={noop} />,
    );
    expect(container.querySelector('.text-muted-foreground svg')).not.toBeNull();
    expect(container.querySelector('.text-primary-600')).toBeNull();

    rerender(
      <RailSessionRow
        session={draft({ isDraft: false, segmentCount: 2, durationSeconds: 65, captureMode: 'mic' })}
        isActive={false}
        onOpen={noop}
        onClear={noop}
        onDelete={noop}
      />,
    );
    expect(container.querySelector('.text-muted-foreground svg')).toBeNull();
    expect(container.querySelector('.text-primary-600')).toBeNull();
    expect(screen.queryByText('Microphone')).toBeNull();
  });
});

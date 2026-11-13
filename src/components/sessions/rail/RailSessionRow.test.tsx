// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import { bindTranscriptSession } from '@/lib/meeting/transcript-session';
import { clearIdleSession } from '@/lib/meeting/session-reset';
import { setState } from '@/lib/meeting/store-core';
import { RailSessionRow } from './RailSessionRow';
import { draft, recorded } from './test-support/draftSession';

const noop = () => {};

function row(session: SessionMetadata, props: { isActive?: boolean; pathLabel?: string } = {}) {
  return <RailSessionRow session={session} isActive={props.isActive ?? true} onOpen={noop} onClear={noop} onDelete={noop} pathLabel={props.pathLabel} />;
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

describe('RailSessionRow more menu', () => {
  const openMenu = (sessionTitle: string) => fireEvent.click(screen.getByRole('button', { name: `More actions for “${sessionTitle}”` }));

  it('hides "Open" for the meeting that is currently open', () => {
    render(row(draft()));
    openMenu('Standup');
    expect(screen.getByRole('menuitem', { name: 'Clear transcript', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete meeting', hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Open', hidden: true })).toBeNull();
  });

  it('keeps "Open" for a meeting that is not currently open', () => {
    render(row(draft(), { isActive: false }));
    openMenu('Standup');
    expect(screen.getByRole('menuitem', { name: 'Open', hidden: true })).toBeInTheDocument();
  });

  it('opens the same menu on right-click after the press is released and suppresses the native context menu', async () => {
    render(row(draft(), { isActive: false }));
    const target = screen.getByRole('button', { name: 'More actions for “Standup”' }).closest('.group') as HTMLElement;
    const notPrevented = fireEvent.contextMenu(target);
    expect(notPrevented).toBe(false);
    expect(screen.queryByRole('menuitem', { name: 'Open', hidden: true })).toBeNull();
    fireEvent.pointerUp(window);
    expect(await screen.findByRole('menuitem', { name: 'Open', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete meeting', hidden: true })).toBeInTheDocument();
  });

  it('still opens the right-click menu when no release event follows', async () => {
    render(row(draft(), { isActive: false }));
    const target = screen.getByRole('button', { name: 'More actions for “Standup”' }).closest('.group') as HTMLElement;
    fireEvent.contextMenu(target);
    expect(await screen.findByRole('menuitem', { name: 'Open', hidden: true }, { timeout: 1500 })).toBeInTheDocument();
  });
});

describe('RailSessionRow recording badge', () => {
  const startRecording = () =>
    act(() => {
      bindTranscriptSession('sess-1');
      setState({ status: 'live' });
    });

  it('shows "Not recorded" for a draft that is not recording', () => {
    render(row(draft()));
    expect(screen.getByText('Not recorded')).toBeInTheDocument();
    expect(screen.queryByText('Recording')).toBeNull();
  });

  it('shows a recording state while the session is being recorded', () => {
    const { rerender } = render(row(draft()));
    expect(screen.getByText('Not recorded')).toBeInTheDocument();
    startRecording();
    rerender(row(draft()));
    expect(screen.getByText('Recording')).toBeInTheDocument();
    expect(screen.queryByText('Not recorded')).toBeNull();
  });

  it('shows the duration like other rows after stopping', () => {
    const { rerender } = render(row(draft()));
    startRecording();
    rerender(row(draft()));
    expect(screen.getByText('Recording')).toBeInTheDocument();
    act(() => {
      setState({ status: 'idle' });
    });
    rerender(row(recorded()));
    expect(screen.queryByText('Recording')).toBeNull();
    expect(screen.queryByText('Not recorded')).toBeNull();
    expect(screen.getByText(/· 01:05$/)).toBeInTheDocument();
  });
});

describe('RailSessionRow folder path in search', () => {
  it('shows the folder path ahead of the time and duration', () => {
    render(row(recorded(), { isActive: false, pathLabel: 'Work / Q1' }));
    expect(screen.getByText(/^Work \/ Q1 · /)).toBeInTheDocument();
  });

  it('shows no path when the meeting is unfiled', () => {
    render(row(recorded(), { isActive: false }));
    expect(screen.queryByText(/\//)).toBeNull();
  });
});

describe('RailSessionRow leading icon', () => {
  it('renders a muted pencil icon for drafts and no leading audio icon for recorded sessions', () => {
    const { container, rerender } = render(row(draft({ isDraft: true }), { isActive: false }));
    expect(container.querySelector('.text-muted-foreground svg')).not.toBeNull();
    expect(container.querySelector('.text-primary-600')).toBeNull();

    rerender(row(recorded({ captureMode: 'mic' }), { isActive: false }));
    expect(container.querySelector('.text-muted-foreground svg')).toBeNull();
    expect(container.querySelector('.text-primary-600')).toBeNull();
    expect(screen.queryByText('Microphone')).toBeNull();
  });
});

describe('RailSessionRow folder suggestion', () => {
  it('shows the chip next to the meeting row and runs accept and decline', () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    render(<RailSessionRow session={draft()} isActive={false} onOpen={noop} onClear={noop} onDelete={noop} suggestion={{ folderLabel: 'Clients / Acme', onAccept, onDecline }} />);
    expect(screen.getByText('Standup')).toBeInTheDocument();
    const label = screen.getByText('Suggested folder: Clients / Acme', { exact: true });
    expect(label).toBeInTheDocument();
    expect(label).not.toHaveClass('truncate');
    const accept = screen.getByRole('button', { name: 'Move' });
    const decline = screen.getByRole('button', { name: 'No thanks' });
    expect(accept).toHaveTextContent('');
    expect(decline).toHaveTextContent('');
    expect(accept).toHaveAttribute('aria-label', 'Move');
    expect(decline).toHaveAttribute('aria-label', 'No thanks');
    fireEvent.click(accept);
    fireEvent.click(decline);
    expect([onAccept.mock.calls.length, onDecline.mock.calls.length]).toEqual([1, 1]);
  });

  it('shows no chip without a suggestion', () => {
    render(row(draft()));
    expect(screen.queryByTestId('folder-suggestion')).toBeNull();
  });
});

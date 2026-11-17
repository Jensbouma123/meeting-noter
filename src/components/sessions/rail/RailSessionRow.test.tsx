// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { bindTranscriptSession } from '@/lib/meeting/transcript-session';
import { setState } from '@/lib/meeting/store-core';
import { draft, recorded } from './test-support/draftSession';
import { installRailRowLifecycle, row } from './RailSessionRow.testSupport';

installRailRowLifecycle();

describe('RailSessionRow more menu', () => {
  const openMenu = (sessionTitle: string) =>
    fireEvent.click(screen.getByRole('button', { name: `More actions for “${sessionTitle}”` }));

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

  it('shows the "Not recorded" label for a draft that is not recording', () => {
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

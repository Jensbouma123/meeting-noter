// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import { FolderTree } from './FolderTree';
import { useFolderController } from './useFolderController';
import { fake, installFakeFolderServer, mutations } from './test-support/fakeFolderServer';
import { renderTree, renderTreeWith } from './test-support/FolderHarness';
import { dragStart, draggableRow } from './test-support/interactions';
import { folder, session, sessions } from './test-support/fixtures';

beforeEach(installFakeFolderServer);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FolderTree', () => {
  it('renders nested folders with the filed meeting and collapses', async () => {
    renderTree();
    expect(await screen.findByText('Standup')).toBeInTheDocument();
    expect(screen.getByText('Q1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Work/, expanded: true }));
    expect(screen.queryByText('Q1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Work/, expanded: false }));
    expect(screen.getByText('Q1')).toBeInTheDocument();
  });

  it('shows the meeting count badge on a folder with filed meetings', async () => {
    renderTree();
    const q1 = await screen.findByRole('button', { name: /^Q1/ });
    expect(within(q1).getByText('1')).toBeInTheDocument();
  });

  it('keeps empty folders visible when there are no meetings', async () => {
    fake.server.meetings = {};
    renderTreeWith([]);
    expect(await screen.findByRole('button', { name: /^Work/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Q1/ })).toBeInTheDocument();
  });

  it('moves a meeting onto a folder by mouse drop', async () => {
    fake.server.meetings.m1 = null;
    renderTree();
    const dataTransfer = dragStart(draggableRow(await screen.findByText('Standup')));
    fireEvent.drop(draggableRow(screen.getByRole('button', { name: /^Work/ })), { dataTransfer });
    await waitFor(() => expect(mutations('PUT')[0]?.body).toBe(JSON.stringify({ folderId: 'a' })));
  });

  it('expands a collapsed folder after a drag hover so it can receive a drop', async () => {
    fake.server.meetings.m1 = null;
    renderTree();
    const work = await screen.findByRole('button', { name: /^Work/ });
    fireEvent.click(work);
    const dataTransfer = dragStart(draggableRow(screen.getByText('Standup')));
    const target = draggableRow(work);
    fireEvent.dragOver(target, { dataTransfer });
    await new Promise((resolve) => setTimeout(resolve, 650));
    expect(screen.getByText('Q1')).toBeInTheDocument();
    fireEvent.drop(target, { dataTransfer });
    await waitFor(() => expect(mutations('PUT')[0]?.body).toBe(JSON.stringify({ folderId: 'a' })));
  });

  it('has no root drop zone', async () => {
    renderTree();
    await screen.findByText('Standup');
    expect(screen.queryByText('Top level')).toBeNull();
  });

  it('reorders sibling folders live while dragging and persists the position', async () => {
    fake.server.folders.push(folder('c', null, 'Home'));
    renderTree();
    const work = draggableRow(await screen.findByRole('button', { name: /^Work/ }));
    const home = draggableRow(screen.getByRole('button', { name: /^Home/ }));
    const dataTransfer = dragStart(work);
    fireEvent.dragOver(home, { dataTransfer });
    const names = () => screen.getAllByRole('button', { name: /^(Work|Home)/ }).map((b) => b.textContent);
    await waitFor(() => expect(names()).toEqual(['Home', 'Work']));
    fireEvent.drop(home, { dataTransfer });
    fireEvent.dragEnd(work, { dataTransfer });
    await waitFor(() => expect(mutations('PATCH')[0]?.body).toBe(JSON.stringify({ index: 1 })));
    expect(mutations('PUT')).toHaveLength(0);
  });

  it('shows five meetings per folder, newest first, and loads ten more on demand', async () => {
    const many = Array.from({ length: 17 }, (_, i) => ({ ...session, sessionId: `s${i}`, title: `Meet ${i}`, createdAt: i }) as SessionMetadata);
    fake.server.meetings = Object.fromEntries(many.map((m) => [m.sessionId, 'b']));
    renderTreeWith(many);
    await screen.findByText('Meet 16');
    expect(screen.getAllByText(/^Meet \d+$/).map((e) => e.textContent)).toEqual(['Meet 16', 'Meet 15', 'Meet 14', 'Meet 13', 'Meet 12']);
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(screen.getAllByText(/^Meet \d+$/)).toHaveLength(15);
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(screen.getAllByText(/^Meet \d+$/)).toHaveLength(17);
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });

  it('refuses to move a folder into its own descendant by drop', async () => {
    renderTree();
    const dataTransfer = dragStart(draggableRow(await screen.findByRole('button', { name: /^Work/ })));
    fireEvent.drop(draggableRow(screen.getByRole('button', { name: /^Q1/ })), { dataTransfer });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mutations('PATCH')).toHaveLength(0);
  });

  it('calls onNewSession with the folder id and expands a collapsed folder when + is clicked', async () => {
    const onNewSession = vi.fn();
    function NewSessionHarness() {
      const ctl = useFolderController(sessions);
      return <FolderTree controller={ctl} sessions={sessions} renderSession={(s) => <span>{s.title}</span>} onNewSession={onNewSession} />;
    }
    render(<ToastProvider><NewSessionHarness /></ToastProvider>);
    await screen.findByText('Q1');
    fireEvent.click(screen.getByRole('button', { name: 'Work' }));
    expect(screen.queryByText('Q1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'New meeting in “Work”' }));
    expect(onNewSession).toHaveBeenCalledWith('a');
    expect(screen.getByText('Q1')).toBeInTheDocument();
  });
});

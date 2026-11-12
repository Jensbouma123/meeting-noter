// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { FolderRow } from '@/lib/meeting-db/types';
import type { SessionMetadata } from '@/lib/meeting/session-store';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { FolderTree, useFolderController } from './FolderSection';

const folder = (id: string, parentId: string | null, name: string): FolderRow => ({ id, parentId, name, sort: 0, createdAt: 0, updatedAt: 0 });
const folders = [folder('a', null, 'Work'), folder('b', 'a', 'Q1')];
const session = { sessionId: 'm1', title: 'Standup', segmentCount: 1, durationSeconds: 5, createdAt: 1, updatedAt: 1 } as SessionMetadata;
const sessions = [session];

const calls: { url: string; method: string; body?: string }[] = [];
beforeEach(() => {
  HTMLDialogElement.prototype.showModal ||= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ||= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
  calls.length = 0;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined });
    const ok = (b: object) => new Response(JSON.stringify({ ok: true, ...b }));
    if (url === '/api/folders' && !init?.method) return ok({ folders });
    if (url === '/api/meetings') return ok({ meetings: [{ id: 'm1', folderId: 'b' }] });
    return ok({ folder: folder('n', null, 'New folder') });
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Harness() {
  const ctl = useFolderController(sessions);
  return (
    <>
      <FolderTree controller={ctl} sessions={sessions} renderSession={(s) => <span>{s.title}</span>} />
      {ctl.dialogs}
    </>
  );
}

describe('FolderTree', () => {
  it('renders nested folders with the filed meeting and collapses', async () => {
    render(<ToastProvider><Harness /></ToastProvider>);
    expect(await screen.findByText('Standup')).toBeInTheDocument();
    expect(screen.getByText('Q1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Collapse Work/ }));
    expect(screen.queryByText('Q1')).toBeNull();
  });

  it('moves a folder through the keyboard Move to… picker', async () => {
    render(<ToastProvider><Harness /></ToastProvider>);
    await screen.findByText('Q1');
    fireEvent.click(screen.getByRole('button', { name: /Actions for “Q1”/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move to…', hidden: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Top level' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH' && c.url === '/api/folders/b' && c.body === JSON.stringify({ parentId: null }))).toBe(true));
  });

  it('offers move-up vs delete-contents when deleting', async () => {
    render(<ToastProvider><Harness /></ToastProvider>);
    await screen.findByText('Q1');
    fireEvent.click(screen.getByRole('button', { name: /Actions for “Work”/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete folder', hidden: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Move contents up to parent folder' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/folders/a?mode=move-up')).toBe(true));
  });
});

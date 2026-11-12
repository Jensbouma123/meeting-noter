// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { FolderRow } from '@/lib/meeting-db/types';
import type { SessionMetadata } from '@/lib/meeting/session-store';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { FolderTree, useFolderController } from './FolderSection';

const folder = (id: string, parentId: string | null, name: string): FolderRow => ({ id, parentId, name, sort: 0, createdAt: 0, updatedAt: 0 });
const session = { sessionId: 'm1', title: 'Standup', segmentCount: 1, durationSeconds: 5, createdAt: 1, updatedAt: 1 } as SessionMetadata;
const sessions = [session];

/* A small in-memory stand-in for the folder routes, so refreshes after a mutation see the change. */
interface Server {
  folders: FolderRow[];
  meetings: Record<string, string | null>;
  nextId: number;
}
let server: Server;
let calls: { url: string; method: string; body?: string }[];

const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function handle(url: string, init?: RequestInit): Response {
  const method = init?.method ?? 'GET';
  const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {};
  const [path, query] = url.split('?');
  if (path === '/api/folders' && method === 'GET') return json(200, { ok: true, folders: server.folders });
  if (path === '/api/folders' && method === 'POST') {
    const f = folder(`n${server.nextId++}`, (body.parentId as string | null) ?? null, String(body.name));
    server.folders.push(f);
    return json(201, { ok: true, folder: f });
  }
  if (path === '/api/meetings' && method === 'GET') {
    return json(200, { ok: true, meetings: Object.entries(server.meetings).map(([id, folderId]) => ({ id, folderId })) });
  }
  const folderMatch = /^\/api\/folders\/([^/]+)$/.exec(path);
  if (folderMatch && method === 'PATCH') {
    const f = server.folders.find((x) => x.id === folderMatch[1]);
    if (!f) return json(404, { ok: false, error: 'not-found' });
    if ('name' in body) f.name = String(body.name);
    if ('parentId' in body) f.parentId = body.parentId as string | null;
    return json(200, { ok: true, folder: f });
  }
  if (folderMatch && method === 'DELETE') {
    const id = folderMatch[1];
    const mode = new URLSearchParams(query).get('mode') ?? 'move-up';
    const target = server.folders.find((x) => x.id === id);
    if (!target) return json(404, { ok: false, error: 'not-found' });
    const subtree = new Set([id]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const f of server.folders) {
        if (f.parentId && subtree.has(f.parentId) && !subtree.has(f.id)) {
          subtree.add(f.id);
          grew = true;
        }
      }
    }
    const affected = Object.entries(server.meetings).filter(([, fid]) => fid && subtree.has(fid));
    if (mode === 'delete-contents') {
      for (const [mid] of affected) delete server.meetings[mid];
    } else {
      for (const [mid] of affected) server.meetings[mid] = target.parentId;
      for (const f of server.folders) if (f.parentId === id) f.parentId = target.parentId;
    }
    server.folders = server.folders.filter((x) => !subtree.has(x.id) || (mode === 'move-up' && x.id !== id));
    return json(200, { ok: true, deleted: { folders: subtree.size, meetings: mode === 'delete-contents' ? affected.length : 0 } });
  }
  return json(404, { ok: false, error: 'not-found' });
}

beforeEach(() => {
  HTMLDialogElement.prototype.showModal ||= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ||= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
  server = {
    folders: [folder('a', null, 'Work'), folder('b', 'a', 'Q1')],
    meetings: { m1: 'b' },
    nextId: 1,
  };
  calls = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined });
    return handle(url, init);
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

const renderTree = () => render(<ToastProvider><Harness /></ToastProvider>);
const mutations = (method: string) => calls.filter((c) => c.method === method);
const openActions = (name: string) => fireEvent.click(screen.getByRole('button', { name: `Actions for folder “${name}”` }));
const pick = async (label: string) => fireEvent.click(await screen.findByRole('menuitem', { name: label, hidden: true }));

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

  it('creates a top-level folder with the default name and opens it for rename', async () => {
    renderTree();
    await screen.findByText('Q1');
    fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
    const input = await screen.findByRole('textbox', { name: 'Folder name' });
    expect(input).toHaveValue('New folder');
    expect(mutations('POST')[0]).toMatchObject({ url: '/api/folders', body: JSON.stringify({ name: 'New folder', parentId: null }) });
  });

  it('creates a nested folder under the chosen parent', async () => {
    renderTree();
    await screen.findByText('Q1');
    openActions('Work');
    await pick('New subfolder');
    await waitFor(() => expect(mutations('POST')).toHaveLength(1));
    expect(mutations('POST')[0].body).toBe(JSON.stringify({ name: 'New folder', parentId: 'a' }));
    expect(await screen.findByRole('textbox', { name: 'Folder name' })).toBeInTheDocument();
  });

  it('renames inline with F2 and commits on Enter', async () => {
    renderTree();
    const q1 = await screen.findByRole('button', { name: /^Q1/ });
    fireEvent.keyDown(q1, { key: 'F2' });
    const input = await screen.findByRole('textbox', { name: 'Folder name' });
    expect(input).toHaveValue('Q1');
    fireEvent.change(input, { target: { value: '  Q2 plan  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(mutations('PATCH')).toHaveLength(1));
    expect(mutations('PATCH')[0]).toMatchObject({ url: '/api/folders/b', body: JSON.stringify({ name: '  Q2 plan  ' }) });
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Folder name' })).toBeNull());
  });

  it('renames from the actions menu', async () => {
    renderTree();
    await screen.findByText('Q1');
    openActions('Q1');
    await pick('Rename');
    const input = await screen.findByRole('textbox', { name: 'Folder name' });
    fireEvent.change(input, { target: { value: 'Retro' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(mutations('PATCH')[0]?.body).toBe(JSON.stringify({ name: 'Retro' })));
  });

  it('commits a rename when the field loses focus', async () => {
    renderTree();
    fireEvent.keyDown(await screen.findByRole('button', { name: /^Q1/ }), { key: 'F2' });
    const input = await screen.findByRole('textbox', { name: 'Folder name' });
    fireEvent.change(input, { target: { value: 'Retro' } });
    fireEvent.blur(input);
    await waitFor(() => expect(mutations('PATCH')[0]?.body).toBe(JSON.stringify({ name: 'Retro' })));
  });

  it('shows the rename field for a new subfolder even when its parent is collapsed', async () => {
    renderTree();
    await screen.findByText('Q1');
    fireEvent.click(screen.getByRole('button', { name: /^Work/, expanded: true }));
    openActions('Work');
    await pick('New subfolder');
    await waitFor(() => expect(mutations('POST')).toHaveLength(1));
    expect(await screen.findByRole('textbox', { name: 'Folder name' })).toBeVisible();
  });

  it('cancels a rename with Escape without calling the API', async () => {
    renderTree();
    const q1 = await screen.findByRole('button', { name: /^Q1/ });
    fireEvent.keyDown(q1, { key: 'F2' });
    const input = await screen.findByRole('textbox', { name: 'Folder name' });
    fireEvent.change(input, { target: { value: 'Discarded' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Folder name' })).toBeNull());
    expect(mutations('PATCH')).toHaveLength(0);
    expect(screen.getByText('Q1')).toBeInTheDocument();
  });

  it('does not call the API when the rename is blank or unchanged', async () => {
    renderTree();
    const q1 = await screen.findByRole('button', { name: /^Q1/ });
    fireEvent.keyDown(q1, { key: 'F2' });
    const input = await screen.findByRole('textbox', { name: 'Folder name' });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Folder name' })).toBeNull());
    fireEvent.keyDown(screen.getByRole('button', { name: /^Q1/ }), { key: 'F2' });
    const again = await screen.findByRole('textbox', { name: 'Folder name' });
    fireEvent.keyDown(again, { key: 'Enter' });
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Folder name' })).toBeNull());
    expect(mutations('PATCH')).toHaveLength(0);
  });

  it('moves a folder through the keyboard Move to… picker', async () => {
    renderTree();
    await screen.findByText('Q1');
    openActions('Q1');
    await pick('Move to…');
    const dialog = await screen.findByRole('list', { name: 'Move “Q1” to…' });
    expect(within(dialog).getByRole('button', { name: /Work/ })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Top level' }));
    await waitFor(() => expect(mutations('PATCH')[0]?.body).toBe(JSON.stringify({ parentId: null })));
  });

  it('marks the current parent as disabled in the Move to… picker', async () => {
    renderTree();
    await screen.findByText('Q1');
    openActions('Q1');
    await pick('Move to…');
    const list = await screen.findByRole('list', { name: 'Move “Q1” to…' });
    const current = within(list).getByRole('button', { name: /Work/ });
    expect(current).toBeDisabled();
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(within(list).getByRole('button', { name: /Top level/ })).not.toBeDisabled();
  });

  it('leaves a folder’s own subtree out of its Move to… picker', async () => {
    renderTree();
    await screen.findByText('Q1');
    openActions('Work');
    await pick('Move to…');
    const list = await screen.findByRole('list', { name: 'Move “Work” to…' });
    expect(within(list).queryByRole('button', { name: /^Q1/ })).toBeNull();
    expect(within(list).getByRole('button', { name: /Top level/ })).toBeInTheDocument();
  });

  it('moves a folder with the picker and sends PATCH parentId', async () => {
    server.folders.push(folder('c', null, 'Home'));
    renderTree();
    await screen.findByText('Home');
    openActions('Home');
    await pick('Move to…');
    const list = await screen.findByRole('list', { name: 'Move “Home” to…' });
    fireEvent.click(within(list).getByRole('button', { name: /Work/ }));
    await waitFor(() => expect(mutations('PATCH')[0]).toMatchObject({ url: '/api/folders/c', body: JSON.stringify({ parentId: 'a' }) }));
  });

  it('offers move-up vs delete-contents when deleting', async () => {
    renderTree();
    await screen.findByText('Q1');
    openActions('Work');
    await pick('Delete folder');
    expect(await screen.findByText(/The meetings in “Work” move up/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Move contents up to parent folder' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/folders/a?mode=move-up')).toBe(true));
  });

  it('deletes the folder and its meetings when the destructive choice is picked', async () => {
    renderTree();
    await screen.findByText('Q1');
    openActions('Work');
    await pick('Delete folder');
    expect(await screen.findByText(/\(1\)$/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete folder and all its meetings' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/folders/a?mode=delete-contents')).toBe(true));
  });

  it('cancelling the delete dialog sends nothing', async () => {
    renderTree();
    await screen.findByText('Q1');
    openActions('Work');
    await pick('Delete folder');
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Delete “Work”?')).toBeNull());
    expect(mutations('DELETE')).toHaveLength(0);
  });
});

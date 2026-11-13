// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { FolderRow } from '@/lib/meeting-db/types';
import type { SessionMetadata } from '@/lib/meeting/session-store';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { DraggableMeeting, FolderTree, useFolderController } from './FolderSection';

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
  const meetingFolderMatch = /^\/api\/meetings\/([^/]+)\/folder$/.exec(path);
  if (meetingFolderMatch && method === 'PUT') {
    server.meetings[meetingFolderMatch[1]] = body.folderId as string | null;
    return json(200, { ok: true });
  }
  const folderMatch = /^\/api\/folders\/([^/]+)$/.exec(path);
  if (folderMatch && method === 'PATCH') {
    const f = server.folders.find((x) => x.id === folderMatch[1]);
    if (!f) return json(404, { ok: false, error: 'not-found' });
    if ('name' in body) f.name = String(body.name);
    if ('parentId' in body) f.parentId = body.parentId as string | null;
    if ('index' in body) {
      const sib = server.folders.filter((x) => x.parentId === f.parentId && x !== f);
      sib.splice(body.index as number, 0, f);
      server.folders = [...server.folders.filter((x) => x.parentId !== f.parentId), ...sib];
    }
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

function Harness({ items = sessions }: { items?: readonly SessionMetadata[] }) {
  const ctl = useFolderController(items);
  return (
    <>
      <FolderTree controller={ctl} sessions={items} renderSession={(s) => <span>{s.title}</span>} />
      {items.filter((s) => Object.hasOwn(ctl.meetingFolders, s.sessionId) && !ctl.meetingFolders[s.sessionId]).map((s) => (
        <DraggableMeeting key={s.sessionId} sessionId={s.sessionId}>{s.title}</DraggableMeeting>
      ))}
      {ctl.dialogs}
    </>
  );
}

const renderTree = () => render(<ToastProvider><Harness /></ToastProvider>);
const mutations = (method: string) => calls.filter((c) => c.method === method);
const openActions = (name: string) => fireEvent.click(screen.getByRole('button', { name: `Actions for folder “${name}”` }));
const pick = async (label: string) => fireEvent.click(await screen.findByRole('menuitem', { name: label, hidden: true }));
function transfer() {
  const values = new Map<string, string>();
  return { setData: (type: string, value: string) => values.set(type, value), getData: (type: string) => values.get(type) ?? '', effectAllowed: 'none', dropEffect: 'none', types: [] as string[] };
}
function dragStart(element: HTMLElement) {
  const dataTransfer = transfer();
  fireEvent.dragStart(element, { dataTransfer });
  return dataTransfer;
}

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
    server.meetings = {};
    render(<ToastProvider><Harness items={[]} /></ToastProvider>);
    expect(await screen.findByRole('button', { name: /^Work/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Q1/ })).toBeInTheDocument();
  });

  it('moves a meeting onto a folder by mouse drop', async () => {
    server.meetings.m1 = null;
    renderTree();
    const meeting = await screen.findByText('Standup');
    const source = meeting.closest('[draggable="true"]') as HTMLElement;
    const dataTransfer = dragStart(source);
    const target = screen.getByRole('button', { name: /^Work/ }).closest('[draggable="true"]') as HTMLElement;
    fireEvent.drop(target, { dataTransfer });
    await waitFor(() => expect(mutations('PUT')[0]?.body).toBe(JSON.stringify({ folderId: 'a' })));
  });

  it('expands a collapsed folder after a drag hover so it can receive a drop', async () => {
    server.meetings.m1 = null;
    renderTree();
    const work = await screen.findByRole('button', { name: /^Work/ });
    fireEvent.click(work);
    const dataTransfer = dragStart(screen.getByText('Standup').closest('[draggable="true"]') as HTMLElement);
    const target = work.closest('[draggable="true"]') as HTMLElement;
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
    server.folders.push(folder('c', null, 'Home'));
    renderTree();
    const work = (await screen.findByRole('button', { name: /^Work/ })).closest('[draggable="true"]') as HTMLElement;
    const home = screen.getByRole('button', { name: /^Home/ }).closest('[draggable="true"]') as HTMLElement;
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
    server.meetings = Object.fromEntries(many.map((m) => [m.sessionId, 'b']));
    render(<ToastProvider><Harness items={many} /></ToastProvider>);
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
    const source = (await screen.findByRole('button', { name: /^Work/ })).closest('[draggable="true"]') as HTMLElement;
    const dataTransfer = dragStart(source);
    const target = screen.getByRole('button', { name: /^Q1/ }).closest('[draggable="true"]') as HTMLElement;
    fireEvent.drop(target, { dataTransfer });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mutations('PATCH')).toHaveLength(0);
  });

  it('opens the create folder dialog and creates a top-level folder', async () => {
    renderTree();
    await screen.findByText('Q1');
    fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
    const input = await screen.findByRole('textbox', { name: 'Folder name' });
    expect(input).toHaveValue('');
    expect(mutations('POST')).toHaveLength(0);
    fireEvent.change(input, { target: { value: 'Planning' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(mutations('POST')[0]).toMatchObject({ url: '/api/folders', body: JSON.stringify({ name: 'Planning', parentId: null }) }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('creates a nested folder under the chosen parent', async () => {
    renderTree();
    await screen.findByText('Q1');
    openActions('Work');
    await pick('New subfolder');
    const input = await screen.findByRole('textbox', { name: 'Folder name' });
    expect(screen.getByRole('combobox', { name: 'Location' })).toHaveTextContent('Work');
    fireEvent.change(input, { target: { value: 'Planning' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(mutations('POST')[0].body).toBe(JSON.stringify({ name: 'Planning', parentId: 'a' })));
  });

  it('rejects empty and duplicate names in the selected parent', async () => {
    renderTree();
    await screen.findByText('Q1');
    fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
    const input = await screen.findByRole('textbox', { name: 'Folder name' });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Enter a folder name.')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Work' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('A folder with this name already exists here.')).toBeInTheDocument();
    expect(mutations('POST')).toHaveLength(0);
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

  it('opens the create dialog for a new subfolder even when its parent is collapsed', async () => {
    renderTree();
    await screen.findByText('Q1');
    fireEvent.click(screen.getByRole('button', { name: /^Work/, expanded: true }));
    openActions('Work');
    await pick('New subfolder');
    expect(await screen.findByRole('textbox', { name: 'Folder name' })).toBeVisible();
    expect(mutations('POST')).toHaveLength(0);
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

  it('calls onNewSession with the folder id and expands a collapsed folder when + is clicked', async () => {
    const onNewSession = vi.fn();
    function NewSessionHarness() {
      const ctl = useFolderController(sessions);
      return (
        <FolderTree
          controller={ctl}
          sessions={sessions}
          renderSession={(s) => <span>{s.title}</span>}
          onNewSession={onNewSession}
        />
      );
    }
    render(<ToastProvider><NewSessionHarness /></ToastProvider>);
    await screen.findByText('Q1');
    // Collapse Work first so clicking + verifies both expansion and callback.
    fireEvent.click(screen.getByRole('button', { name: 'Work' }));
    expect(screen.queryByText('Q1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'New meeting in “Work”' }));
    expect(onNewSession).toHaveBeenCalledWith('a');
    expect(screen.getByText('Q1')).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { fake, installFakeFolderServer, mutations } from './test-support/fakeFolderServer';
import { renderTree } from './test-support/FolderHarness';
import { openActions, pick } from './test-support/interactions';
import { folder } from './test-support/fixtures';

beforeEach(installFakeFolderServer);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const openMovePicker = async (name: string) => {
  openActions(name);
  await pick('Move to…');
  return screen.findByRole('list', { name: `Move “${name}” to…` });
};
const openDeleteDialog = async () => {
  openActions('Work');
  await pick('Delete folder');
};
const deleteCalled = (url: string) => fake.calls.some((c) => c.method === 'DELETE' && c.url === url);

describe('moving folders', () => {
  it('moves a folder through the keyboard Move to… picker', async () => {
    renderTree();
    await screen.findByText('Q1');
    const dialog = await openMovePicker('Q1');
    expect(within(dialog).getByRole('button', { name: /Work/ })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Top level' }));
    await waitFor(() => expect(mutations('PATCH')[0]?.body).toBe(JSON.stringify({ parentId: null })));
  });

  it('marks the current parent as disabled in the Move to… picker', async () => {
    renderTree();
    await screen.findByText('Q1');
    const list = await openMovePicker('Q1');
    const current = within(list).getByRole('button', { name: /Work/ });
    expect(current).toBeDisabled();
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(within(list).getByRole('button', { name: /Top level/ })).not.toBeDisabled();
  });

  it('leaves a folder’s own subtree out of its Move to… picker', async () => {
    renderTree();
    await screen.findByText('Q1');
    const list = await openMovePicker('Work');
    expect(within(list).queryByRole('button', { name: /^Q1/ })).toBeNull();
    expect(within(list).getByRole('button', { name: /Top level/ })).toBeInTheDocument();
  });

  it('moves a folder with the picker and sends PATCH parentId', async () => {
    fake.server.folders.push(folder('c', null, 'Home'));
    renderTree();
    await screen.findByText('Home');
    const list = await openMovePicker('Home');
    fireEvent.click(within(list).getByRole('button', { name: /Work/ }));
    await waitFor(() => expect(mutations('PATCH')[0]).toMatchObject({ url: '/api/folders/c', body: JSON.stringify({ parentId: 'a' }) }));
  });
});

describe('deleting folders', () => {
  it('offers move-up vs delete-contents when deleting', async () => {
    renderTree();
    await screen.findByText('Q1');
    await openDeleteDialog();
    expect(await screen.findByText(/The meetings in “Work” move up/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Move contents up to parent folder' }));
    await waitFor(() => expect(deleteCalled('/api/folders/a?mode=move-up')).toBe(true));
  });

  it('deletes the folder and its meetings when the destructive choice is picked', async () => {
    renderTree();
    await screen.findByText('Q1');
    await openDeleteDialog();
    expect(await screen.findByText(/\(1\)$/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete folder and all its meetings' }));
    await waitFor(() => expect(deleteCalled('/api/folders/a?mode=delete-contents')).toBe(true));
  });

  it('cancelling the delete dialog sends nothing', async () => {
    renderTree();
    await screen.findByText('Q1');
    await openDeleteDialog();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Delete “Work”?')).toBeNull());
    expect(mutations('DELETE')).toHaveLength(0);
  });
});

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { installFakeFolderServer, mutations } from './test-support/fakeFolderServer';
import { renderTree } from './test-support/FolderHarness';
import { openActions, pick } from './test-support/interactions';

beforeEach(installFakeFolderServer);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('creating folders', () => {
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

  it('opens the create dialog for a new subfolder even when its parent is collapsed', async () => {
    renderTree();
    await screen.findByText('Q1');
    fireEvent.click(screen.getByRole('button', { name: /^Work/, expanded: true }));
    openActions('Work');
    await pick('New subfolder');
    expect(await screen.findByRole('textbox', { name: 'Folder name' })).toBeVisible();
    expect(mutations('POST')).toHaveLength(0);
  });
});

describe('renaming folders', () => {
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
});

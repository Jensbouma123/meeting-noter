// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { FolderRow } from '@/lib/meeting-db/types';
import { RailSessionRow } from './RailSessionRow';
import { useOnDemandSuggestion } from './useOnDemandSuggestion';
import { draft } from './test-support/draftSession';

const toast = vi.hoisted(() => ({ info: vi.fn() }));
const gate = vi.hoisted(() => ({ ready: true }));
const dialog = vi.hoisted(() => ({ openDialog: vi.fn() }));
const vectors = vi.hoisted(() => ({ byId: {} as Record<string, Float32Array[]> }));

vi.mock('@jensbouma123/acciva-ui', async (orig) => ({ ...(await orig<object>()), useToast: () => ({ toast }) }));
vi.mock('@/lib/semantic-search/store', () => ({ loadIndex: (id: string) => (vectors.byId[id] ? { vectors: vectors.byId[id] } : null) }));
vi.mock('@/lib/semantic-search/model-gate', () => ({ isSearchModelReady: () => gate.ready }));
vi.mock('@/lib/asr/browser/model-registry-dialog', () => dialog);
vi.mock('@/lib/folders/folders-api', () => ({ moveMeeting: vi.fn(), declineFolderSuggestion: vi.fn() }));

const noop = () => {};
const v = (...n: number[]) => new Float32Array(n);
const win = (x: number, y: number) => [v(x, y), v(x, y), v(x, y)];
const folder = (id: string): FolderRow => ({ id, name: id, parentId: null, sortIndex: 0 }) as unknown as FolderRow;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vectors.byId = {};
  gate.ready = true;
});

describe('Suggest folder menu item', () => {
  it('sits right below "Move to…" and triggers the suggestion', () => {
    const onSuggest = vi.fn();
    render(<RailSessionRow session={draft()} isActive onOpen={noop} onClear={noop} onDelete={noop} onMove={noop} onSuggest={onSuggest} />);
    fireEvent.click(screen.getByRole('button', { name: 'More actions for “Standup”' }));
    const items = screen.getAllByRole('menuitem', { hidden: true }).map((i) => i.textContent);
    expect(items.indexOf('Suggest folder')).toBe(items.indexOf('Move to…') + 1);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Suggest folder', hidden: true }));
    expect(onSuggest).toHaveBeenCalledOnce();
  });

  it('is disabled and busy while computing', () => {
    render(<RailSessionRow session={draft()} isActive onOpen={noop} onClear={noop} onDelete={noop} onSuggest={noop} suggesting />);
    fireEvent.click(screen.getByRole('button', { name: 'More actions for “Standup”' }));
    const item = screen.getByRole('menuitem', { name: 'Suggest folder', hidden: true });
    expect(item).toHaveAttribute('aria-busy', 'true');
  });
});

describe('useOnDemandSuggestion', () => {
  const setup = () => {
    vectors.byId = { a1: win(1, 0), a2: win(1, 0), b1: win(0, 1), b2: win(0, 1), x: win(1, 0.1) };
    return { a1: 'fa', a2: 'fa', b1: 'fb', b2: 'fb', x: null } as Record<string, string | null>;
  };

  it('exposes a chip view when a folder matches', async () => {
    const { result } = renderHook(() => useOnDemandSuggestion([folder('fa'), folder('fb')], setup()));
    await act(() => result.current.suggest('x'));
    await waitFor(() => expect(result.current.views.x?.folderLabel).toBe('fa'));
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('toasts when no folder clears the threshold', async () => {
    const mf = setup();
    vectors.byId.x = win(-1, -1);
    const { result } = renderHook(() => useOnDemandSuggestion([folder('fa'), folder('fb')], mf));
    await act(() => result.current.suggest('x'));
    expect(toast.info).toHaveBeenCalledWith('No matching folder found');
    expect(result.current.views.x).toBeUndefined();
  });

  it('says the model is missing, opens the download dialog and never toasts no-match', async () => {
    gate.ready = false;
    const { result, rerender } = renderHook(() => useOnDemandSuggestion([folder('fa')], { x: null }));
    rerender();
    expect(toast.info).not.toHaveBeenCalled();
    await act(() => result.current.suggest('x'));
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith('Download the search model to get folder suggestions.');
    expect(dialog.openDialog).toHaveBeenCalledOnce();
  });

  it('toasts to create a folder when there are none', async () => {
    const { result } = renderHook(() => useOnDemandSuggestion([], { x: null }));
    await act(() => result.current.suggest('x'));
    expect(toast.info).toHaveBeenCalledWith('No folders yet. Create a folder first to get suggestions.');
  });
});

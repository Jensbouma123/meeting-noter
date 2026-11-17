// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { requestReveal } from '@/lib/meeting/seek-event';
import { RightRail } from './RightRail';

vi.mock('./store', () => ({ meeting: { renameSpeaker: vi.fn() } }));
vi.mock('@/components/notes/NotesPanel', () => ({ NotesPanel: () => <div>notes-panel</div> }));
vi.mock('@/lib/meeting', () => ({ useSpeakerStats: () => [] }));

afterEach(cleanup);

describe('RightRail drawer on narrow screens', () => {
  it('closes when a transcript segment is revealed', async () => {
    window.matchMedia = ((q: string) => ({
      matches: false, media: q, addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open'); };
    render(<LanguageContext.Provider value="en"><ToastProvider><RightRail sessionId="s1" /></ToastProvider></LanguageContext.Provider>);
    act(() => { window.dispatchEvent(new Event('mn:open-speakers')); });
    const dialog = () => document.querySelector('dialog')!;
    expect(dialog()).toHaveAttribute('open');
    act(() => requestReveal('s1'));
    await waitFor(() => expect(document.querySelector('dialog')?.hasAttribute('open') ?? false).toBe(false));
  });
});

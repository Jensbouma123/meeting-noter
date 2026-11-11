// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ShareDialog } from './ShareDialog';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});

vi.mock('@/lib/meeting/export', async (load) => {
  const actual = await load<typeof import('@/lib/meeting/export')>();
  return { ...actual, copyToClipboard: vi.fn().mockResolvedValue(true), downloadFile: vi.fn() };
});

afterEach(cleanup);

const seg = { id: '1', source: 'mic', speaker: 'sp1', text: 'Hello', start: 0, end: 1, final: true } as const;
const base = { open: true, onClose: () => {}, title: 'Planning', speakers: {} };

describe('ShareDialog', () => {
  it('shows an empty state and no actions when there is nothing to share', () => {
    render(<ShareDialog {...base} segments={[]} />);
    expect(screen.getByText(/Nothing to share yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy transcript' })).toBeNull();
  });

  it('previews and copies the transcript with a confirmation', async () => {
    const exp = await import('@/lib/meeting/export');
    render(<ShareDialog {...base} segments={[seg]} />);
    const preview = screen.getByRole('region', { name: 'Preview of what you will share' });
    expect(preview).toHaveTextContent('Planning');
    expect(preview).toHaveTextContent('Hello');
    fireEvent.click(screen.getByRole('button', { name: 'Copy transcript' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Copied');
    const text = vi.mocked(exp.copyToClipboard).mock.calls.at(-1)![0];
    expect(text).toContain('[00:00] Hello');
    expect(text).not.toContain('Ship Friday');
  });

  it('offers email with subject and body, and download', async () => {
    const exp = await import('@/lib/meeting/export');
    render(<ShareDialog {...base} segments={[seg]} />);
    const href = screen.getByRole('link', { name: 'Send by email' }).getAttribute('href')!;
    expect(href).toContain('subject=Meeting%20transcript%3A%20Planning');
    expect(decodeURIComponent(href)).toContain('[00:00] Hello');
    fireEvent.click(screen.getByRole('button', { name: 'Download as document' }));
    expect(exp.downloadFile).toHaveBeenCalled();
  });

  it('keeps transcript formats under Advanced and reports clipboard failures', async () => {
    const exp = await import('@/lib/meeting/export');
    vi.mocked(exp.copyToClipboard).mockResolvedValueOnce(false);
    render(<ShareDialog {...base} segments={[seg]} />);
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy: Subtitles (.srt)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Copying did not work');
  });

  it.each(['live', 'reopened saved'])('copies only the transcript with speakers and timestamps (%s session)', async () => {
    const exp = await import('@/lib/meeting/export');
    const segs = [
      { ...seg, id: 'a', text: 'We should ship on Friday', start: 5, end: 8 },
      { ...seg, id: 'b', speaker: 'sp2', text: 'Agreed, Friday works', start: 65, end: 68 },
      { ...seg, id: 'c', text: 'interim words', start: 70, end: 71, final: false },
    ];
    const speakers = { sp1: { id: 'sp1', label: 'Anna' }, sp2: { id: 'sp2', label: 'Ben' } } as never;
    render(<ShareDialog {...base} segments={segs} speakers={speakers} />);
    const expected = (await import('@/lib/meeting/export')).formatExport('txt', segs.filter((s) => s.final), speakers, 'Planning');
    fireEvent.click(screen.getByRole('button', { name: 'Copy transcript' }));
    await screen.findByRole('status');
    const text = vi.mocked(exp.copyToClipboard).mock.calls.at(-1)![0];
    expect(text).toBe(expected);
    expect(text).toContain('Anna');
    expect(text).toContain('[00:05] We should ship on Friday');
    expect(text).toContain('Ben');
    expect(text).toContain('Agreed, Friday works');
    expect(text).not.toContain('interim words');
    expect(text).not.toContain('Ship Friday');
    expect(text).not.toContain('interim words');
  });
});

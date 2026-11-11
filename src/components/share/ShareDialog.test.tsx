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
const base = { open: true, onClose: () => {}, title: 'Planning', date: '11 Nov', durationS: 60, participants: [], speakers: {} };
const decisions = [{ id: 'd1', text: 'Ship Friday' }];
const actions = [{ id: 'a1', text: 'Write notes', ownerName: 'Sam', due: 'Mon', done: false }];

describe('ShareDialog', () => {
  it('shows an empty state and no actions when there is nothing to share', () => {
    render(<ShareDialog {...base} decisions={[]} actions={[]} segments={[]} />);
    expect(screen.getByText(/Nothing to share yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy summary' })).toBeNull();
  });

  it('previews the summary and copies plain text with a confirmation', async () => {
    const exp = await import('@/lib/meeting/export');
    render(<ShareDialog {...base} decisions={decisions} actions={actions} segments={[]} />);
    const preview = screen.getByRole('region', { name: 'Preview of what you will share' });
    expect(preview).toHaveTextContent('Planning');
    expect(preview).toHaveTextContent('Ship Friday');
    expect(preview).toHaveTextContent('Write notes');
    expect(preview).toHaveTextContent('Owner: Sam');
    expect(preview).toHaveTextContent('Due: Mon');
    fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Copied');
    const text = vi.mocked(exp.copyToClipboard).mock.calls.at(-1)![0];
    expect(text).toContain('Ship Friday');
    expect(text).not.toContain('# ');
  });

  it('offers email with subject and body, and download', async () => {
    const exp = await import('@/lib/meeting/export');
    render(<ShareDialog {...base} decisions={decisions} actions={actions} segments={[]} />);
    const href = screen.getByRole('link', { name: 'Send by email' }).getAttribute('href')!;
    expect(href).toContain('subject=Meeting%20summary%3A%20Planning');
    expect(decodeURIComponent(href)).toContain('Ship Friday');
    fireEvent.click(screen.getByRole('button', { name: 'Download as document' }));
    expect(exp.downloadFile).toHaveBeenCalled();
  });

  it('keeps transcript formats under Advanced and reports clipboard failures', async () => {
    const exp = await import('@/lib/meeting/export');
    vi.mocked(exp.copyToClipboard).mockResolvedValueOnce(false);
    render(<ShareDialog {...base} decisions={decisions} actions={[]} segments={[seg]} />);
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy: Subtitles (.srt)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Copying did not work');
  });
});

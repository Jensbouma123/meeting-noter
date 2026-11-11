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

describe('ShareDialog', () => {
  it('copies the summary even when there is no transcript', async () => {
    render(<ShareDialog open onClose={() => {}} title="Planning" date="11 Nov" durationS={60} participants={[]} decisions={[]} actions={[]} segments={[]} speakers={{}} />);
    expect(screen.getByText('No transcript yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy summary' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download (.md)' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'More formats' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }));
    const exp = await import('@/lib/meeting/export');
    expect(exp.copyToClipboard).toHaveBeenCalled();
  });

  it('reveals transcript formats and reports clipboard failures', async () => {
    const exp = await import('@/lib/meeting/export');
    vi.mocked(exp.copyToClipboard).mockResolvedValueOnce(false);
    render(<ShareDialog open onClose={() => {}} title="Planning" date="11 Nov" durationS={60} participants={[]} decisions={[]} actions={[]} segments={[{ id: '1', source: 'mic', speaker: 'sp1', text: 'Hello', start: 0, end: 1, final: true }]} speakers={{}} />);
    fireEvent.click(screen.getByRole('button', { name: 'More formats' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy TXT' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Copy failed. Use Download (.md).');
  });
});

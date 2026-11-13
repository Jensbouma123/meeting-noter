// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateBanner } from '../UpdateBanner';
import { WhatsNewDialog } from './WhatsNewDialog';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});

const ui = (node: React.ReactNode) => render(<ToastProvider>{node}</ToastProvider>);

beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); });

describe('update banner preview', () => {
  it('shows a one-liner whose (i) button opens the notes dialog and Update now starts nothing', async () => {
    window.history.replaceState({}, '', '/?preview=update');
    ui(<UpdateBanner />);
    expect(screen.getByRole('status')).toHaveTextContent(/Update \d+\.\d+\.\d+ available/);
    expect(screen.queryByText(/Fixed a rare crash/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Release notes' }));
    expect(await screen.findByText(/Fixed a rare crash/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }));
    expect(fetch).not.toHaveBeenCalledWith('/api/app/update', expect.objectContaining({ method: 'POST' }));
    expect(await screen.findByText(/Preview only/)).toBeInTheDocument();
  });
});

describe('WhatsNewDialog', () => {
  it('preview opens with notes and never writes last-seen', async () => {
    window.history.replaceState({}, '', '/?preview=whats-new');
    ui(<WhatsNewDialog />);
    expect(await screen.findByText(/Fixed a rare crash/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/Fixed a rare crash/)).toBeNull();
  });

  it('shows server notes once and records the close', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ show: true, version: '2.0.0', notes: '- New thing', pageUrl: null }) } as Response);
    ui(<WhatsNewDialog />);
    expect(await screen.findByText('New thing')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/app/whats-new', expect.objectContaining({ method: 'POST' })));
  });

  it('renders nothing when the server says not to show', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ show: false }) } as Response);
    ui(<WhatsNewDialog />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ReleaseNotesDialog } from './ReleaseNotesDialog';
import { RELEASES_PAGE_URL } from './constants';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('ReleaseNotesDialog without notes', () => {
  it('says so and links to the releases page when no page url is known', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<ReleaseNotesDialog open onClose={() => undefined} title="T" notes={null} pageUrl="" />);
    expect(screen.getByText('No release notes available.')).toBeInTheDocument();
    screen.getByRole('button', { name: 'View on GitHub' }).click();
    expect(open).toHaveBeenCalledWith(RELEASES_PAGE_URL, '_blank', 'noopener,noreferrer');
  });
});

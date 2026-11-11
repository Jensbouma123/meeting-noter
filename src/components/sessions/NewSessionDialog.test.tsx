// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewSessionDialog } from './NewSessionDialog';

afterEach(cleanup);

describe('NewSessionDialog', () => {
  it('starts a meeting with a localized default name when left blank', () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    const onCreate = vi.fn();
    render(<NewSessionDialog open onClose={() => {}} onCreate={onCreate} />);
    fireEvent.click(screen.getByText('Start'));
    expect(onCreate).toHaveBeenCalledWith('', expect.stringMatching(/^Meeting \w{3}, \w{3} \d{1,2}, \d{2}:\d{2}$/));
    vi.unstubAllGlobals();
  });
});

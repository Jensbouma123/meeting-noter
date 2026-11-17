// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RailSessionRow } from './RailSessionRow';
import { draft } from './test-support/draftSession';

const noop = () => {};

afterEach(() => {
  cleanup();
});

describe('RailSessionRow menu separator', () => {
  it('renders a separator between the normal items and "Clear transcript"', () => {
    render(<RailSessionRow session={draft()} isActive={false} onOpen={noop} onClear={noop} onDelete={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'More actions for “Standup”' }));
    const separator = screen.getByRole('separator', { hidden: true });
    const clear = screen.getByRole('menuitem', { name: 'Clear transcript', hidden: true });
    const open = screen.getByRole('menuitem', { name: 'Open', hidden: true });
    expect(open.compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(separator.compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

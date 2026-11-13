// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FolderSuggestionChip } from './FolderSuggestionChip';

describe('FolderSuggestionChip', () => {
  it('shows the full wrapping folder name and labelled icon-only actions', () => {
    render(
      <FolderSuggestionChip
        title="Standup"
        suggestion={{ folderLabel: 'Clients / Acme / Product Design', onAccept: vi.fn(), onDecline: vi.fn() }}
      />,
    );
    const chip = screen.getByTestId('folder-suggestion');
    expect(chip).toHaveTextContent('Suggested folder: Clients / Acme / Product Design');
    expect(screen.getByText('Clients / Acme / Product Design').parentElement).toHaveClass('whitespace-normal', 'break-words');
    for (const label of ['Move', 'No thanks']) {
      const button = screen.getByRole('button', { name: label });
      expect(button).toHaveAttribute('aria-label', label);
      expect(button).not.toHaveTextContent(/\S/);
    }
  });
});

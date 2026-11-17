// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RailSessionRow } from './RailSessionRow';
import { draft, recorded } from './test-support/draftSession';
import { installRailRowLifecycle, noop, row } from './RailSessionRow.testSupport';

installRailRowLifecycle();

describe('RailSessionRow folder path in search', () => {
  it('shows the folder path ahead of the time and duration', () => {
    render(row(recorded(), { isActive: false, pathLabel: 'Work / Q1' }));
    expect(screen.getByText(/^Work \/ Q1 · /)).toBeInTheDocument();
  });

  it('shows no path when the meeting is unfiled', () => {
    render(row(recorded(), { isActive: false }));
    expect(screen.queryByText(/\//)).toBeNull();
  });
});

describe('RailSessionRow leading icon', () => {
  it('renders no leading icon for drafts and no audio icon for recorded sessions', () => {
    const { container, rerender } = render(row(draft({ isDraft: true }), { isActive: false }));
    expect(container.querySelectorAll('.text-muted-foreground svg')).toHaveLength(0);
    expect(container.querySelector('.text-primary-600')).toBeNull();

    rerender(row(recorded({ captureMode: 'mic' }), { isActive: false }));
    expect(container.querySelector('.text-muted-foreground svg')).toBeNull();
    expect(container.querySelector('.text-primary-600')).toBeNull();
    expect(screen.queryByText('Microphone')).toBeNull();
  });
});

describe('RailSessionRow folder suggestion', () => {
  it('shows the chip next to the meeting row and runs accept and decline', () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    render(
      <RailSessionRow
        session={draft()}
        isActive={false}
        onOpen={noop}
        onClear={noop}
        onDelete={noop}
        suggestion={{ folderLabel: 'Clients / Acme', onAccept, onDecline }}
      />,
    );
    expect(screen.getByText('Standup')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    fireEvent.click(screen.getByRole('button', { name: 'No thanks' }));
    expect([onAccept.mock.calls.length, onDecline.mock.calls.length]).toEqual([1, 1]);
  });

  it('shows no chip without a suggestion', () => {
    render(row(draft()));
    expect(screen.queryByTestId('folder-suggestion')).toBeNull();
  });
});

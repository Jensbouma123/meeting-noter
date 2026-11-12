// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { RecordTargetDialog } from './RecordTargetDialog';

describe('RecordTargetDialog', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ||= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close ||= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
  });
  it('shows plain copy with the recorded duration and three actions', () => {
    render(
      <RecordTargetDialog
        open
        title="Test"
        durationSeconds={24}
        onCancel={vi.fn()}
        onAppend={vi.fn()}
        onStartNew={vi.fn()}
      />,
    );
    expect(screen.getByText(/00:24/)).toBeTruthy();
    expect(screen.queryByText(/segment/i)).toBeNull();
    expect(screen.getAllByRole('button', { hidden: true }).length).toBeGreaterThanOrEqual(3);
  });
});

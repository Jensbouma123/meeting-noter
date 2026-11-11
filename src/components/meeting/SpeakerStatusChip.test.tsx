// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpeakerStatusChip } from './SpeakerStatusChip';
import type { DiarizationStatus } from '@/lib/meeting/types';

afterEach(cleanup);

describe('SpeakerStatusChip', () => {
  it.each([
    [{ phase: 'off', reason: null }],
    [{ phase: 'loading', reason: null }],
    [{ phase: 'active', reason: null, backend: 'webgpu' }],
  ] as DiarizationStatus[][])('renders nothing unless unavailable', (status) => {
    const { container } = render(<SpeakerStatusChip status={status} onOpenSettings={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders unavailable state and opens advanced settings', () => {
    const onOpen = vi.fn();
    render(<SpeakerStatusChip status={{ phase: 'unavailable', reason: 'Model failed to load' }} onOpenSettings={onOpen} />);
    expect(screen.getByText('Speaker detection unavailable')).toBeInTheDocument();
    expect(screen.getByText('Model failed to load')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Speaker detection unavailable/ }));
    expect(onOpen).toHaveBeenCalledWith('advanced');
  });
});

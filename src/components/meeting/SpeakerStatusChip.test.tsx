// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { SpeakerStatusChip } from './SpeakerStatusChip';
import type { DiarizationStatus } from '@/lib/meeting/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function render(status: DiarizationStatus | undefined, onOpen = vi.fn()) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<SpeakerStatusChip status={status} onOpenSettings={onOpen} />));
  return el;
}

describe('SpeakerStatusChip', () => {
  it('renders nothing while off', async () => {
    const el = await render({ phase: 'off', reason: null });
    expect(el.querySelector('[data-testid="speaker-status"]')).toBeNull();
  });

  it('shows identifying state while loading', async () => {
    const el = await render({ phase: 'loading', reason: null });
    expect(el.textContent).toContain('Identifying speakers...');
  });

  it('shows Speakers live when active', async () => {
    const el = await render({ phase: 'active', reason: null, backend: 'webgpu' });
    expect(el.textContent).toContain('Speakers live');
    expect(el.querySelector('[data-phase="active"]')).not.toBeNull();
  });

  it('shows unavailable with reason and opens model settings', async () => {
    const onOpen = vi.fn();
    const el = await render({ phase: 'unavailable', reason: 'Model failed to load' }, onOpen);
    expect(el.textContent).toContain('Speaker detection unavailable');
    expect(el.textContent).toContain('Model failed to load');
    const btn = el.querySelector('button[data-phase="unavailable"]') as HTMLButtonElement;
    await act(async () => btn.click());
    expect(onOpen).toHaveBeenCalledWith('speech-model');
  });
});

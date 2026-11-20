import { describe, expect, it } from 'vitest';
import { SEPARATIONS_PER_WINDOW, SEPARATION_RATE_WINDOW_MS, separationGate } from './overlap-separate-gate';

const span = { start: 10, end: 11, speakers: ['system:0', 'system:1'] };
const idle = { running: false, recent: [] };

describe('separationGate', () => {
  it('passes a 2-speaker system span of at least 0.6 s on WebGPU', () => {
    expect(separationGate(span, 'system', 'webgpu', idle, 0)).toBeNull();
    expect(separationGate(span, 'system', 'unloaded', idle, 0)).toBeNull();
  });

  it('rejects mic spans, short spans and 3 speakers', () => {
    expect(separationGate(span, 'mic', 'webgpu', idle, 0)).toBe('source');
    expect(separationGate({ ...span, end: 10.5 }, 'system', 'webgpu', idle, 0)).toBe('short');
    expect(separationGate({ ...span, end: 17 }, 'system', 'webgpu', idle, 0)).toBeNull();
    expect(separationGate({ ...span, end: 17.1 }, 'system', 'webgpu', idle, 0)).toBe('long');
    expect(separationGate({ ...span, speakers: ['a', 'b', 'c'] }, 'system', 'webgpu', idle, 0)).toBe('speakers');
  });

  it('rejects a WASM or failed separator', () => {
    expect(separationGate(span, 'system', 'wasm', idle, 0)).toBe('backend');
    expect(separationGate(span, 'system', 'failed', idle, 0)).toBe('backend');
  });

  it('allows one running separation and caps the rate per minute', () => {
    expect(separationGate(span, 'system', 'webgpu', { running: true, recent: [] }, 0)).toBe('busy');
    const full = Array.from({ length: SEPARATIONS_PER_WINDOW }, (_, i) => i * 1000);
    expect(separationGate(span, 'system', 'webgpu', { running: false, recent: full }, 10_000)).toBe('rate');
    expect(separationGate(span, 'system', 'webgpu', { running: false, recent: full }, SEPARATION_RATE_WINDOW_MS + 1000)).toBeNull();
  });
});

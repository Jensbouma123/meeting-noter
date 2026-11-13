import { describe, expect, it } from 'vitest';
import { nextHref } from './chain';
import { DEFAULT_ENCODER as DEFAULT, Q4F16_URL } from './chainFixtures';

describe('nextHref', () => {
  const url = (href: string | null) => new URL(href as string);

  it('turns a chain position into the next variant URL, one step further along', () => {
    const u = url(nextHref('fp16', Q4F16_URL, DEFAULT));
    expect(u.pathname).toBe('/dev/asr-bench');
    expect(u.searchParams.get('backend')).toBe('webgpu');
    expect(u.searchParams.get('encoder')).toBe('fp16');
    expect(u.searchParams.get('autostart')).toBe('1');
    expect(u.searchParams.get('next')).toBe('int8');
    expect(u.searchParams.get('file')).toBe('/bench/ami-EN2002b-5min.wav');
    expect(u.searchParams.get('runs')).toBe('1');
  });

  it('carries no encoder param for the default rung, so the run benches the real default', () => {
    const u = url(nextHref('q4f16', Q4F16_URL, DEFAULT));
    expect(u.searchParams.get('backend')).toBe('webgpu');
    expect(u.searchParams.get('encoder')).toBeNull();
  });

  it('drops the next step at the end of the chain and clears a stale encoder', () => {
    const u = url(nextHref('int8', Q4F16_URL, DEFAULT));
    expect(u.searchParams.get('backend')).toBe('wasm');
    expect(u.searchParams.get('encoder')).toBeNull();
    expect(u.searchParams.get('next')).toBeNull();
  });

  it('walks the whole chain in three hops from the URL it is given', () => {
    const seen: string[] = [];
    let here: string | null = Q4F16_URL;
    while (here) {
      const pos = new URL(here);
      seen.push(`${pos.searchParams.get('backend')}|${pos.searchParams.get('encoder')}`);
      here = nextHref(pos.searchParams.get('next') ?? '', here, DEFAULT);
    }
    expect(seen).toEqual(['webgpu|null', 'webgpu|fp16', 'wasm|null']);
    expect(here).toBeNull();
  });

  it('navigates an explicit URL or path verbatim, and stops on nothing usable', () => {
    expect(nextHref('/dev/asr-bench?backend=wasm&autostart=1', Q4F16_URL, DEFAULT)).toBe(
      '/dev/asr-bench?backend=wasm&autostart=1',
    );
    expect(nextHref('https://example.test/bench', Q4F16_URL, DEFAULT)).toBe(
      'https://example.test/bench',
    );
    expect(nextHref('', Q4F16_URL, DEFAULT)).toBeNull();
    expect(nextHref('   ', Q4F16_URL, DEFAULT)).toBeNull();
    expect(nextHref('fp32', Q4F16_URL, DEFAULT)).toBeNull();
  });

  it('leaves a readable file= in the URL instead of %2F-escaping it', () => {
    expect(nextHref('fp16', Q4F16_URL, DEFAULT)).toContain('file=/bench/ami-EN2002b-5min.wav');
  });
});

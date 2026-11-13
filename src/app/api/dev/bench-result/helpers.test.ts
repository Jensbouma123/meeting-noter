import { describe, expect, it } from 'vitest';
import {
  benchResultsDir,
  browserFromUserAgent,
  fileTimestamp,
  resultFileName,
  slug,
  variantFromPayload,
} from './helpers';
import { CHROME_UA, SAFARI_UA, env, registerBenchTempDirs } from './testSupport';

registerBenchTempDirs();

describe('slug', () => {
  it('keeps only filename-safe characters, bounded and lowercase', () => {
    expect(slug('webgpu-fp16')).toBe('webgpu-fp16');
    expect(slug('  WebGPU/FP16  ')).toBe('webgpu-fp16');
    expect(slug('../../etc/passwd')).toBe('etc-passwd');
    expect(slug('..')).toBe('unknown');
    expect(slug(null)).toBe('unknown');
    expect(slug('x'.repeat(80)).length).toBe(48);
  });
});

describe('browserFromUserAgent', () => {
  it('does not call Chrome Safari, which is the whole point of checking order', () => {
    expect(browserFromUserAgent(SAFARI_UA)).toBe('safari');
    expect(browserFromUserAgent(CHROME_UA)).toBe('chrome');
    expect(browserFromUserAgent('Mozilla/5.0 … Edg/143.0')).toBe('edge');
    expect(browserFromUserAgent('Mozilla/5.0 … FxiOS/143.0')).toBe('firefox');
    expect(browserFromUserAgent('Mozilla/5.0 … CriOS/143.0')).toBe('chrome');
    expect(browserFromUserAgent('')).toBe('unknown');
    expect(browserFromUserAgent(undefined)).toBe('unknown');
  });
});

describe('variant + file naming', () => {
  it('prefers the variant the page sent, and falls back to backend-encoder', () => {
    expect(variantFromPayload({ variant: 'wasm-int8' })).toBe('wasm-int8');
    expect(variantFromPayload({ backend: 'webgpu', encoderQuant: 'q4f16' })).toBe('webgpu-q4f16');
    expect(variantFromPayload({ backend: 'wasm' })).toBe('wasm');
    expect(variantFromPayload({})).toBe('unknown');
  });

  it('builds <variant>-<browser>-<timestamp>.json with a sortable timestamp', () => {
    const name = resultFileName({ variant: 'webgpu-fp16', userAgent: SAFARI_UA }, new Date('2026-09-28T13:45:01.5Z'));
    expect(name).toBe('webgpu-fp16-safari-2026-09-28T13-45-01-500Z.json');
    expect(fileTimestamp(new Date('2026-09-28T13:45:01.5Z'))).toBe('2026-09-28T13-45-01-500Z');
    expect(fileTimestamp(new Date('2026-09-28T13:45:02Z')) > fileTimestamp(new Date('2026-09-28T13:45:01Z'))).toBe(true);
  });
});

describe('benchResultsDir', () => {
  it('defaults to test-audio/bench-results next to the repo', () => {
    delete env.ASR_BENCH_RESULT_DIR;
    expect(benchResultsDir()).toMatch(/test-audio[/\\]bench-results$/);
  });

  it('honours the override both the route and the scorer read', () => {
    env.ASR_BENCH_RESULT_DIR = '/tmp/x';
    expect(benchResultsDir()).toBe('/tmp/x');
  });
});

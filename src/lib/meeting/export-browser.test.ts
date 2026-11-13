import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadFile } from './export-browser';

describe('downloadFile', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('revokes the object URL after the click, not synchronously', () => {
    vi.useFakeTimers();
    const revoke = vi.fn();
    const a = { click: vi.fn(), href: '', download: '' };
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: revoke });
    vi.stubGlobal('document', {
      createElement: () => a,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
    downloadFile('f.txt', 'x', 'text/plain');
    expect(a.click).toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:x');
  });
});

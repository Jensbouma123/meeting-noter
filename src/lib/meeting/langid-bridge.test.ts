import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fakes = vi.hoisted(() => ({
  detectors: [] as Array<{ emit: (code: string, confidence: number) => void; pushes: unknown[][] }>,
}));

vi.mock('@/lib/asr/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/asr/browser')>()),
  getModelStatus: () => ({ status: 'cached' }),
  isConsentGiven: () => true,
}));

vi.mock('@/lib/langid', () => ({
  createLanguageDetector: () => {
    let cb: ((r: { code: string; name: string; confidence: number }) => void) | null = null;
    const fake = {
      pushes: [] as unknown[][],
      emit: (code: string, confidence: number) => cb?.({ code, name: code, confidence }),
    };
    fakes.detectors.push(fake);
    return {
      push: (...args: unknown[]) => fake.pushes.push(args),
      onLanguage: (fn: typeof cb) => {
        cb = fn;
        return () => {};
      },
      onError: () => () => {},
      dispose() {},
    };
  },
}));

beforeEach(async () => {
  fakes.detectors.length = 0;
  const store = { ...(await import('./session-reset')) };
  store.resetSession('both');
  const { resetLanguageOverride } = await import('./langid-bridge');
  resetLanguageOverride();
});

afterEach(async () => {
  const { stopLangId } = await import('./langid-bridge');
  stopLangId();
});

describe('language-ID bridge', () => {
  it("restarts detection on 'auto' when the language was picked before capture started", async () => {
    const { startLangId, setLanguageOverride } = await import('./langid-bridge');
    const { getState } = await import('./store-core');

    setLanguageOverride('nl');
    startLangId(['mic', 'system']);
    expect(fakes.detectors).toHaveLength(0);

    setLanguageOverride('auto');
    expect(fakes.detectors).toHaveLength(2);
    expect(getState().language).toMatchObject({ code: 'nl', locked: false });
  });

  it("applies the latest detection at once on 'auto'", async () => {
    const { startLangId, setLanguageOverride } = await import('./langid-bridge');
    const { getState } = await import('./store-core');

    startLangId(['mic']);
    setLanguageOverride('nl');
    fakes.detectors[0].emit('en', 0.8);
    expect(getState().language).toMatchObject({ code: 'nl', locked: true });

    setLanguageOverride('auto');
    expect(getState().language).toMatchObject({ code: 'en', locked: false, confidence: 0.8 });
  });

  it('keeps the most confident source instead of flapping to whichever reported last', async () => {
    const { startLangId } = await import('./langid-bridge');
    const { getState } = await import('./store-core');

    startLangId(['mic', 'system']);
    const [mic, system] = fakes.detectors;
    mic.emit('nl', 0.9);
    system.emit('en', 0.4);
    expect(getState().language?.code).toBe('nl');

    system.emit('en', 0.95);
    expect(getState().language?.code).toBe('en');
  });

  it('ignores low-confidence detections and keeps the last confident language', async () => {
    const { startLangId } = await import('./langid-bridge');
    const { getState } = await import('./store-core');

    startLangId(['mic']);
    const [mic] = fakes.detectors;
    mic.emit('ha', 0.3);
    expect(getState().language?.code).not.toBe('ha');
    mic.emit('nl', 0.9);
    mic.emit('en', 0.6);
    expect(getState().language?.code).toBe('nl');
    mic.emit('en', 0.6);
    expect(getState().language?.code).toBe('en');
  });

  it('hands the converted frame over for transfer rather than a second copy', async () => {
    const { startLangId, pushLangIdAudio } = await import('./langid-bridge');
    startLangId(['mic']);
    const pcm = new Int16Array([16384, -16384]).buffer;

    pushLangIdAudio('mic', pcm);

    const [samples, transfer] = fakes.detectors[0].pushes[0] as [Float32Array, boolean];
    expect(Array.from(samples)).toEqual([0.5, -0.5]);
    expect(transfer).toBe(true);
    expect(pcm.byteLength).toBe(4);
  });

  describe('ASR language hint', () => {
    it('on auto, detections never prompt the ASR with a language', async () => {
      const { startLangId } = await import('./langid-bridge');
      const { getAsrLanguageHint } = await import('@/lib/asr/browser/language-hint');
      startLangId(['mic']);
      const [mic] = fakes.detectors;

      mic.emit('nl', 0.95);
      mic.emit('nl', 0.95);
      expect(getAsrLanguageHint()).toBeNull();
      mic.emit('en', 0.95);
      mic.emit('en', 0.95);
      mic.emit('en', 0.95);
      expect(getAsrLanguageHint()).toBeNull();
    });

    it('a manual pick wins, and auto hands the ASR back to detection', async () => {
      const { startLangId, setLanguageOverride } = await import('./langid-bridge');
      const { getAsrLanguageHint } = await import('@/lib/asr/browser/language-hint');
      startLangId(['mic']);
      fakes.detectors[0].emit('nl', 0.9);

      setLanguageOverride('de');
      fakes.detectors[0].emit('en', 0.95);
      expect(getAsrLanguageHint()).toBe('de');

      setLanguageOverride('auto');
      expect(getAsrLanguageHint()).toBeNull();
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The registry's claims about what is on disk, and about what the user decided.
 *
 * Two things here exist because of how the reported failure looked from the
 * outside. The user pressed Download and the dialog closed, with no download
 * visibly starting and the preparation bar frozen — and the reason, both times,
 * was a *stale claim* rather than a bug in the downloader:
 *
 * - `recordConsent()` used to dismiss the consent dialog as a side effect of
 *   recording the decision, which meant the dialog's own Download button had to
 *   re-open the dialog the same call had just closed. Any caller that got that
 *   order wrong, or simply recorded consent, silently dismissed a dialog the
 *   user was looking at.
 * - `cached` is a `localStorage` claim about the browser's storage, not a
 *   reading of it. It goes stale when the user clears the database from the
 *   console — a supported way to reclaim a multi-gigabyte download — or when
 *   Safari evicts it. And it is the claim that decides everything: `cached`
 *   entries are filtered *out* of `initiateDownloads()`, so with a stale claim
 *   the Download button genuinely did nothing, Settings said "Ready", Record
 *   enabled… and nothing was ever transcribed.
 *
 * So consent and visibility are separate concerns, and there is now a way to
 * take a `cached` claim back.
 */

const KEY = 'parakeet-ttd';

async function loadRegistry() {
  const mod = await import('./model-registry');
  mod.initRegistry();
  mod.registerModel({
    key: KEY,
    modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
    displayName: 'Parakeet TDT 0.6B v3 (CPU)',
    estimatedSizeBytes: 670_479_942,
    backend: 'wasm',
  });
  return mod;
}

/**
 * The registry persists to `localStorage` and guards every access with a
 * `typeof` check, so it runs fine in Node — but a test that wants to pin what
 * survives a reload needs somewhere for the bytes to go. A real Map, not a
 * stub that pretends: the point is that the next `initRegistry()` reads back
 * what was written.
 */
function installLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
  return store;
}

beforeEach(() => {
  vi.resetModules();
  installLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('recordConsent', () => {
  it('records the decision without touching dialog visibility', async () => {
    const registry = await loadRegistry();
    registry.openDialog();
    expect(registry.getState().dialogVisible).toBe(true);

    registry.recordConsent('accepted', [KEY]);

    // The decision is recorded…
    expect(registry.isConsentGiven(KEY)).toBe(true);
    // …and the dialog is still open, because this function was asked to record
    // a decision, not to dismiss a surface. Every caller that wants a dismissal
    // says so itself.
    expect(registry.getState().dialogVisible).toBe(true);
  });

  it('leaves an automatic (null) visibility untouched rather than latching it to false', async () => {
    const registry = await loadRegistry();
    expect(registry.getState().dialogVisible).toBe(true);

    registry.recordConsent('accepted', [KEY]);

    // Never prompted → automatic rules → the dialog keeps showing so progress
    // is visible. A `false` override here would have been a latch: nothing
    // except an explicit `closeDialog()` clears it.
    expect(registry.getState().dialogVisible).toBe(true);
    registry.closeDialog();
  });

  it('still cancels an in-flight download when consent is withdrawn', async () => {
    const registry = await loadRegistry();
    registry.updateProgress(KEY, 1_000, 2_000, 'encoder-model.int8.onnx', 0, 0);
    registry.getModelStatus(KEY)!.status = 'downloading';

    registry.recordConsent('declined', []);

    expect(registry.getModelStatus(KEY)!.status).toBe('cancelled');
  });
});

describe('markNotCached', () => {
  it('takes back a cached claim that the storage no longer backs', async () => {
    const registry = await loadRegistry();
    registry.markCached(KEY);
    expect(registry.getModelStatus(KEY)!.status).toBe('cached');

    registry.updateProgress(KEY, 900, 1_000, 'encoder-model.int8.onnx', 100, 1);
    registry.markNotCached(KEY, 'The browser cache no longer has these files.');

    const after = registry.getModelStatus(KEY)!;
    // The status, the readiness flag *and* the stale progress bar all have to
    // go: `initiateDownloads()` filters on status, Record's readiness reads
    // `isReady`, and a leftover progress bar would show a full bar for a model
    // that does not exist.
    expect(after.status).toBe('not-downloaded');
    expect(after.isReady).toBe(false);
    expect(after.progress).toMatchObject({ loadedBytes: 0, percent: 0 });
    expect(after.error).toMatch(/no longer has these files/);
  });

  it('persists the change, so a reload does not resurrect the lie', async () => {
    const registry = await loadRegistry();
    registry.markCached(KEY);
    registry.markNotCached(KEY);

    vi.resetModules();
    const reloaded = await import('./model-registry');
    reloaded.initRegistry();
    // A fresh registration is what a page load does; it must not pick the
    // persisted `cached` back up.
    reloaded.registerModel({
      key: KEY,
      modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
      displayName: 'Parakeet TDT 0.6B v3 (CPU)',
      estimatedSizeBytes: 670_479_942,
      backend: 'wasm',
    });
    expect(reloaded.getModelStatus(KEY)!.status).not.toBe('cached');
  });
});

describe('resetAllEntries', () => {
  it('resets every entry including the cached ones', async () => {
    const registry = await loadRegistry();
    registry.markCached(KEY);
    registry.registerModel({
      key: 'diarization',
      modelRepo: 'other/repo',
      displayName: 'Diarization',
      estimatedSizeBytes: 1_000,
      backend: 'wasm',
      kind: 'diarization',
    });
    registry.markCached('diarization');

    registry.resetAllEntries();

    for (const key of [KEY, 'diarization']) {
      const e = registry.getModelStatus(key)!;
      expect(e.status).toBe('not-downloaded');
      expect(e.isReady).toBe(false);
    }
  });

  it('leaves a model this browser cannot run marked unavailable', async () => {
    // "Unavailable" is a property of the browser, not of the files on disk —
    // deleting the files does not make a WebGPU-less Safari able to run a model
    // it never could, and downgrading it to "download this" would send the user
    // into a download that can never work.
    const registry = await loadRegistry();
    registry.markUnavailable(KEY);

    registry.resetAllEntries();

    expect(registry.getModelStatus(KEY)!.status).toBe('unavailable');
  });

  it('is different from resetConsent, which deliberately keeps cached entries', async () => {
    const registry = await loadRegistry();
    registry.markCached(KEY);
    registry.recordConsent('accepted', [KEY]);

    registry.resetConsent();
    // Declining/re-asking is not "delete what is downloaded".
    expect(registry.getModelStatus(KEY)!.status).toBe('cached');
    expect(registry.isConsentGiven(KEY)).toBe(false);
  });
});

describe('copy-on-write entries', () => {
  it('changes the entries and entry identity on every mutation', async () => {
    const registry = await loadRegistry();
    const before = registry.getState().entries;
    const entryBefore = before[KEY];

    registry.markFailed(KEY, 'Download failed: 500');

    const after = registry.getState().entries;
    // Memoised consumers (`useMemo(..., [entries])`, selectors on
    // `entries[key]`) only re-run when the reference changes.
    expect(after).not.toBe(before);
    expect(after[KEY]).not.toBe(entryBefore);
    expect(entryBefore.status).toBe('not-downloaded');
    expect(after[KEY].status).toBe('failed');
  });
});

describe('updateProgress throttling', () => {
  it('does not write localStorage per chunk, and still persists the terminal state', async () => {
    const registry = await loadRegistry();
    const setItem = vi.spyOn(localStorage, 'setItem');

    for (let i = 1; i <= 1_000; i++) {
      registry.updateProgress(KEY, i * 1_000, 1_000_000, 'encoder-model.int8.onnx', 0, 0);
    }

    expect(setItem.mock.calls.length).toBeLessThanOrEqual(2);
    // The in-memory state is always current, throttled or not.
    expect(registry.getState().entries[KEY].progress.loadedBytes).toBe(1_000_000);

    registry.markCached(KEY);
    const persisted = JSON.parse(localStorage.getItem('mn.model-registry.v1')!);
    expect(persisted[KEY].status).toBe('cached');
    expect(persisted[KEY].progress.loadedBytes).toBe(1_000_000);
  });

  it('delivers the last progress of a burst with a trailing notify', async () => {
    vi.useFakeTimers();
    try {
      const registry = await loadRegistry();
      const listener = vi.fn();
      registry.subscribe(listener);
      registry.updateProgress(KEY, 1, 10, 'f', 0, 0);
      registry.updateProgress(KEY, 2, 10, 'f', 0, 0);
      registry.updateProgress(KEY, 3, 10, 'f', 0, 0);
      const immediate = listener.mock.calls.length;
      expect(immediate).toBeLessThanOrEqual(1);

      vi.advanceTimersByTime(300);
      expect(listener.mock.calls.length).toBe(immediate + 1);
      expect(registry.getState().entries[KEY].progress.loadedBytes).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('persisted downloading status', () => {
  it('reloads as not-downloaded, since no download survives a reload', async () => {
    const registry = await loadRegistry();
    registry.markDownloading(KEY, 1_000);

    vi.resetModules();
    // `initRegistry()` only reads persisted state in a browser.
    vi.stubGlobal('window', {});
    const reloaded = await import('./model-registry');
    reloaded.initRegistry();

    // Not consented, so autoResume never re-marks it: it must not stay frozen.
    expect(reloaded.getModelStatus(KEY)!.status).toBe('not-downloaded');
  });
});

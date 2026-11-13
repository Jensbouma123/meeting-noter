import { describe, expect, it } from 'vitest';
import { asrModelEntry } from './modelEntries';
import { deriveModelReadiness } from './modelReadiness';
import { asr, entry } from './modelReadiness.testUtils';

describe('deriveModelReadiness', () => {
  it('is not-downloaded before the registry has registered anything', () => {
    expect(deriveModelReadiness([], asr('ready'))).toBe('not-downloaded');
  });

  it('is not-downloaded while the speech model is still missing', () => {
    const entries = [entry({ key: 'parakeet-ttd', status: 'not-downloaded', isReady: false })];
    expect(deriveModelReadiness(entries, asr('blocked'))).toBe('not-downloaded');
  });

  it('keeps Record reachable when a cached model is blocked only by the crash guard', () => {
    const entries = [entry({ key: 'parakeet-ttd' })];
    expect(deriveModelReadiness(entries, asr('blocked'))).toBe('ready');
  });

  it('reports download progress with its own state, not a generic "loading"', () => {
    const entries = [entry({ key: 'parakeet-ttd', status: 'downloading', isReady: false })];
    expect(deriveModelReadiness(entries, asr('downloading'))).toBe('downloading');
  });

  it('is only ready once the engine itself is ready, not merely cached', () => {
    const entries = [entry({ key: 'parakeet-ttd' })];
    expect(deriveModelReadiness(entries, asr('idle'))).toBe('loading');
    expect(deriveModelReadiness(entries, asr('loading'))).toBe('loading');
    expect(deriveModelReadiness(entries, asr('ready'))).toBe('ready');
  });

  it('reports a failed engine, and a failed download, as failed', () => {
    const entries = [entry({ key: 'parakeet-ttd' })];
    expect(deriveModelReadiness(entries, asr('failed'))).toBe('failed');
    const failedEntry = [
      entry({ key: 'parakeet-ttd', status: 'failed', isReady: false, error: 'offline' }),
    ];
    expect(deriveModelReadiness(failedEntry, asr('failed'))).toBe('failed');
  });

  it('ignores optional models — a failed speaker-detection download must not block transcription', () => {
    const entries = [
      entry({ key: 'parakeet-ttd' }),
      entry({ key: 'diarization-turns', kind: 'diarization', status: 'failed', isReady: false }),
      entry({ key: 'langid-whisper-tiny', kind: 'langid', status: 'cancelled', isReady: false }),
    ];
    expect(deriveModelReadiness(entries, asr('ready'))).toBe('ready');
    expect(asrModelEntry(entries)?.key).toBe('parakeet-ttd');
  });

  it('ignores a still-downloading optional model rather than reporting "downloading"', () => {
    const entries = [
      entry({ key: 'parakeet-ttd' }),
      entry({ key: 'diarization-turns', kind: 'diarization', status: 'downloading', isReady: false }),
    ];
    expect(deriveModelReadiness(entries, asr('ready'))).toBe('ready');
  });

  it('is ready without an engine only when ASR is switched off entirely', () => {
    const entries = [entry({ key: 'parakeet-ttd' })];
    expect(deriveModelReadiness(entries, asr('disabled', false))).toBe('ready');
  });
});

'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { getMeetingDiagnostics, type MeetingDiagnostics } from '@/lib/meeting';
import type { TrackReadout } from '@/lib/meeting/capture';
import { useT } from '@/lib/i18n/useT';

const STORAGE_KEY = 'capture-debug';

/**
 * Whether the readout is on: `?debug=capture` in the URL turns it on (and
 * remembers it), `?debug=off` turns it off, otherwise
 * `localStorage['capture-debug'] === '1'`.
 */
export function captureDebugEnabled(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get('debug');
    if (param === 'capture') return true;
    if (param === 'off') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const CHANGE_EVENT = 'capture-debug-change';

/** Turn the readout on or off from the UI (persists like `?debug=capture`). */
export function setCaptureDebug(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
    // `?debug=` outranks storage, so drop it or the toggle would not stick.
    const url = new URL(window.location.href);
    if (url.searchParams.has('debug')) {
      url.searchParams.delete('debug');
      window.history.replaceState(null, '', url);
    }
  } catch {
    // Storage unavailable: nothing to persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Whether the readout is on right now, for UI that offers the toggle. */
export function subscribeCaptureDebug(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
}

/** Remember a `?debug=` choice for the next page load. */
function rememberDebugParam(): void {
  try {
    const param = new URLSearchParams(window.location.search).get('debug');
    if (param === 'capture') window.localStorage.setItem(STORAGE_KEY, '1');
    if (param === 'off') window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the URL still decides for this page.
  }
}

function dbfs(rms: number): string {
  return rms > 0 ? `${(20 * Math.log10(rms)).toFixed(0)} dB` : '-∞ (zero)';
}

function trackLine(t: TrackReadout): string {
  const flags = [
    t.readyState,
    t.muted ? 'MUTED' : null,
    t.enabled ? null : 'disabled',
    `ec=${String(t.echoCancellation ?? '?')}`,
    `agc=${String(t.autoGainControl ?? '?')}`,
    `ns=${String(t.noiseSuppression ?? '?')}`,
    t.sampleRate ? `${t.sampleRate} Hz` : null,
    t.channelCount ? `${t.channelCount} ch` : null,
  ].filter(Boolean);
  return `${t.label || '(no label)'} · ${flags.join(' · ')}`;
}

/**
 * Dev readout of what each capture source delivers and where it goes, so a
 * live session shows whether call audio reaches transcription: per source
 * the track settings, the level, how many frames were exact digital zero,
 * and the frames, speech, inferences, words and diarization turns it fed.
 */
export function CaptureDiagnostics() {
  const t = useT('dialogs');
  const enabled = useSyncExternalStore(subscribeCaptureDebug, captureDebugEnabled, () => false);
  const [diag, setDiag] = useState<MeetingDiagnostics | null>(null);

  useEffect(rememberDebugParam, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setDiag(getMeetingDiagnostics()), 500);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;
  const c = diag?.capture;
  return (
    <div
      data-testid="capture-diagnostics"
      className="fixed right-3 top-16 z-50 max-w-[min(30rem,calc(100vw-2rem))] rounded-md border border-border-subtle bg-surface/95 p-2 font-mono text-[11px] leading-snug shadow-lg"
    >
      <div className="mb-1 flex items-center justify-between gap-3 font-semibold">
        <span>{t('diagnostics.title')}</span>
        <button
          type="button"
          onClick={() => setCaptureDebug(false)}
          className="focus-ring rounded px-1.5 text-muted-foreground hover:text-foreground"
          aria-label={t('diagnostics.hide')}
        >
          ✕
        </button>
      </div>
      {!diag || !c ? (
        <div>{t('diagnostics.idle')}</div>
      ) : (
        <>
          <div>
            mode={c.mode} · ctx={c.contextState} {c.contextSampleRate} Hz · surface={c.displaySurface ?? '—'} · micEC=
            {String(c.micCancelsEcho)} · micReopens={c.micReopens} · postStop={String(diag.postStop)}
          </div>
          {c.shareError && <div className="text-warning-foreground">{t('diagnostics.shareFailed').replace('{error}', c.shareError)}</div>}
          {c.shareSilent && <div className="text-warning-foreground">{t('diagnostics.shareSilent')}</div>}
          {(['mic', 'system'] as const).map((source) => {
            const s = c.sources[source];
            const frames = diag.frames[source];
            const asr = diag.asr[source];
            const dia = diag.diarization[source];
            if (!s && !frames && !asr) return null;
            return (
              <div key={source} className="mt-1 border-t border-border-subtle pt-1">
                <div className="font-semibold">
                  {t(source === 'mic' ? 'diagnostics.mic' : 'diagnostics.call')}
                  {s ? '' : t('diagnostics.detached')}
                </div>
                {s?.tracks.map((t, i) => (
                  <div key={i} className="break-all">
                    {trackLine(t)}
                  </div>
                ))}
                {s && (
                  <div>
                    level {dbfs(s.rms)} · peak/s {dbfs(s.peakRms)} · frames {s.frames} · zero {s.zeroFrames} · sound{' '}
                    {s.soundFrames}
                  </div>
                )}
                <div>
                  clock {(diag.clock[source] ?? 0).toFixed(1)} s · to ASR {frames?.toAsr ?? 0}/{frames?.captured ?? 0}
                </div>
                <div>
                  ASR: chunked {asr?.frames ?? 0} · not-ready drops {asr?.droppedNotReady ?? 0} · speech{' '}
                  {asr?.speechFrames ?? 0} · floor {dbfs(asr?.noiseFloor ?? 0)} · windows {asr?.windows ?? 0} · words{' '}
                  {asr?.words ?? 0} · updates {asr?.segments ?? 0}
                </div>
                <div>
                  diarization:{' '}
                  {dia
                    ? `${dia.running ? 'running' : dia.waiting ? 'waiting' : 'stopped'} · heard ${dia.heardSeconds.toFixed(1)} s · turns ${dia.turns}`
                    : 'off'}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

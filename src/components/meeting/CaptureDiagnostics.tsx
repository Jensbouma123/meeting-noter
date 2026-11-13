'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { getMeetingDiagnostics, type MeetingDiagnostics } from '@/lib/meeting';
import { useT } from '@/lib/i18n/useT';
import { CaptureSourceReadout } from './CaptureSourceReadout';
import {
  captureDebugEnabled,
  persistDebugParamFromUrl,
  setCaptureDebug,
  subscribeCaptureDebug,
} from './captureDebugStorage';

export function CaptureDiagnostics() {
  const t = useT('dialogs');
  const enabled = useSyncExternalStore(subscribeCaptureDebug, captureDebugEnabled, () => false);
  const [diag, setDiag] = useState<MeetingDiagnostics | null>(null);

  useEffect(persistDebugParamFromUrl, []);

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
          <CaptureSourceReadout source="mic" diag={diag} />
          <CaptureSourceReadout source="system" diag={diag} />
        </>
      )}
    </div>
  );
}

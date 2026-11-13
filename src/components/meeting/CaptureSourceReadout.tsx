'use client';

import { useT } from '@/lib/i18n/useT';
import { formatDbfs, formatTrackLine } from './captureReadoutFormat';
import type { CaptureSourceReadoutProps } from './CaptureSourceReadout.types';

export function CaptureSourceReadout({ source, diag }: CaptureSourceReadoutProps) {
  const t = useT('dialogs');
  const s = diag.capture?.sources[source];
  const frames = diag.frames[source];
  const asr = diag.asr[source];
  const dia = diag.diarization[source];
  if (!s && !frames && !asr) return null;
  return (
    <div className="mt-1 border-t border-border-subtle pt-1">
      <div className="font-semibold">
        {t(source === 'mic' ? 'diagnostics.mic' : 'diagnostics.call')}
        {s ? '' : t('diagnostics.detached')}
      </div>
      {s?.tracks.map((track, i) => (
        <div key={i} className="break-all">
          {formatTrackLine(track)}
        </div>
      ))}
      {s && (
        <div>
          level {formatDbfs(s.rms)} · peak/s {formatDbfs(s.peakRms)} · frames {s.frames} · zero {s.zeroFrames} · sound{' '}
          {s.soundFrames}
        </div>
      )}
      <div>
        clock {(diag.clock[source] ?? 0).toFixed(1)} s · to ASR {frames?.toAsr ?? 0}/{frames?.captured ?? 0}
      </div>
      <div>
        ASR: chunked {asr?.frames ?? 0} · not-ready drops {asr?.droppedNotReady ?? 0} · speech{' '}
        {asr?.speechFrames ?? 0} · floor {formatDbfs(asr?.noiseFloor ?? 0)} · windows {asr?.windows ?? 0} · words{' '}
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
}

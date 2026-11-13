import { useEffect, useEffectEvent, useRef } from 'react';
import { decodeBytes } from '../audio';
import { SAMPLE_RATE } from '../constants';
import { errorMessage } from '../errorMessage';
import type { BenchAutostartParams } from '../types';

export function useBenchAutostart({
  autostart,
  fileUrl,
  clipRef,
  appendLog,
  setFileName,
  setPhase,
  setReportError,
  run,
}: BenchAutostartParams) {
  const autoStarted = useRef(false);
  const start = useEffectEvent(() => {
    if (autoStarted.current || !autostart) return;
    autoStarted.current = true;
    (async () => {
      try {
        if (fileUrl) {
          appendLog(`fetching ${fileUrl}…`);
          const res = await fetch(fileUrl);
          if (!res.ok) throw new Error(`clip fetch ${res.status} for ${fileUrl}`);
          setFileName(fileUrl.split('/').pop() ?? fileUrl);
          clipRef.current = await decodeBytes(await res.arrayBuffer());
          appendLog(`clip: ${(clipRef.current.length / SAMPLE_RATE).toFixed(1)} s @ 16 kHz mono`);
        }
        await run();
      } catch (err) {
        const message = errorMessage(err);
        appendLog(`FAILED: ${message}`);
        setReportError(message);
        setPhase('error');
      }
    })();
  });
  useEffect(() => {
    start();
  }, []);
}

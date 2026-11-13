import { useCallback, useState } from 'react';
import { BrowserASREngine } from '@/lib/asr/browser/parakeet';
import {
  configFromManifest,
  detectAsrBackend,
  manifestForBackend,
  type AsrBackend,
  type BrowserSegment,
} from '@/lib/asr/browser';
import { syntheticClip } from '../audio';
import { SAMPLE_RATE } from '../constants';
import { errorMessage } from '../errorMessage';
import { manifestWithEncoder } from '../manifestWithEncoder';
import type { BenchPhase, BenchReport, BenchRunParams, RunOverrides, RunResult } from '../types';

const silentEvents = (onError: (message: string) => void) => ({
  onSegment: () => {},
  onLanguage: () => {},
  onStatusChange: () => {},
  onError,
});

export function useBenchRun({ backend, encoder, runs, clipRef, appendLog }: BenchRunParams) {
  const [phase, setPhase] = useState<BenchPhase>('idle');
  const [report, setReport] = useState<BenchReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const run = useCallback(
    async (overrides?: RunOverrides) => {
      setPhase('loading');
      setReport(null);
      setReportError(null);
      const useBackend = overrides?.backend ?? backend;
      const useEncoder = overrides?.encoder ?? encoder;
      const useRuns = overrides?.runs ?? runs;
      try {
        const resolved: AsrBackend = useBackend === 'auto' ? await detectAsrBackend() : useBackend;
        const manifest = manifestWithEncoder(manifestForBackend(resolved), useEncoder);
        appendLog(`backend=${resolved} encoder=${manifest.files[0]} files=${manifest.files.join(',')}`);
        const engineErrors: string[] = [];
        const engine = new BrowserASREngine(
          { ...configFromManifest(manifest) },
          silentEvents((m) => {
            engineErrors.push(m);
          }),
        );
        const t0 = performance.now();
        await engine.ensureLoaded();
        const loadMs = performance.now() - t0;
        for (const m of engineErrors) appendLog(`engine: ${m}`);
        appendLog(`loaded in ${(loadMs / 1000).toFixed(1)} s`);

        const clip = clipRef.current ?? syntheticClip();
        const audioSeconds = clip.length / SAMPLE_RATE;
        appendLog(`transcribing ${audioSeconds.toFixed(1)} s x ${useRuns}…`);
        setPhase('running');
        const results: RunResult[] = [];
        for (let i = 0; i < useRuns; i++) {
          const start = performance.now();
          const out = await engine.transcribe(clip, 'mic', 'mic:0', true);
          const transcribeMs = performance.now() - start;
          if (out.error) throw new Error(out.error);
          const text = out.segments.map((s: BrowserSegment) => s.text).join(' ').trim();
          results.push({ run: i + 1, transcribeMs, rtf: transcribeMs / 1000 / audioSeconds, text });
          appendLog(`run ${i + 1}: ${(transcribeMs / 1000).toFixed(2)} s (RTF ${(results[i].rtf).toFixed(3)})`);
        }
        const meanRtf = results.reduce((a, r) => a + r.rtf, 0) / results.length;
        setReport({
          backend: resolved,
          encoderQuant: manifest.encoderQuant,
          encoderFile: manifest.files[0],
          audioSeconds,
          runs: useRuns,
          loadMs,
          results,
          meanRtf,
          userAgent: navigator.userAgent,
        });
        setPhase('done');
      } catch (err) {
        const message = errorMessage(err);
        appendLog(`FAILED: ${message}`);
        setReportError(message);
        setPhase('error');
      }
    },
    [backend, encoder, runs, clipRef, appendLog],
  );

  return { phase, setPhase, report, reportError, setReportError, run };
}

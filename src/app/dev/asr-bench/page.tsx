'use client';

/**
 * Dev-only ASR benchmark (`/dev/asr-bench`, unlinked from the UI).
 *
 * Loads a manifest variant (WebGPU/fp16 or WASM/int8) through the same
 * `BrowserASREngine` the recorder uses, transcribes a clip N times, and
 * reports load time, per-run transcribe time and the real-time factor
 * (transcribe_seconds / audio_seconds — below 1.0 means faster than realtime).
 *
 * The clip is either generated in-page (10 s of vowel-like harmonics — good
 * for warm-up/RTF plumbing, meaningless for accuracy) or an uploaded audio
 * file (decoded + resampled to 16 kHz mono — use a real speech recording
 * for WER comparisons between variants).
 *
 * How to compare Safari WebGPU/fp16 against WASM/int8 on-device:
 *  1. `python3 scripts/convert-parakeet-v3.py` (builds `public/models/…`),
 *     then `npm run dev`.
 *  2. Open this page in Safari, run the WebGPU preset, note RTF + transcript.
 *  3. Run the WASM preset on the same clip, compare.
 * Results paste straight into `webgpu-int8-spike.md` (copy button below).
 *
 * With `?autostart=1` the page needs no clicks and no driver: it posts its own
 * result to `/api/dev/bench-result` (dev only) and, with `?next=`, reloads
 * itself onto the next variant — so one opened URL walks fp16 -> q4f16 -> int8,
 * each in a fresh tab process. Score the files with `scripts/asr-bench-score.mjs`.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BrowserASREngine } from '@/lib/asr/browser/parakeet';
import {
  configFromManifest,
  detectAsrBackend,
  manifestForBackend,
  PARAKEET_TDT_V3_WEBGPU,
  PARAKEET_TDT_V3_WEBGPU_FP16,
  type AsrBackend,
  type AsrModelManifest,
} from '@/lib/asr/browser';
import type { BrowserSegment } from '@/lib/asr/browser';
import {
  encoderQuantForFile,
  nextHref,
  requestedVariant,
  variantForEncoderFile,
} from './chain';

const SAMPLE_RATE = 16000;
const DEFAULT_RUNS = 3;

interface RunResult {
  run: number;
  transcribeMs: number;
  rtf: number;
  text: string;
}

interface BenchReport {
  backend: AsrBackend;
  encoderQuant: string;
  encoderFile: string;
  audioSeconds: number;
  runs: number;
  loadMs: number;
  results: RunResult[];
  meanRtf: number;
  userAgent: string;
}

/** The encoder the app actually defaults to — the chain's first position. */
const DEFAULT_ENCODER = encoderQuantForFile(PARAKEET_TDT_V3_WEBGPU.files[0]) ?? 'q4f16';

function silentEvents(onError: (message: string) => void) {
  return {
    onSegment: () => {},
    onLanguage: () => {},
    onStatusChange: () => {},
    onError,
  };
}

/** 10 s of vowel-like harmonics — deterministic, no network, no mic. */
function syntheticClip(seconds = 10): Float32Array {
  const n = seconds * SAMPLE_RATE;
  const out = new Float32Array(n);
  let seed = 0x600d;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff - 0.5;
  };
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const f0 = 110 + 20 * Math.sin((2 * Math.PI * 0.4 * i) / n);
    out[i] =
      0.5 * Math.sin(2 * Math.PI * f0 * t) +
      0.3 * Math.sin(2 * Math.PI * 2 * f0 * t) +
      0.15 * Math.sin(2 * Math.PI * 3 * f0 * t) +
      0.05 * rand();
  }
  return out;
}

/** Decode raw audio bytes (upload or `?file=` fetch) to 16 kHz mono Float32. */
async function decodeBytes(raw: ArrayBuffer): Promise<Float32Array> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error('No WebAudio in this browser.');
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(raw.slice(0));
    const targetLen = Math.floor((decoded.length * SAMPLE_RATE) / decoded.sampleRate);
    const offline = new OfflineAudioContext(1, targetLen, SAMPLE_RATE);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0).slice();
  } finally {
    void ctx.close();
  }
}

/**
 * Headless/automation query params (all optional):
 * - `backend=webgpu|wasm|auto` — manifest variant (default `auto`).
 * - `encoder=q4f16|fp16` — WebGPU encoder override. Omitting it benches the
 *   app's own default (`model-manifest.ts`'s first fallback rung, currently
 *   `q4f16`); naming the other one benches the fallback rung instead. Either
 *   way it is a real manifest, resolved through the same `fileUrlOverrides`
 *   the recorder downloads it with, so resume, cache key and offline
 *   behaviour are unchanged. Anything else is ignored.
 * - `file=/bench/xxx.wav` — same-origin audio URL, fetched and decoded like
 *   an upload (dev server serves `public/bench/`, which is gitignored).
 * - `runs=N` — transcribe repetitions (default 3).
 * - `autostart=1` — fetch `file` (when given), then run immediately.
 * - `next=q4f16|fp16|int8|<url>` — chain: after this run has posted its result
 *   the page navigates (full reload, so the next variant starts with a fresh
 *   GPU process) to the next variant's URL, with the *following* chain position
 *   in its own `next`. A URL or path starting with `/` or `http(s)://` is
 *   navigated verbatim.
 *
 * With `autostart=1` the machine-readable report is POSTed to
 * `POST /api/dev/bench-result` (dev only) the moment the run reaches phase
 * `done` or `error`, and a full reload is a fresh run: a crashed tab posts
 * nothing, so the missing file is the crash signal. The same JSON is also
 * rendered into `#bench-result` (`phase: 'done' | 'error'`).
 */
function manifestWithEncoder(base: AsrModelManifest, encoder: string | null): AsrModelManifest {
  if (base.asrBackend !== 'webgpu' || encoder === null) return base;
  if (encoder === 'fp16') return PARAKEET_TDT_V3_WEBGPU_FP16;
  if (encoder === 'q4f16') return PARAKEET_TDT_V3_WEBGPU;
  return base;
}

function AsrBench() {
  const searchParams = useSearchParams();
  // Automation params are one-shot (read on mount): initialising state from
  // them keeps the effect below side-effect-only (fetch + run).
  const [backend, setBackend] = useState<AsrBackend | 'auto'>(() => {
    const b = searchParams.get('backend');
    return b === 'webgpu' || b === 'wasm' ? b : 'auto';
  });
  const [encoder, setEncoder] = useState<string | null>(() => {
    const e = searchParams.get('encoder');
    return e === 'q4f16' || e === 'fp16' ? e : null;
  });
  const [runs, setRuns] = useState(() => {
    const r = searchParams.get('runs');
    return r !== null ? Math.max(1, Math.min(10, Number(r) || 1)) : DEFAULT_RUNS;
  });
  const [fileUrl] = useState<string | null>(() => searchParams.get('file'));
  const [autostart] = useState(() => searchParams.get('autostart') === '1');
  const [next] = useState<string | null>(() => searchParams.get('next'));
  const [fileName, setFileName] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'running' | 'done' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [report, setReport] = useState<BenchReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const clipRef = useRef<Float32Array | null>(null);
  const autoStarted = useRef(false);
  const posted = useRef(false);

  const appendLog = useCallback((line: string) => {
    setLog((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} ${line}`]);
  }, []);

  /**
   * The one machine-readable payload: what `#bench-result` renders and what the
   * dev-only sink receives, byte for byte, so a run read off the page and a run
   * read off disk can never disagree.
   */
  const benchResult = useMemo<Record<string, unknown>>(() => {
    if (report) return { phase, file: fileUrl, ...report };
    if (reportError !== null || phase === 'error') {
      return { phase, file: fileUrl, error: reportError ?? log[log.length - 1] ?? 'unknown' };
    }
    return { phase };
  }, [phase, report, reportError, fileUrl, log]);

  /**
   * `webgpu-q4f16` / `webgpu-fp16` / `wasm-int8` — the §3 variant ids.
   *
   * Derived from the encoder file the run actually loaded, not from the
   * manifest's `encoderQuant` field: a run that swapped the file kept the old
   * `encoderQuant`, so the §3 table filed a q4f16 run as `webgpu-fp16` and
   * compared one encoder against itself. Before a run has a result there is no
   * loaded file, so the URL's request is reported instead — which is what
   * makes a run that posted nothing attributable.
   */
  const variant = report
    ? variantForEncoderFile(report.backend, report.encoderFile)
    : requestedVariant(backend, encoder, DEFAULT_ENCODER);

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setFileName(file.name);
      appendLog(`decoding ${file.name}…`);
      clipRef.current = await decodeBytes(await file.arrayBuffer());
      appendLog(`clip: ${(clipRef.current.length / SAMPLE_RATE).toFixed(1)} s @ 16 kHz mono`);
    },
    [appendLog],
  );

  const run = useCallback(
    async (overrides?: { backend?: AsrBackend | 'auto'; encoder?: string | null; runs?: number }) => {
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
        const message = err instanceof Error ? err.message : String(err);
        appendLog(`FAILED: ${message}`);
        setReportError(message);
        setPhase('error');
      }
    },
    [backend, encoder, runs, appendLog],
  );

  // Automation: `?backend=&encoder=&runs=&file=&autostart=1` — fetch the clip
  // (if any), then run without human clicks. Runs once per page load; the
  // param values come from the state initialisers above, so this effect only
  // performs the fetch + run side effects.
  useEffect(() => {
    if (autoStarted.current || !autostart) return;
    autoStarted.current = true;
    // Param values come from the state initialisers above (already applied on
    // this render); `run` reads them from closure state.
    const f = fileUrl;
    (async () => {
      try {
        if (f) {
          appendLog(`fetching ${f}…`);
          const res = await fetch(f);
          if (!res.ok) throw new Error(`clip fetch ${res.status} for ${f}`);
          setFileName(f.split('/').pop() ?? f);
          clipRef.current = await decodeBytes(await res.arrayBuffer());
          appendLog(`clip: ${(clipRef.current.length / SAMPLE_RATE).toFixed(1)} s @ 16 kHz mono`);
        }
        await run();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        appendLog(`FAILED: ${message}`);
        setReportError(message);
        setPhase('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automation sink: an `autostart=1` run hands its result to the dev server
  // (`POST /api/dev/bench-result` → `test-audio/bench-results/*.json`, scored
  // by `scripts/asr-bench-score.mjs`) and, when `next` is set, reloads the tab
  // onto the following chain position. Chain on regardless of whether the POST
  // succeeded — stalling on one failed variant would strand the whole chain,
  // and the missing file is itself a recorded outcome. `posted` keeps this
  // once per page load even though the effect re-runs on every log line.
  useEffect(() => {
    if (!autostart || posted.current) return;
    if (phase !== 'done' && phase !== 'error') return;
    posted.current = true;
    const body = JSON.stringify({
      ...benchResult,
      variant,
      userAgent: navigator.userAgent,
      postedAt: new Date().toISOString(),
      href: window.location.href,
    });
    (async () => {
      try {
        const res = await fetch('/api/dev/bench-result', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          signal: AbortSignal.timeout(30_000),
        });
        const text = await res.text();
        appendLog(res.ok ? `posted result: ${text}` : `result POST ${res.status}: ${text.slice(0, 200)}`);
      } catch (err) {
        appendLog(`result POST failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      const href = next ? nextHref(next, window.location.href, DEFAULT_ENCODER) : null;
      if (href) {
        appendLog(`chaining to ${href}`);
        // `replace`, not `assign`: a three-variant chain should not leave three
        // history entries to walk back through.
        window.location.replace(href);
      }
    })();
  }, [autostart, phase, benchResult, variant, next, appendLog]);

  const copyReport = useCallback(() => {
    if (!report) return;
    const lines = [
      `backend=${report.backend} encoder=${report.encoderQuant} clip=${report.audioSeconds.toFixed(1)}s`,
      `load=${(report.loadMs / 1000).toFixed(1)}s meanRTF=${report.meanRtf.toFixed(3)}`,
      ...report.results.map(
        (r) => `run${r.run}: ${(r.transcribeMs / 1000).toFixed(2)}s RTF=${r.rtf.toFixed(3)} text="${r.text.slice(0, 120)}"`,
      ),
      `UA: ${report.userAgent}`,
    ];
    void navigator.clipboard.writeText(lines.join('\n'));
    appendLog('report copied to clipboard');
  }, [report, appendLog]);

  const busy = phase === 'loading' || phase === 'running';

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui' }}>
      <h1>ASR bench (dev only)</h1>
      <p>Same engine the recorder uses. Nothing is uploaded; the model caches in IndexedDB.</p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          Backend{' '}
          <select value={backend} onChange={(e) => setBackend(e.target.value as AsrBackend | 'auto')} disabled={busy}>
            <option value="auto">auto (device default)</option>
            <option value="webgpu">webgpu ({DEFAULT_ENCODER})</option>
            <option value="wasm">wasm (int8)</option>
          </select>
        </label>
        <label>
          Encoder{' '}
          <select
            value={encoder ?? 'default'}
            onChange={(e) => setEncoder(e.target.value === 'default' ? null : e.target.value)}
            disabled={busy || backend !== 'webgpu'}
            title="WebGPU-only: leave on default to bench the app's own WebGPU encoder, or pick the fallback rung"
          >
            <option value="default">default ({DEFAULT_ENCODER})</option>
            <option value="q4f16">q4f16</option>
            <option value="fp16">fp16</option>
          </select>
        </label>
        <label>
          Runs{' '}
          <input
            type="number"
            min={1}
            max={10}
            value={runs}
            disabled={busy}
            onChange={(e) => setRuns(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            style={{ width: 56 }}
          />
        </label>
        <label>
          Speech clip (optional){' '}
          <input
            type="file"
            accept="audio/*"
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0]).catch((err: unknown) => appendLog(`decode failed: ${String(err)}`))}
          />
        </label>
        <button onClick={() => void run()} disabled={busy}>
          {busy ? 'Running…' : 'Run benchmark'}
        </button>
        {fileName && <span>clip: {fileName}</span>}
        {!fileName && <span>(no file = 10 s synthetic tone)</span>}
      </div>
      {report && (
        <section style={{ marginTop: '1rem', border: '1px solid #888', padding: '0.75rem' }}>
          <h2>
            {report.backend}/{report.encoderQuant}: mean RTF {report.meanRtf.toFixed(3)}
          </h2>
          <ul>
            {report.results.map((r) => (
              <li key={r.run}>
                run {r.run}: {(r.transcribeMs / 1000).toFixed(2)} s — “{r.text || '(no speech detected)'}”
              </li>
            ))}
          </ul>
          <button onClick={copyReport}>Copy report</button>
        </section>
      )}
      <pre style={{ marginTop: '1rem', background: '#111', color: '#ddd', padding: '0.75rem', minHeight: 120 }}>
        {log.join('\n')}
      </pre>
      {/* Machine-readable report for headless runs: `scripts/asr-bench-run.mjs`
          waits for `data-phase` to become `done` or `error`, then parses
          `#bench-result`; an `autostart=1` run also POSTs this exact object to
          `/api/dev/bench-result`. Always rendered so the waiter never hangs on
          a missing node. */}
      <pre
        id="bench-result"
        data-phase={phase}
        data-backend={report?.backend ?? ''}
        data-variant={variant}
        style={{ display: 'none' }}
      >
        {JSON.stringify(benchResult)}
      </pre>
    </main>
  );
}

export default function AsrBenchPage() {
  return (
    <Suspense>
      <AsrBench />
    </Suspense>
  );
}

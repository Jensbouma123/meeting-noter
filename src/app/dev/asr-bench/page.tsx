'use client';

import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { requestedVariant, variantForEncoderFile } from './chain';
import { decodeBytes } from './audio';
import { SAMPLE_RATE } from './constants';
import { DEFAULT_ENCODER } from './defaultEncoder';
import { BenchControls } from './components/BenchControls';
import { BenchReportSection } from './components/BenchReportSection';
import { useBenchAutostart } from './hooks/useBenchAutostart';
import { useBenchLog } from './hooks/useBenchLog';
import { useBenchParams } from './hooks/useBenchParams';
import { useBenchResultSink } from './hooks/useBenchResultSink';
import { useBenchRun } from './hooks/useBenchRun';

function AsrBench() {
  const params = useBenchParams();
  const { backend, encoder, runs, fileUrl, autostart, next } = params;
  const [fileName, setFileName] = useState<string | null>(null);
  const { log, appendLog } = useBenchLog();
  const clipRef = useRef<Float32Array | null>(null);
  const { phase, setPhase, report, reportError, setReportError, run } = useBenchRun({
    backend, encoder, runs, clipRef, appendLog,
  });

  const benchResult = useMemo<Record<string, unknown>>(() => {
    if (report) return { phase, file: fileUrl, ...report };
    if (reportError !== null || phase === 'error') {
      return { phase, file: fileUrl, error: reportError ?? log[log.length - 1] ?? 'unknown' };
    }
    return { phase };
  }, [phase, report, reportError, fileUrl, log]);

  const variant = report
    ? variantForEncoderFile(report.backend, report.encoderFile)
    : requestedVariant(backend, encoder, DEFAULT_ENCODER);

  const loadClipFromFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setFileName(file.name);
      appendLog(`decoding ${file.name}…`);
      clipRef.current = await decodeBytes(await file.arrayBuffer());
      appendLog(`clip: ${(clipRef.current.length / SAMPLE_RATE).toFixed(1)} s @ 16 kHz mono`);
    },
    [appendLog],
  );

  useBenchAutostart({ autostart, fileUrl, clipRef, appendLog, setFileName, setPhase, setReportError, run });
  useBenchResultSink({ autostart, phase, benchResult, variant, next, appendLog });

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui' }}>
      <h1>ASR bench (dev only)</h1>
      <p>Same engine the recorder uses. Nothing is uploaded; the model caches in IndexedDB.</p>
      <BenchControls
        backend={backend}
        encoder={encoder}
        runs={runs}
        busy={phase === 'loading' || phase === 'running'}
        fileName={fileName}
        onBackendChange={params.setBackend}
        onEncoderChange={params.setEncoder}
        onRunsChange={params.setRuns}
        onFile={loadClipFromFile}
        onFileError={(err) => appendLog(`decode failed: ${String(err)}`)}
        onRun={() => void run()}
      />
      {report && <BenchReportSection report={report} onCopied={() => appendLog('report copied to clipboard')} />}
      <pre style={{ marginTop: '1rem', background: '#111', color: '#ddd', padding: '0.75rem', minHeight: 120 }}>
        {log.join('\n')}
      </pre>
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

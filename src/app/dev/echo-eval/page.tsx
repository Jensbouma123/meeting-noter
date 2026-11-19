'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEchoEval } from './useEchoEval';

function EchoEval() {
  const params = useSearchParams();
  const limit = Number(params.get('limit')) || null;
  const { progress, start } = useEchoEval(params.get('autostart') === '1', params.get('fake') === '1', limit);
  const busy = progress.phase === 'loading' || progress.phase === 'running';
  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui' }}>
      <h1>Echo-bleed eval (dev only)</h1>
      <p>Runs every case through the app&apos;s live ASR and merge path, then writes the report.</p>
      <button type="button" disabled={busy} onClick={() => void start()}>
        Start
      </button>
      <p id="echo-eval-status" data-phase={progress.phase}>
        {progress.phase}: {progress.done}/{progress.total} {progress.message}
      </p>
    </main>
  );
}

export default function EchoEvalPage() {
  return (
    <Suspense>
      <EchoEval />
    </Suspense>
  );
}

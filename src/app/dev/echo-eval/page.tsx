'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SHARD_PROGRESS_MESSAGE } from '../../../../scripts/echo-eval/lib/grid-url';
import { parseShard } from '../../../../scripts/echo-eval/lib/shard';
import type { EvalSet } from '../../../../scripts/echo-eval/types/eval-set';
import { useEchoEval } from './useEchoEval';

const SETS: readonly EvalSet[] = ['cases', 'meetings', 'external'];
const setOf = (raw: string | null): EvalSet => SETS.find((s) => s === raw) ?? 'cases';

function EchoEval() {
  const params = useSearchParams();
  const limit = Number(params.get('limit')) || null;
  const shard = parseShard(params.get('shard'), params.get('shards'));
  const { progress, start } = useEchoEval(
    params.get('autostart') === '1',
    params.get('fake') === '1',
    limit,
    setOf(params.get('set')),
    shard,
  );
  const status = `${progress.phase}: ${progress.done}/${progress.total} ${progress.message}`;
  const shardIndex = shard?.index;
  useEffect(() => {
    if (shardIndex === undefined || window.parent === window) return;
    window.parent.postMessage(
      { type: SHARD_PROGRESS_MESSAGE, shard: shardIndex, text: status, phase: progress.phase },
      window.location.origin,
    );
  }, [shardIndex, status, progress.phase]);
  const busy = progress.phase === 'loading' || progress.phase === 'running';
  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui' }}>
      <h1>Echo-bleed eval (dev only){shard ? ` shard ${shard.index + 1}/${shard.count}` : ''}</h1>
      <p>Runs every case through the app&apos;s live ASR and merge path, then writes the report.</p>
      <button type="button" disabled={busy} onClick={() => void start()}>
        Start
      </button>
      <p id="echo-eval-status" data-phase={progress.phase}>
        {status}
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

'use client';

import { Suspense, useEffect, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MAX_GRID_SHARDS,
  SHARD_PROGRESS_MESSAGE,
  WARM_SHARD,
  cellSources,
  gridShape,
  isWarmPhase,
  parseGridShards,
  shardFrameUrls,
} from '../../../../../scripts/echo-eval/lib/grid-url';
import { ShardCell } from './ShardCell';

function useShardProgress(): { texts: Record<number, string>; warm: boolean } {
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== SHARD_PROGRESS_MESSAGE) return;
      const { shard, text, phase } = e.data as { shard: number; text: string; phase: string };
      setTexts((prev) => ({ ...prev, [shard]: text }));
      if (shard === WARM_SHARD && isWarmPhase(phase)) setWarm(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return { texts, warm };
}

function EchoEvalGrid() {
  const params = useSearchParams();
  const shards = parseGridShards(params.get('shards'));
  const { texts, warm } = useShardProgress();
  if (!shards) {
    return <p style={{ padding: '1rem' }}>Pass shards=2..{MAX_GRID_SHARDS}, e.g. /dev/echo-eval/grid?shards=4</p>;
  }
  const { cols, rows } = gridShape(shards);
  const style = { '--cols': `repeat(${cols}, minmax(0, 1fr))`, '--rows': `repeat(${rows}, minmax(0, 1fr))` };
  return (
    <main
      style={style as CSSProperties}
      className="grid h-dvh w-full grid-cols-1 auto-rows-[100dvh] gap-1 overflow-auto bg-neutral-200 p-1 md:auto-rows-auto md:[grid-template-columns:var(--cols)] md:[grid-template-rows:var(--rows)] md:overflow-hidden"
    >
      {cellSources(shardFrameUrls(params, shards), warm).map((src, i) => (
        <ShardCell key={i} index={i} count={shards} src={src} text={texts[i]} />
      ))}
    </main>
  );
}

export default function EchoEvalGridPage() {
  return (
    <Suspense>
      <EchoEvalGrid />
    </Suspense>
  );
}

'use client';

import { Suspense, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { MAX_GRID_SHARDS, gridShape, parseGridShards, shardFrameUrls } from '../../../../../scripts/echo-eval/lib/grid-url';
import { ShardCell } from './ShardCell';
import { useShardProgress } from './useShardProgress';

function EchoEvalGrid() {
  const params = useSearchParams();
  const shards = parseGridShards(params.get('shards'));
  const texts = useShardProgress();
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
      {shardFrameUrls(params, shards).map((src, i) => (
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

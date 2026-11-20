import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import type { EvalSet } from '../../../../scripts/echo-eval/types/eval-set';
import type { Shard } from '../../../../scripts/echo-eval/types/shard';
import { createFakeEngine } from './fakeEngine';
import { createLiveEngine } from './liveEngine';
import { runEval } from './runEval';
import type { EvalProgress } from './types';

const IDLE: EvalProgress = { phase: 'idle', done: 0, total: 0, message: '' };

export function useEchoEval(autostart: boolean, fake: boolean, limit: number | null, set: EvalSet = 'cases', shard: Shard | null = null) {
  const [progress, setProgress] = useState<EvalProgress>(IDLE);
  const started = useRef(false);
  const start = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    const engine = fake ? createFakeEngine() : await createLiveEngine(set !== 'cases');
    await runEval(engine, limit, setProgress, set, shard);
    started.current = false;
  }, [fake, limit, set, shard]);
  const auto = useEffectEvent(() => {
    if (autostart) void start();
  });
  useEffect(() => {
    auto();
  }, []);
  return { progress, start };
}

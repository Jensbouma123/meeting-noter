import { renderCase } from '../../../../scripts/echo-eval/lib/render-case';
import { renderMeeting } from '../../../../scripts/echo-eval/lib/meeting-render';
import { runCase } from '../../../../scripts/echo-eval/lib/run-case';
import { runMeeting } from '../../../../scripts/echo-eval/lib/run-meeting';
import type { EvalCase } from '../../../../scripts/echo-eval/types/eval-case';
import type { MeetingCase } from '../../../../scripts/echo-eval/types/meeting-case';
import type { Shard } from '../../../../scripts/echo-eval/types/shard';
import type { Utterance } from '../../../../scripts/echo-eval/types/utterance';
import { fetchAudio, fetchPlan, postBegin, postFail, postFinish, postResult } from './api';
import type { EvalEngine, EvalProgress } from './types';

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const uttIds = (c: EvalCase | MeetingCase): (string | null)[] =>
  'turns' in c ? c.turns.map((t) => t.utt) : [c.systemUtt, c.micUtt];

export async function runEval(
  engine: EvalEngine,
  limit: number | null,
  report: (p: EvalProgress) => void,
  meetings = false,
  shard: Shard | null = null,
): Promise<void> {
  const fake = engine.backend === 'fake';
  try {
    report({ phase: 'loading', done: 0, total: 0, message: 'loading plan' });
    const plan = await fetchPlan(limit, fake, meetings, shard);
    const finished = new Set(plan.done);
    const todo = plan.cases.filter((c) => !finished.has(c.id));
    await postBegin({ backend: engine.backend, userAgent: navigator.userAgent, startedAt: new Date().toISOString() }, fake, meetings, shard);
    report({ phase: 'loading', done: 0, total: todo.length, message: `loading speech model (${engine.backend})` });
    await engine.ensureReady();
    const cache = new Map<string, Utterance>();
    const need = async (id: string | null) => {
      if (id === null || cache.has(id)) return;
      cache.set(id, { id, speaker: '', seconds: 0, split: 'dev', audio: await fetchAudio(id) });
    };
    for (const [i, c] of todo.entries()) {
      report({ phase: 'running', done: i, total: todo.length, message: c.id });
      for (const id of uttIds(c)) await need(id);
      const result =
        'turns' in c
          ? await runMeeting(c, renderMeeting(c, cache), engine.asr, engine.store)
          : await runCase(c, renderCase(c, cache), engine.asr, engine.store);
      await postResult(result, fake, meetings, shard);
    }
    await postFinish(fake, meetings, shard);
    report({ phase: 'done', done: todo.length, total: todo.length, message: 'report written' });
  } catch (err) {
    const message = errorText(err);
    await postFail(message, fake, meetings, shard).catch(() => {});
    report({ phase: 'error', done: 0, total: 0, message });
  }
}

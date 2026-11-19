import { renderCase } from '../../../../scripts/echo-eval/lib/render-case';
import { runCase } from '../../../../scripts/echo-eval/lib/run-case';
import type { Utterance } from '../../../../scripts/echo-eval/types/utterance';
import { fetchAudio, fetchPlan, postBegin, postFail, postFinish, postResult } from './api';
import type { EvalEngine, EvalProgress } from './types';

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));

export async function runEval(
  engine: EvalEngine,
  limit: number | null,
  report: (p: EvalProgress) => void,
): Promise<void> {
  try {
    report({ phase: 'loading', done: 0, total: 0, message: 'loading plan' });
    const plan = await fetchPlan(limit);
    const finished = new Set(plan.done);
    const todo = plan.cases.filter((c) => !finished.has(c.id));
    await postBegin({ backend: engine.backend, userAgent: navigator.userAgent, startedAt: new Date().toISOString() });
    report({ phase: 'loading', done: 0, total: todo.length, message: `loading speech model (${engine.backend})` });
    await engine.ensureReady();
    const cache = new Map<string, Utterance>();
    const need = async (id: string | null) => {
      if (id === null || cache.has(id)) return;
      cache.set(id, { id, speaker: '', seconds: 0, split: 'dev', audio: await fetchAudio(id) });
    };
    for (const [i, c] of todo.entries()) {
      report({ phase: 'running', done: i, total: todo.length, message: c.id });
      await need(c.systemUtt);
      await need(c.micUtt);
      await postResult(await runCase(c, renderCase(c, cache), engine.asr, engine.store));
    }
    await postFinish();
    report({ phase: 'done', done: todo.length, total: todo.length, message: 'report written' });
  } catch (err) {
    const message = errorText(err);
    await postFail(message).catch(() => {});
    report({ phase: 'error', done: 0, total: 0, message });
  }
}

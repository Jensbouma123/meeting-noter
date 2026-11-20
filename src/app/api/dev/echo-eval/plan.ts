import { loadExternalCases } from '../../../../../scripts/echo-eval/lib/external-case';
import { buildMeetings } from '../../../../../scripts/echo-eval/lib/meeting-plan';
import { buildCases } from '../../../../../scripts/echo-eval/lib/cases';
import { shardItems } from '../../../../../scripts/echo-eval/lib/shard';
import { loadUtterances } from '../../../../../scripts/echo-eval/lib/utterances';
import { AUDIO_DIR, EXTERNAL_DIR } from '../../../../../scripts/echo-eval/out-dir';
import type { EvalCase } from '../../../../../scripts/echo-eval/types/eval-case';
import type { EvalSet } from '../../../../../scripts/echo-eval/types/eval-set';
import type { MeetingCase } from '../../../../../scripts/echo-eval/types/meeting-case';
import type { Shard } from '../../../../../scripts/echo-eval/types/shard';
import type { Utterance } from '../../../../../scripts/echo-eval/types/utterance';

const G = globalThis as unknown as { __echoEvalUtts?: Utterance[] };

export function utterances(): Utterance[] {
  G.__echoEvalUtts ??= loadUtterances(AUDIO_DIR);
  return G.__echoEvalUtts;
}

export function externalDir(): string {
  if (!EXTERNAL_DIR) throw new Error('set=external needs ECHO_EVAL_EXTERNAL');
  return EXTERNAL_DIR;
}

function allCases(set: EvalSet): (EvalCase | MeetingCase)[] {
  if (set === 'external') return loadExternalCases(externalDir());
  return set === 'meetings' ? buildMeetings(utterances()) : buildCases(utterances());
}

export function casesFor(limit: number | null, set: EvalSet = 'cases', shard: Shard | null = null) {
  const all = allCases(set);
  return shardItems(limit ? all.slice(0, limit) : all, shard);
}

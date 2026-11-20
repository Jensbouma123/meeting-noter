import { buildMeetings } from '../../../../../scripts/echo-eval/lib/meeting-plan';
import { buildCases } from '../../../../../scripts/echo-eval/lib/cases';
import { shardItems } from '../../../../../scripts/echo-eval/lib/shard';
import { loadUtterances } from '../../../../../scripts/echo-eval/lib/utterances';
import { AUDIO_DIR } from '../../../../../scripts/echo-eval/out-dir';
import type { EvalCase } from '../../../../../scripts/echo-eval/types/eval-case';
import type { MeetingCase } from '../../../../../scripts/echo-eval/types/meeting-case';
import type { Shard } from '../../../../../scripts/echo-eval/types/shard';
import type { Utterance } from '../../../../../scripts/echo-eval/types/utterance';

const G = globalThis as unknown as { __echoEvalUtts?: Utterance[] };

export function utterances(): Utterance[] {
  G.__echoEvalUtts ??= loadUtterances(AUDIO_DIR);
  return G.__echoEvalUtts;
}

export function casesFor(limit: number | null, meetings = false, shard: Shard | null = null) {
  const all: (EvalCase | MeetingCase)[] = meetings ? buildMeetings(utterances()) : buildCases(utterances());
  return shardItems(limit ? all.slice(0, limit) : all, shard);
}

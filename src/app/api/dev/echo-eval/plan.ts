import { buildMeetings } from '../../../../../scripts/echo-eval/lib/meeting-plan';
import { buildCases } from '../../../../../scripts/echo-eval/lib/cases';
import { loadUtterances } from '../../../../../scripts/echo-eval/lib/utterances';
import { AUDIO_DIR } from '../../../../../scripts/echo-eval/out-dir';
import type { Utterance } from '../../../../../scripts/echo-eval/types/utterance';

const G = globalThis as unknown as { __echoEvalUtts?: Utterance[] };

export function utterances(): Utterance[] {
  G.__echoEvalUtts ??= loadUtterances(AUDIO_DIR);
  return G.__echoEvalUtts;
}

export function casesFor(limit: number | null, meetings = false) {
  const all = meetings ? buildMeetings(utterances()) : buildCases(utterances());
  return limit ? all.slice(0, limit) : all;
}

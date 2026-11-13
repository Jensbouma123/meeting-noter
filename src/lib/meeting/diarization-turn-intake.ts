import type { SpeakerTurn } from '@/lib/diarization/browser';
import { debugEnabled } from '@/lib/asr/browser/quiet-console';
import { relabelSegments } from './diarization-relabel';
import { currentSpeaker, heardUntil, latestTurnEnd } from './diarization-session';
import { insertTurn, turnsOf } from './diarization-turns';
import { noteOverlapTurns } from './overlap-retranscribe';

export function onTurn(turn: SpeakerTurn): void {
  insertTurn(turn);
  if (turn.end >= (latestTurnEnd.get(turn.source) ?? -Infinity)) {
    latestTurnEnd.set(turn.source, turn.end);
    currentSpeaker.set(turn.source, turn.speaker);
  }
  if (debugEnabled()) {
    const lag = (heardUntil.get(turn.source) ?? turn.end) - turn.end;
    console.debug(
      `[diarization] turn ${turn.speaker} ${turn.start.toFixed(2)}–${turn.end.toFixed(2)} s` +
        `${turn.final === false ? ' (open)' : ''}, reported ${lag.toFixed(2)} s of audio after its end`,
    );
  }
  relabelSegments(turn);
  noteOverlapTurns(turn.source, turnsOf(turn.source));
}

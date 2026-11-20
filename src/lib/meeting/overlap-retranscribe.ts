import { retranscribeOverlap } from './overlap-clip-pass';
import { clearHeldAudio, heldAudio, holdFrame } from './overlap-held-audio';
import { missedWords } from './overlap-missed-words';
import { firstPassWords, pruneDuplicatedPassWords } from './overlap-pass-segments';
import { upsertPassSegment, upsertSpeakerSegments } from './overlap-pass-upsert';
import { resetSeparation, separateOverlap } from './overlap-separate';
import { overlapSpans } from './overlap-spans';
import { CAPTURE_SAMPLE_RATE } from './pcm';
import type { Source } from './types';
import type { OverlapSpan, OverlapTurn, TranscribeClip } from './types/overlap-retranscribe';
import type { OverlapSeparator } from './types/overlap-separate';

export const SETTLE_SECONDS = 12;
export const FLUSH_TIMEOUT_MS = 10_000;

let transcriber: TranscribeClip | null = null;
let separator: OverlapSeparator | null = null;
const closedTurns = new Map<Source, OverlapTurn[]>();
const handled = new Map<Source, OverlapSpan[]>();
const heardUntil = new Map<Source, number>();
let queue: Promise<void> = Promise.resolve();
let epoch = 0;

export function setOverlapTranscriber(fn: TranscribeClip | null): void {
  transcriber = fn;
  if (!fn) clearHeldAudio();
}

export function setOverlapSeparator(sep: OverlapSeparator | null): void {
  separator = sep;
}

export function pushOverlapAudio(source: Source, pcm: ArrayBuffer, at: number): void {
  if (!transcriber || pcm.byteLength < 2) return;
  const until = holdFrame(source, pcm, at);
  const before = heardUntil.get(source) ?? 0;
  heardUntil.set(source, until / CAPTURE_SAMPLE_RATE);
  if (Math.floor(until / CAPTURE_SAMPLE_RATE) !== Math.floor(before)) schedule(source, false);
}

export function noteOverlapTurns(source: Source, turns: readonly (OverlapTurn & { final?: boolean })[]): void {
  closedTurns.set(
    source,
    turns.filter((t) => t.final !== false),
  );
  schedule(source, false);
}

function schedule(source: Source, all: boolean): void {
  const transcribe = transcriber;
  if (!transcribe) return;
  pruneDuplicatedPassWords(source);
  const turns = closedTurns.get(source) ?? [];
  const settled = (heardUntil.get(source) ?? 0) - SETTLE_SECONDS;
  const done = handled.get(source) ?? [];
  handled.set(source, done);
  for (const span of overlapSpans(turns)) {
    if (!all && span.end > settled) continue;
    if (done.some((d) => d.start < span.end && span.start < d.end)) continue;
    done.push(span);
    const run = epoch;
    queue = queue.then(async () => {
      if (run !== epoch) return;
      try {
        const first = firstPassWords(source, span);
        const sep = separator;
        const separated = sep ? await separateOverlap(span, source, first, turns, heldAudio(source), transcribe, sep) : null;
        if (separated) {
          if (run === epoch) upsertSpeakerSegments(source, span, separated);
          return;
        }
        const heard = await retranscribeOverlap(span, first, turns, heldAudio(source), transcribe);
        const added = missedWords(firstPassWords(source, span), heard, span);
        if (run !== epoch) return;
        upsertPassSegment(source, span, added);
      } catch (err) {
        console.warn('[overlap] Second pass failed', err);
      }
    });
  }
}

export async function flushOverlapRetranscribe(timeoutMs = FLUSH_TIMEOUT_MS): Promise<void> {
  for (const source of closedTurns.keys()) schedule(source, true);
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([queue, new Promise<void>((resolve) => (timer = setTimeout(resolve, timeoutMs)))]);
  clearTimeout(timer);
}

export function resetOverlapRetranscribe(): void {
  epoch += 1;
  clearHeldAudio();
  closedTurns.clear();
  handled.clear();
  heardUntil.clear();
  resetSeparation();
}

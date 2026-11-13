import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIVE_CHUNKER_CONFIG,
  LIVE_SAMPLE_RATE as SR,
  LiveChunker,
  agreedPrefix,
  cleanWords,
  hasSpeech,
  type LiveSegmentUpdate,
  type TimedWord,
} from './live-chunker';
import { breathing, clicks, frames, noise, typing, voice } from './test-signals';

const FRAME = SR / 10;

/** A word of the script, on the capture timeline (seconds). */
interface ScriptWord {
  text: string;
  start: number;
  end: number;
}

/** `count` words of 0.4 s each with 0.1 s gaps, from `from` seconds. */
function script(count: number, from = 0.5): ScriptWord[] {
  return Array.from({ length: count }, (_, i) => ({
    text: `word${i}`,
    start: from + i * 0.5,
    end: from + i * 0.5 + 0.4,
  }));
}

/**
 * A stand-in for Parakeet that behaves the way the real one does on a cut:
 * a word the window only partly holds comes out as a fragment ("wo" at the
 * end, "rd3" at the start), and the window's last word gets a full stop,
 * because the model takes every window for a whole utterance.
 */
function recognizer(words: ScriptWord[]) {
  return (startSample: number, samples: number): TimedWord[] => {
    const from = startSample / SR;
    const to = (startSample + samples) / SR;
    const out: TimedWord[] = [];
    for (const w of words) {
      if (w.end <= from || w.start >= to) continue;
      const clippedStart = w.start < from;
      const clippedEnd = w.end > to;
      let text = w.text;
      if (clippedStart) text = text.slice(2);
      if (clippedEnd) text = text.slice(0, 2);
      out.push({ text, start: Math.max(w.start, from) - from, end: Math.min(w.end, to) - from });
    }
    if (out.length > 0) out[out.length - 1] = { ...out[out.length - 1], text: out[out.length - 1].text + '.' };
    return out;
  };
}

/** A voice where the script has speech (and between its words), silent elsewhere. */
function frameAt(index: number, speech: (t: number) => boolean): Float32Array {
  const t = (index * FRAME) / SR;
  return speech(t) ? voice(FRAME, 0.3, index * FRAME) : new Float32Array(FRAME);
}

/**
 * Drive a chunker over `seconds` of audio the way `browser-asr.ts` does:
 * every frame is pushed, a due window is recognised, and Stop flushes the
 * rest. Inference is instantaneous here; the latency case has its own test.
 */
function run(
  seconds: number,
  speech: (t: number) => boolean,
  recognize: (startSample: number, samples: number) => TimedWord[],
  chunker = new LiveChunker(idFactory()),
) {
  const segments = new Map<string, LiveSegmentUpdate>();
  const requests: { start: number; samples: number; final: boolean }[] = [];
  const apply = (req: NonNullable<ReturnType<LiveChunker['take']>>) => {
    requests.push({ start: req.startSample, samples: req.audio.length, final: req.final });
    for (const u of chunker.apply(req, recognize(req.startSample, req.audio.length))) segments.set(u.id, u);
  };
  for (let i = 0; i < (seconds * SR) / FRAME; i += 1) {
    chunker.push(frameAt(i, speech), i * FRAME);
    if (chunker.due()) apply(chunker.take()!);
  }
  const last = chunker.take(true);
  if (last) apply(last);
  return { segments: [...segments.values()], requests };
}

function idFactory() {
  let n = 0;
  return () => `s${++n}`;
}

const words = (text: string) => text.split(/\s+/).map((w) => w.replace(/[^\w]/g, ''));

describe('word helpers', () => {
  it('folds punctuation onto the word before it and drops a lone "."', () => {
    expect(cleanWords([{ text: '.' }, { text: 'hello' }, { text: ',' }, { text: 'world' }, { text: '?' }])).toEqual([
      { text: 'hello,' },
      { text: 'world?' },
    ]);
    expect(cleanWords([{ text: '.' }, { text: ' ' }])).toEqual([]);
  });

  it('knows punctuation is not speech', () => {
    expect(hasSpeech('. . ,')).toBe(false);
    expect(hasSpeech('Oké.')).toBe(true);
    expect(hasSpeech('42')).toBe(true);
  });

  it('agrees on words regardless of case and punctuation', () => {
    expect(agreedPrefix([{ text: 'Hello,' }, { text: 'there' }], [{ text: 'hello' }, { text: 'there.' }, { text: 'x' }])).toBe(2);
    expect(agreedPrefix([{ text: 'a' }, { text: 'b' }], [{ text: 'a' }, { text: 'c' }])).toBe(1);
  });
});

describe('live chunking', () => {
  it('never splits a word across windows, in 40 s of unbroken speech', () => {
    const talk = script(78); // 0.5 s … 39.4 s, no pause anywhere
    const speech = (t: number) => t >= 0.5 && t < 39.5;
    const { segments } = run(40, speech, recognizer(talk));

    const text = segments.map((s) => s.text).join(' ');
    // Every word exactly once, in order: no "wo" / "rd3" fragments, no repeats.
    expect(words(text)).toEqual(talk.map((w) => w.text));
    expect(segments.every((s) => s.final)).toBe(true);
    // Periods the model put at window ends are not left inside the text.
    expect(text.match(/\./g)?.length ?? 0).toBeLessThanOrEqual(segments.length);
  });

  it('keeps the window bounded and splits long segments', () => {
    const talk = script(78);
    const { segments, requests } = run(40, (t) => t >= 0.5 && t < 39.5, recognizer(talk));
    expect(Math.max(...requests.map((r) => r.samples))).toBeLessThanOrEqual(DEFAULT_LIVE_CHUNKER_CONFIG.maxWindowSamples);
    for (const s of segments) {
      expect(s.endSample - s.startSample).toBeLessThanOrEqual(DEFAULT_LIVE_CHUNKER_CONFIG.maxSegmentSamples + 3 * SR);
    }
    expect(segments.length).toBeGreaterThan(1);
  });

  it('never sends silence to the model', () => {
    const { segments, requests } = run(30, () => false, () => [{ text: '.', start: 0, end: 0.1 }]);
    expect(requests).toEqual([]);
    expect(segments).toEqual([]);
  });

  it.each([
    ['mouse clicks', clicks(10 * SR, 0.8 * SR, 0.4)],
    ['fast, loud typing', typing(10 * SR, 10, 0.2)],
    ['breathing', breathing(10 * SR, 2 * SR, 0.08)],
    ['a voice shorter than 300 ms ("hm")', voice(0.2 * SR, 0.1)],
  ])('never sends %s to the model', (_name, audio) => {
    const chunker = new LiveChunker(idFactory());
    const sent: number[] = [];
    frames(audio).forEach((f, i) => {
      chunker.push(f, i * FRAME);
      if (chunker.due()) sent.push(chunker.take()!.audio.length);
    });
    const last = chunker.take(true);
    if (last) sent.push(last.audio.length);
    expect(sent).toEqual([]);
  });

  it.each([
    ['filler', [{ text: 'Hmm.', start: 0.2, end: 0.6 }]],
    ['a letter or two', [{ text: 'k', start: 0.2, end: 0.3 }, { text: 'S.', start: 0.4, end: 0.5 }]],
    ['a word the model only guessed at', [{ text: 'Amen.', start: 0.2, end: 0.6, confidence: 0.6 }]],
  ])('never makes a segment out of %s', (_name, heard: TimedWord[]) => {
    const { segments, requests } = run(6, (t) => t > 1 && t < 2.5, () => heard);
    expect(requests.length).toBeGreaterThan(0);
    expect(segments).toEqual([]);
  });

  it('keeps a one-word reply the model is unsure of', () => {
    const { segments } = run(6, (t) => t > 1 && t < 2.5, () => [{ text: 'Yeah.', start: 0.2, end: 0.6, confidence: 0.55 }]);
    expect(segments.map((s) => [s.text, s.final])).toEqual([['Yeah.', true]]);
  });

  it('never makes a segment out of punctuation or an empty result', () => {
    const { segments, requests } = run(10, (t) => t > 1 && t < 4, () => [{ text: '.', start: 0.2, end: 0.3 }]);
    expect(requests.length).toBeGreaterThan(0);
    expect(segments).toEqual([]);
  });

  it('closes the segment at a pause and opens a new one for the next sentence', () => {
    const first = script(4, 0.5); // 0.5 … 2.4 s
    const second = script(4, 5); // 5 … 6.9 s
    const talk = [...first, ...second.map((w, i) => ({ ...w, text: `next${i}` }))];
    const speech = (t: number) => (t >= 0.5 && t < 2.4) || (t >= 5 && t < 6.9);
    const { segments } = run(9, speech, recognizer(talk));

    expect(segments.map((s) => [words(s.text).join(' '), s.final])).toEqual([
      ['word0 word1 word2 word3', true],
      ['next0 next1 next2 next3', true],
    ]);
    // On the capture timeline, from the words' own times.
    expect(segments[1].startSample).toBe(5 * SR);
  });

  it('judges pauses against the source’s own level, not a fixed one', () => {
    // A far-field mic: speech at RMS 0.005, a room at 0.001. A fixed 0.01
    // "silence" level called every frame of this a pause.
    const chunker = new LiveChunker(idFactory());
    const out: LiveSegmentUpdate[] = [];
    const talk = script(10, 1);
    const rec = recognizer(talk);
    for (let i = 0; i < 80; i += 1) {
      const t = (i * FRAME) / SR;
      const frame = t >= 1 && t < 5.9 ? voice(FRAME, 0.005, i * FRAME) : noise(FRAME, 0.001);
      chunker.push(frame, i * FRAME);
      if (chunker.due()) {
        const req = chunker.take()!;
        out.push(...chunker.apply(req, rec(req.startSample, req.audio.length)));
      }
    }
    const finals = out.filter((u) => u.final);
    expect(finals).toHaveLength(1);
    expect(words(finals[0].text)).toEqual(talk.map((w) => w.text));
  });

  it('keeps audio that arrives during an inference for the next window', () => {
    const chunker = new LiveChunker(idFactory());
    for (let i = 0; i < 15; i += 1) chunker.push(voice(FRAME, 0.3, i * FRAME), i * FRAME);
    const req = chunker.take()!;
    expect(req.audio.length).toBe(15 * FRAME);
    for (let i = 15; i < 30; i += 1) chunker.push(voice(FRAME, 0.3, i * FRAME), i * FRAME);
    expect(chunker.due()).toBe(false); // one inference at a time
    chunker.apply(req, [{ text: 'hello', start: 0.1, end: 0.5 }]);
    expect(chunker.due()).toBe(true);
    const next = chunker.take()!;
    // The open utterance is re-read from its start, including the new audio.
    expect(next.startSample).toBe(0);
    expect(next.audio.length).toBe(30 * FRAME);
  });

  it('retries a failed window instead of losing its audio', () => {
    const chunker = new LiveChunker(idFactory());
    for (let i = 0; i < 12; i += 1) chunker.push(voice(FRAME, 0.3, i * FRAME), i * FRAME);
    const req = chunker.take()!;
    chunker.abort();
    for (let i = 12; i < 24; i += 1) chunker.push(voice(FRAME, 0.3, i * FRAME), i * FRAME);
    const retry = chunker.take()!;
    expect(retry.startSample).toBe(req.startSample);
    expect(retry.audio.length).toBe(24 * FRAME);
  });

  it('finish() closes a shown segment as final when its last window cannot run (Stop)', () => {
    const chunker = new LiveChunker(idFactory());
    for (let i = 0; i < 15; i += 1) chunker.push(voice(FRAME, 0.3, i * FRAME), i * FRAME);
    const shown = chunker.apply(chunker.take()!, [{ text: 'hello', start: 0.1, end: 0.5 }]);
    expect(shown.map((u) => [u.text, u.final])).toEqual([['hello', false]]);
    // The next window is still running when Stop gives up on it.
    for (let i = 15; i < 30; i += 1) chunker.push(voice(FRAME, 0.3, i * FRAME), i * FRAME);
    chunker.take();

    const closed = chunker.finish();
    expect(closed.map((u) => [u.id, u.text, u.final])).toEqual([[shown[0].id, 'hello', true]]);
    expect(chunker.finish()).toEqual([]);
    expect(chunker.take(true)).toBeNull();
  });

  it('reads a backlog longer than the cap on Stop a window at a time, ending the utterance with the last', () => {
    const chunker = new LiveChunker(idFactory());
    for (let i = 0; i < 180; i += 1) chunker.push(voice(FRAME, 0.3, i * FRAME), i * FRAME);
    const first = chunker.take(true)!;
    expect([first.audio.length, first.final]).toEqual([DEFAULT_LIVE_CHUNKER_CONFIG.maxWindowSamples, false]);
    const recognize = recognizer(script(34));
    chunker.apply(first, recognize(first.startSample, first.audio.length));
    const last = chunker.take(true)!;
    expect(last.final).toBe(true);
    expect(last.startSample).toBeGreaterThan(first.startSample);
    expect(last.startSample + last.audio.length).toBe(180 * FRAME);
  });

  it('closes the open segment where a speaker turn ended', () => {
    const chunker = new LiveChunker(idFactory());
    for (let i = 0; i < 24; i += 1) chunker.push(voice(FRAME, 0.3, i * FRAME), i * FRAME);
    const req = chunker.take()!;
    const updates = chunker.apply(
      req,
      [
        { text: 'mine', start: 0.2, end: 0.8 },
        { text: 'yours', start: 1.6, end: 2.2 },
      ],
      1.2 * SR,
    );
    expect(updates.map((u) => [u.text, u.final])).toEqual([
      ['mine', true],
      ['yours', false],
    ]);
    expect(updates[0].id).not.toBe(updates[1].id);
    // The next window starts at the turn, not back in the closed segment.
    for (let i = 24; i < 36; i += 1) chunker.push(voice(FRAME, 0.3, i * FRAME), i * FRAME);
    expect(chunker.take()!.startSample).toBe(1.2 * SR);
  });

  it('takes the first window as soon as the gate opens, not after a full step', () => {
    const chunker = new LiveChunker(idFactory());
    let firstTake = -1;
    let gateOpen = -1;
    for (let i = 0; i < 30 && firstTake < 0; i += 1) {
      chunker.push(voice(FRAME, 0.3, i * FRAME), i * FRAME);
      if (gateOpen < 0 && chunker.due()) gateOpen = i;
      if (chunker.due()) firstTake = ((i + 1) * FRAME) / SR;
    }
    // Voiced onset at 0: the gate needs 0.3 s of voice; the take follows at once.
    expect(firstTake).toBeGreaterThan(0.2);
    expect(firstTake).toBeLessThanOrEqual(0.5);
    expect(firstTake).toBeLessThan(DEFAULT_LIVE_CHUNKER_CONFIG.stepSamples / SR - 0.9);
    console.log(`first take due ${firstTake.toFixed(2)} s after voiced onset (was ~1.5 s)`);
  });

  it('keeps the 1.5 s step for takes after the first partial is open', () => {
    const chunker = new LiveChunker(idFactory());
    let i = 0;
    while (!chunker.due()) chunker.push(voice(FRAME, 0.3, i * FRAME), i++ * FRAME);
    const req = chunker.take()!;
    chunker.apply(req, [{ text: 'hello', start: 0.1, end: 0.4 }]);
    let taken = 0;
    while (!chunker.due()) {
      chunker.push(voice(FRAME, 0.3, i * FRAME), i++ * FRAME);
      taken += FRAME;
    }
    expect(taken).toBe(DEFAULT_LIVE_CHUNKER_CONFIG.stepSamples);
  });

  it('takes the tail once, early, when a pause starts; final still follows at 0.6 s', () => {
    const chunker = new LiveChunker(idFactory());
    const seen: { at: number; final: boolean }[] = [];
    let i = 0;
    const feed = (frame: Float32Array) => {
      chunker.push(frame, i * FRAME);
      i += 1;
      if (chunker.due()) {
        const req = chunker.take()!;
        seen.push({ at: (i * FRAME) / SR, final: req.final });
        chunker.apply(req, [{ text: 'hello', start: 0.1, end: 0.4 }]);
      }
    };
    while (seen.length === 0) feed(voice(FRAME, 0.3, i * FRAME));
    // Sub-step of speech, then quiet.
    for (let k = 0; k < 5; k += 1) feed(voice(FRAME, 0.3, i * FRAME));
    const speechEnd = (i * FRAME) / SR;
    seen.length = 0;
    for (let k = 0; k < 10; k += 1) feed(new Float32Array(FRAME));
    const gaps = seen.map((s) => ({ after: +(s.at - speechEnd).toFixed(2), final: s.final }));
    console.log('takes after speech end:', JSON.stringify(gaps));
    expect(gaps.filter((g) => !g.final)).toHaveLength(1);
    expect(gaps[0].after).toBeLessThanOrEqual(0.3);
    expect(gaps[gaps.length - 1]).toEqual({ after: 0.6, final: true });
  });

  it('falls back to the 1.5 s step after a first take that opened no segment', () => {
    const chunker = new LiveChunker(idFactory());
    let i = 0;
    while (!chunker.due()) chunker.push(voice(FRAME, 0.3, i * FRAME), i++ * FRAME);
    const req = chunker.take()!;
    expect(chunker.apply(req, [{ text: 'Hmm.', start: 0.1, end: 0.4 }])).toEqual([]);
    let waited = 0;
    while (!chunker.due()) {
      chunker.push(voice(FRAME, 0.3, i * FRAME), i++ * FRAME);
      waited += FRAME;
    }
    expect(waited).toBe(DEFAULT_LIVE_CHUNKER_CONFIG.stepSamples);
  });
});

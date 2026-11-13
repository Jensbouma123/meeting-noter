import { describe, expect, it } from 'vitest';
import { LiveChunker } from './live-chunker';
import { DEFAULT_LIVE_CHUNKER_CONFIG, LIVE_SAMPLE_RATE as SR } from './live-chunker-defaults';
import { FRAME, idFactory, recognizer, run, script, words } from './live-chunker-harness';
import { noise, voice } from './test-signals';
import type { LiveSegmentUpdate } from './types';

describe('live chunking segments', () => {
  it('closes the segment at a pause and opens a new one for the next sentence', () => {
    const first = script(4, 0.5);
    const second = script(4, 5);
    const talk = [...first, ...second.map((w, i) => ({ ...w, text: `next${i}` }))];
    const speech = (t: number) => (t >= 0.5 && t < 2.4) || (t >= 5 && t < 6.9);
    const { segments } = run(9, speech, recognizer(talk));

    expect(segments.map((s) => [words(s.text).join(' '), s.final])).toEqual([
      ['word0 word1 word2 word3', true],
      ['next0 next1 next2 next3', true],
    ]);
    expect(segments[1].startSample).toBe(5 * SR);
  });

  it('judges pauses against the source’s own level, not a fixed one', () => {
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
    expect(chunker.due()).toBe(false);
    chunker.apply(req, [{ text: 'hello', start: 0.1, end: 0.5 }]);
    expect(chunker.due()).toBe(true);
    const next = chunker.take()!;
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
    for (let i = 24; i < 36; i += 1) chunker.push(voice(FRAME, 0.3, i * FRAME), i * FRAME);
    expect(chunker.take()!.startSample).toBe(1.2 * SR);
  });
});

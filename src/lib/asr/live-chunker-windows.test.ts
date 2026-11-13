import { describe, expect, it } from 'vitest';
import { LiveChunker } from './live-chunker';
import { DEFAULT_LIVE_CHUNKER_CONFIG, LIVE_SAMPLE_RATE as SR } from './live-chunker-defaults';
import { FRAME, idFactory, recognizer, run, script, words } from './live-chunker-harness';
import { breathing, clicks, frames, typing, voice } from './test-signals';
import type { TimedWord } from './types';

describe('live chunking windows', () => {
  it('never splits a word across windows, in 40 s of unbroken speech', () => {
    const talk = script(78);
    const speech = (t: number) => t >= 0.5 && t < 39.5;
    const { segments } = run(40, speech, recognizer(talk));

    const text = segments.map((s) => s.text).join(' ');
    expect(words(text)).toEqual(talk.map((w) => w.text));
    expect(segments.every((s) => s.final)).toBe(true);
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
});

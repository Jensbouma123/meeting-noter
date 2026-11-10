import { describe, expect, it } from 'vitest';
import { SPEECH_GATE_SAMPLE_RATE as SR, SpeechGate, isFiller, isNoiseText, steadiness, voicing } from './speech-gate';
import { breathing, clicks, frames, noise, typing, voice } from './test-signals';

function concat(...parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Push `audio` through a fresh gate in 100 ms frames. */
function gate(audio: Float32Array, gateIn = new SpeechGate()) {
  return frames(audio).map((f) => gateIn.push(f));
}

describe('voicing', () => {
  it('is high for a voice and low for noise', () => {
    // One 30 ms analysis frame, decimated to 8 kHz as the gate does.
    expect(voicing(voice(480, 0.1).filter((_, i) => i % 2 === 0))).toBeGreaterThan(0.9);
    expect(voicing(noise(240, 0.1))).toBeLessThan(0.4);
    expect(voicing(new Float32Array(240))).toBe(0);
  });
});

describe('steadiness', () => {
  it('is high for a held vowel and low for a key press', () => {
    expect(steadiness(voice(240, 0.1))).toBeGreaterThan(0.5);
    const thump = Float32Array.from({ length: 240 }, (_, i) => Math.exp(-i / 64) * Math.sin((2 * Math.PI * 200 * i) / 8000));
    expect(steadiness(thump)).toBeLessThan(0.05);
  });
});

describe('speech gate', () => {
  const tenSeconds = 10 * SR;

  it.each([
    ['room tone', noise(tenSeconds, 0.003)],
    ['mouse clicks', clicks(tenSeconds, 0.8 * SR, 0.4)],
    ['fast, loud typing', typing(tenSeconds, 10, 0.2)],
    ['breathing', breathing(tenSeconds, 2 * SR, 0.08)],
  ])('never calls %s speech', (_name, audio) => {
    const out = gate(audio);
    expect(out.filter((f) => f.speech)).toEqual([]);
  });

  it('lets a voice through after the minimum speech duration, keeping its onset', () => {
    const out = gate(concat(noise(SR, 0.001), voice(SR, 0.05, SR), noise(SR, 0.001)));
    const first = out.findIndex((f) => f.speech);
    // Speech starts at frame 10 (1 s); the run needs ~300 ms before it opens.
    expect(first).toBeGreaterThanOrEqual(12);
    expect(first).toBeLessThanOrEqual(14);
    // The frames before it are kept: the run reaches back to the onset.
    expect(out[first].runSamples).toBeGreaterThanOrEqual((first - 10) * (SR / 10));
    // It stays open through the voice, and not past it.
    expect(out.slice(first, 20).every((f) => f.speech)).toBe(true);
    expect(out.slice(21).some((f) => f.speech)).toBe(false);
  });

  it('never opens an utterance for a voice shorter than that ("hm")', () => {
    const out = gate(concat(noise(SR, 0.001), voice(0.2 * SR, 0.05, SR), noise(2 * SR, 0.001)));
    expect(out.some((f) => f.speech)).toBe(false);
    // It was heard as voiced, just not for long enough.
    expect(out.some((f) => f.voiced)).toBe(true);
  });

  it('hears a quiet far-field voice in a quiet room', () => {
    const out = gate(concat(noise(2 * SR, 0.0008), voice(2 * SR, 0.005, 2 * SR)));
    expect(out.slice(0, 20).some((f) => f.speech)).toBe(false);
    expect(out.slice(24).every((f) => f.speech)).toBe(true);
  });

  it('holds a voiced run across frame boundaries of any size', () => {
    const g = new SpeechGate();
    const audio = concat(noise(SR, 0.001), voice(SR, 0.05, SR));
    const out = frames(audio, 331).map((f) => g.push(f));
    expect(out.some((f) => f.speech)).toBe(true);
  });

  it('forgets its run and floor on reset', () => {
    const g = new SpeechGate();
    gate(voice(SR, 0.05), g);
    g.reset();
    expect(g.push(voice(SR / 10, 0.05)).speech).toBe(false);
  });
});

describe('filler and noise text', () => {
  it('knows filler', () => {
    for (const w of ['hmm', 'Hm.', 'mm', 'Mmm', 'uh,', 'Um', 'uhm', 'mhm', 'Mm-hmm.', 'eh', 'ehm', 'er']) {
      expect(isFiller(w), w).toBe(true);
    }
    for (const w of ['me', 'hum', 'hey', 'um-kay', 'huh?', 'oh', 'no']) expect(isFiller(w), w).toBe(false);
  });

  const words = (text: string, confidence?: number) =>
    text.split(' ').map((t) => (confidence === undefined ? { text: t } : { text: t, confidence }));

  it.each([
    ['k', 'fewer than two letters'],
    ['. ,', 'only punctuation'],
    ['s d f', 'only single letters'],
    ['Hmm.', 'filler'],
    ['uh mm', 'filler'],
    ['Um, k.', 'filler and a letter'],
  ])('drops "%s" (%s)', (text) => {
    expect(isNoiseText(words(text))).toBe(true);
  });

  it.each(['No.', 'Okay.', 'I think so.', 'Um, I think so.', 'Ja, dat klopt.', '42'])('keeps "%s"', (text) => {
    expect(isNoiseText(words(text))).toBe(false);
  });

  it('drops what the model was not sure of, when it says', () => {
    expect(isNoiseText(words('Amen.', 0.3))).toBe(true);
    expect(isNoiseText(words('Amen.', 0.9))).toBe(false);
    // One word needs more: a hum comes back as "Amen." at about 0.6 …
    expect(isNoiseText(words('Amen.', 0.6))).toBe(true);
    expect(isNoiseText(words('Two words.', 0.6))).toBe(false);
    // … but a one-word reply is often that unsure and still real.
    expect(isNoiseText(words('Yeah.', 0.55))).toBe(false);
    // Without confidences, text alone decides.
    expect(isNoiseText(words('Amen.'))).toBe(false);
  });
});

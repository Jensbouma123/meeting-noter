import { describe, expect, it } from 'vitest';
import { seg } from './export.testUtils';
import { dropEchoTwins } from './echo-twins';
import { splitTranscript } from './split-transcript';

const system = seg({
  id: 's',
  source: 'system',
  speaker: 'system:1',
  start: 19.4,
  end: 25,
  text: 'ik denk dat we dit volgende week moeten opleveren aan de klant',
});
const micBleed = seg({
  id: 'm',
  source: 'mic',
  speaker: 'mic:0',
  start: 19.6,
  end: 25.2,
  text: 'Ik denk dat we dit volgende week moeten opleveren aan klant',
});

describe('dropEchoTwins', () => {
  it('drops the mic copy of an utterance the system source also carries', () => {
    expect(dropEchoTwins([system, micBleed]).map((s) => s.id)).toEqual(['s']);
  });

  it('keeps a different speaker talking over, even with overlapping time', () => {
    const other = { ...micBleed, text: 'nee wacht even ik was nog niet klaar met praten' };
    expect(dropEchoTwins([system, other])).toHaveLength(2);
  });

  it('keeps same wording that is not simultaneous', () => {
    expect(dropEchoTwins([system, { ...micBleed, start: 60, end: 65 }])).toHaveLength(2);
  });

  it('shows the utterance once in the transcript instead of two columns', () => {
    const blocks = splitTranscript([system, micBleed]);
    expect(blocks.map((b) => b.kind)).toEqual(['turn']);
    expect(blocks[0].segments.map((s) => s.id)).toEqual(['s']);
  });

  it('drops a mic line the audio marked as echo even when ASR misheard the words', () => {
    const garbled = { ...micBleed, text: 'in tank dat wee het vol gen week', echo: 'echo' as const };
    expect(dropEchoTwins([system, garbled]).map((s) => s.id)).toEqual(['s']);
  });

  it('keeps a mic line the audio marked as near-end speech even when the words match', () => {
    const spoken = { ...micBleed, echo: 'speech' as const };
    expect(dropEchoTwins([system, spoken])).toHaveLength(2);
  });

  it('keeps an audio echo verdict that has no simultaneous system line', () => {
    expect(dropEchoTwins([system, { ...micBleed, start: 60, end: 65, echo: 'echo' as const }])).toHaveLength(2);
  });
});

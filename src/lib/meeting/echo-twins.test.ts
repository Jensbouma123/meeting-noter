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
});

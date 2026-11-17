import { describe, expect, it } from 'vitest';
import { groupTurns } from './group-turns';
import { toMarkdown, toPlainText, toSrt } from './export-writers';
import { speakers, transcript } from './overlap-transcript.testSupport';

describe('overlapping speech in the exports', () => {
  it('writes overlap as consecutive lines marked [overlap], each with its speaker', () => {
    const md = toMarkdown(transcript, speakers, 'T');
    expect(md).toContain(
      '**Ann**\n\n[00:00] so I think\n\n' +
        '[00:04] [overlap] **Ann:** we should  \n[00:04] [overlap] **Bo:** no wait\n\n' +
        '**Bo**\n\n[00:06] hear me out\n',
    );
    expect(md).toContain('**Participants:** Ann, Bo');

    const txt = toPlainText(transcript, speakers, 'T');
    expect(txt).toContain('Ann\n[00:00] so I think\n\n[00:04] [overlap] Ann: we should\n[00:04] [overlap] Bo: no wait\n\nBo\n');

    const srt = toSrt(transcript, speakers);
    expect(srt).toContain('[overlap] Bo: no wait');
    expect(srt).toContain('\nAnn: so I think');
  });

  it('exports a transcript saved before overlaps as before', () => {
    const legacy = transcript.map((s) => {
      const rest = { ...s };
      delete rest.overlap;
      return rest;
    });
    expect(toPlainText(legacy, speakers, 'T')).not.toContain('[overlap]');
    expect(groupTurns(legacy, speakers).map((t) => t.label)).toEqual(['Ann', 'Bo']);
  });
});

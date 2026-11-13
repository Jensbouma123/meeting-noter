import { describe, expect, it } from 'vitest';
import { INSIGHTS_VERSION } from '../semantic-search/insights/version';
import { parseInsightSet } from './insights-validate';
import { renderMeetingMarkdown } from './markdown';
import { sampleMeeting } from './test-meeting';

const item = { id: 'decision:s2:0', kind: 'decision', text: 'We ship the café export on Friday.', segmentId: 's2', speakerId: 'system:1', start: 40, score: 0.8 };

describe('suggested insights and the markdown export', () => {
  it('leaves unaccepted suggestions out of the export', () => {
    const insights = parseInsightSet({ version: INSIGHTS_VERSION, items: [item], dismissed: [] });
    const md = renderMeetingMarkdown(sampleMeeting({ notes: { actions: [], decisions: [] }, insights }));
    expect(md).not.toContain('Suggested');
    expect(md).toContain('## Summary\n\n(no decisions or action items)');
  });

  it('exports a suggestion once it is accepted as a decision', () => {
    const md = renderMeetingMarkdown({ ...sampleMeeting(), notes: { actions: [], decisions: [{ id: 'd', text: item.text, sourceSegmentId: 's2' }] } });
    expect(md).toContain('Decisions:\n- We ship the café export on Friday.');
  });
});

describe('parseInsightSet', () => {
  it('rejects malformed payloads and sets from an older extractor', () => {
    expect(parseInsightSet({ version: INSIGHTS_VERSION, items: 'x' })).toBeNull();
    expect(parseInsightSet({ items: [item], dismissed: [] })).toBeNull();
    expect(parseInsightSet({ version: 1, items: [item], dismissed: [] })).toBeNull();
    expect(parseInsightSet({ version: INSIGHTS_VERSION, items: [{ ...item, kind: 'other' }, item] })?.items).toHaveLength(1);
  });
});

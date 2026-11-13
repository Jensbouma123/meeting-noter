import { describe, expect, it } from 'vitest';
import { renderMeetingMarkdown } from './markdown';
import { parseInsightSet } from './insights-validate';
import { sampleMeeting } from './test-meeting';

const item = { id: 'decision:s2:0', kind: 'decision', text: 'We ship the café export on Friday.', segmentId: 's2', speakerId: 'system:1', start: 40, score: 0.7 };

describe('suggested insights in markdown', () => {
  it('renders pending insights with time and speaker', () => {
    const md = renderMeetingMarkdown(sampleMeeting({ insights: parseInsightSet({ items: [item], dismissed: [] }) }));
    expect(md).toContain('### Suggested decisions (auto-detected, unconfirmed)');
    expect(md).toContain('- "We ship the café export on Friday." (00:40, Anna)');
  });

  it('omits dismissed and promoted insights', () => {
    const dismissed = renderMeetingMarkdown(sampleMeeting({ insights: { items: [item as never], dismissed: [item.id] } }));
    expect(dismissed).not.toContain('Suggested');
    const base = sampleMeeting();
    const promoted = renderMeetingMarkdown({ ...base, notes: { actions: [], decisions: [{ id: 'd', text: 'x', sourceSegmentId: 's2' }] }, insights: { items: [item as never], dismissed: [] } });
    expect(promoted).not.toContain('Suggested');
  });

  it('rejects malformed payloads', () => {
    expect(parseInsightSet({ items: 'x' })).toBeNull();
    expect(parseInsightSet({ items: [{ ...item, kind: 'other' }, item] })?.items).toHaveLength(1);
  });
});

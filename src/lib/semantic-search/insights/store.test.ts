// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { insightsKey, loadInsights, saveInsights } from './store';
import { INSIGHTS_VERSION } from './version';

const item = { id: 'decision:s1:0', kind: 'decision' as const, text: 'We ship on Friday.', segmentId: 's1', speakerId: 'mic:0', start: 1, score: 0.8 };

beforeEach(() => localStorage.clear());

describe('insights store', () => {
  it('clears results stored by the old extractor', () => {
    localStorage.setItem('mn.insights.m1.v1', JSON.stringify({ items: [item], dismissed: [] }));
    expect(loadInsights('m1').items).toEqual([]);
    expect(localStorage.getItem('mn.insights.m1.v1')).toBeNull();
  });

  it('ignores a set without the current version under the current key', () => {
    localStorage.setItem(insightsKey('m1'), JSON.stringify({ items: [item], dismissed: [] }));
    expect(loadInsights('m1').items).toEqual([]);
  });

  it('round-trips a current set', () => {
    saveInsights('m1', { version: INSIGHTS_VERSION, items: [item], dismissed: ['x'] });
    expect(loadInsights('m1')).toEqual({ version: INSIGHTS_VERSION, items: [item], dismissed: ['x'] });
  });
});

import type { Insight } from '../semantic-search/insights/types/insight';
import type { InsightSet } from '../semantic-search/insights/types/insight-set';
import { INSIGHTS_VERSION } from '../semantic-search/insights/version';

const MAX_ITEMS = 64;
const MAX_TEXT = 2000;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function parseItem(v: unknown): Insight | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.segmentId) || !isStr(v.speakerId)) return null;
  if (v.kind !== 'decision' && v.kind !== 'action') return null;
  if (typeof v.text !== 'string' || v.text.trim() === '' || !isNum(v.start) || !isNum(v.score)) return null;
  return {
    id: v.id,
    kind: v.kind,
    text: v.text.slice(0, MAX_TEXT),
    segmentId: v.segmentId,
    speakerId: v.speakerId,
    start: v.start,
    score: v.score,
  };
}

export function parseInsightSet(v: unknown): InsightSet | null {
  if (!isObj(v) || v.version !== INSIGHTS_VERSION || !Array.isArray(v.items)) return null;
  const items = v.items.slice(0, MAX_ITEMS).map(parseItem).filter((i): i is Insight => i !== null);
  const dismissed = (Array.isArray(v.dismissed) ? v.dismissed : []).filter(isStr).slice(0, MAX_ITEMS * 4);
  return { version: INSIGHTS_VERSION, items, dismissed };
}

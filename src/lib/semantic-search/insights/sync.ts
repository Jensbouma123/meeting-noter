import type { InsightSet } from './types/insight-set';

export async function pushInsights(meetingId: string, set: InsightSet): Promise<boolean> {
  try {
    const res = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/insights`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(set),
    });
    return res.ok;
  } catch {
    return false;
  }
}

import type { AskAssistantId, AskLaunchResponse } from './types';

export async function requestServerLaunch(id: AskAssistantId, prompt: string): Promise<AskLaunchResponse> {
  try {
    const res = await fetch(`/api/assistants/${id}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const body = (await res.json()) as { ok?: unknown; prefilled?: unknown; reason?: unknown };
    if (!res.ok || body.ok !== true) return { ok: false };
    return body.reason === 'accessibility'
      ? { ok: true, prefilled: false, reason: 'accessibility' }
      : { ok: true, prefilled: body.prefilled === true };
  } catch {
    return { ok: false };
  }
}

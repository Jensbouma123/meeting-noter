import type { AskAssistantId } from './types';

export async function requestServerLaunch(id: AskAssistantId, prompt: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/assistants/${id}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    return res.ok && ((await res.json()) as { ok?: unknown }).ok === true;
  } catch {
    return false;
  }
}

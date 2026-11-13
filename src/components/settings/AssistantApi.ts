import type { AssistantActionResult, AssistantId, AssistantInfo } from './Assistant.types';

export async function fetchAssistants(): Promise<AssistantInfo[]> {
  const res = await fetch('/api/assistants');
  if (!res.ok) throw new Error('load');
  const body = (await res.json()) as { assistants: AssistantInfo[] };
  return body.assistants;
}

async function post(path: string, body?: object): Promise<AssistantActionResult> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    return (await res.json()) as AssistantActionResult;
  } catch {
    return { ok: false, error: 'network' };
  }
}

export function connectAssistant(id: AssistantId, confirm: boolean) {
  return post(`/api/assistants/${id}/connect`, { confirm });
}

export function disconnectAssistant(id: AssistantId) {
  return post(`/api/assistants/${id}/disconnect`);
}

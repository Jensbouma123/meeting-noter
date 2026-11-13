import type { FolderRow } from '@/lib/meeting-db/types';
import type { ApiResult, FolderDeleteMode } from './types';

export const FOLDERS_CHANGED_EVENT = 'mn:folders-changed';

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { cache: 'no-store', ...init });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & T;
    if (res.ok && body.ok !== false) return { ...body, ok: true };
    return { ok: false, error: body.error ?? `http-${res.status}` };
  } catch {
    return { ok: false, error: 'network' };
  }
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

function changed<T>(r: ApiResult<T>): ApiResult<T> {
  if (r.ok && typeof window !== 'undefined') window.dispatchEvent(new Event(FOLDERS_CHANGED_EVENT));
  return r;
}

export async function fetchFolders(): Promise<FolderRow[] | null> {
  const r = await call<{ folders: FolderRow[] }>('/api/folders');
  return r.ok ? r.folders : null;
}

export async function fetchMeetingFolders(): Promise<Record<string, string | null> | null> {
  const r = await call<{ meetings: { id: string; folderId?: string | null }[] }>('/api/meetings');
  if (!r.ok) return null;
  return Object.fromEntries(r.meetings.map((m) => [m.id, m.folderId ?? null]));
}

export async function createFolder(name: string, parentId: string | null): Promise<ApiResult<{ folder: FolderRow }>> {
  return changed(await call('/api/folders', json('POST', { name, parentId })));
}

export async function renameFolder(id: string, name: string): Promise<ApiResult<{ folder: FolderRow }>> {
  return changed(await call(`/api/folders/${encodeURIComponent(id)}`, json('PATCH', { name })));
}

export async function moveFolder(id: string, parentId: string | null): Promise<ApiResult<{ folder: FolderRow }>> {
  return changed(await call(`/api/folders/${encodeURIComponent(id)}`, json('PATCH', { parentId })));
}

export async function reorderFolder(id: string, index: number): Promise<ApiResult<{ folder: FolderRow }>> {
  return changed(await call(`/api/folders/${encodeURIComponent(id)}`, json('PATCH', { index })));
}

export async function deleteFolder(
  id: string,
  mode: FolderDeleteMode,
): Promise<ApiResult<{ deleted: { folders: number; meetings: number } }>> {
  return changed(await call(`/api/folders/${encodeURIComponent(id)}?mode=${mode}`, { method: 'DELETE' }));
}

export async function moveMeeting(meetingId: string, folderId: string | null): Promise<ApiResult> {
  return changed(await call(`/api/meetings/${encodeURIComponent(meetingId)}/folder`, json('PUT', { folderId })));
}

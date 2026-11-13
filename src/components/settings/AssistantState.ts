'use client';

import { useCallback, useEffect, useState } from 'react';
import { connectAssistant, disconnectAssistant, fetchAssistants } from './AssistantApi';
import type { AssistantActionResult, AssistantId, AssistantInfo, AssistantPending } from './Assistant.types';

export function useAssistantState() {
  const [assistants, setAssistants] = useState<AssistantInfo[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyId, setBusyId] = useState<AssistantId | null>(null);
  const [errors, setErrors] = useState<Partial<Record<AssistantId, string>>>({});
  const [confirmFor, setConfirmFor] = useState<Partial<Record<AssistantId, AssistantPending>>>({});

  useEffect(() => {
    let live = true;
    fetchAssistants().then(
      (list) => live && setAssistants(list),
      () => live && setLoadFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  const run = useCallback(async (id: AssistantId, action: () => Promise<AssistantActionResult>) => {
    setBusyId(id);
    setErrors((e) => ({ ...e, [id]: undefined }));
    const result = await action();
    setBusyId(null);
    if ('needsConfirm' in result) {
      setConfirmFor((c) => ({ ...c, [id]: { configPath: result.configPath, backupPath: result.backupPath } }));
    } else if (result.ok) {
      setConfirmFor((c) => ({ ...c, [id]: undefined }));
      setAssistants((list) => list && list.map((a) => (a.id === id ? { ...a, status: result.status } : a)));
    } else {
      setErrors((e) => ({ ...e, [id]: result.error }));
    }
  }, []);

  return {
    assistants,
    loadFailed,
    busyId,
    errors,
    confirmFor,
    connect: (id: AssistantId, confirmed: boolean) => run(id, () => connectAssistant(id, confirmed)),
    disconnect: (id: AssistantId) => run(id, () => disconnectAssistant(id)),
    cancelConfirm: (id: AssistantId) => setConfirmFor((c) => ({ ...c, [id]: undefined })),
  };
}

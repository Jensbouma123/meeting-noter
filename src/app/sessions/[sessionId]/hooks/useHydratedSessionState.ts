import { useState } from 'react';
import { useOnChange } from '@/hooks/useOnChange';
import { loadSavedTitle } from '@/components/meeting';
import { setAppSettings, useAppSettings } from '@/components/meeting/settingsStore';
import { getSessionMetadata } from '@/lib/meeting/session-open';
import { loadAutosavedSession } from '@/lib/meeting/autosave';
import { type AutosavedSession } from '@/lib/meeting/types/autosave';

export function useHydratedSessionState(initialSessionId?: string) {
  const [title, setTitle] = useState('Untitled meeting');
  const settings = useAppSettings();
  const [resumeCandidate, setResumeCandidate] = useState<AutosavedSession | null>(null);

  useOnChange(initialSessionId, () => {
    setTitle(initialSessionId ? (getSessionMetadata(initialSessionId)?.title ?? 'Untitled meeting') : loadSavedTitle());
    try {
      const candidate = loadAutosavedSession();
      setResumeCandidate(
        candidate && (!initialSessionId || candidate.sessionId === initialSessionId) ? candidate : null,
      );
    } catch {
      return;
    }
  });

  return { title, setTitle, settings, setSettings: setAppSettings, resumeCandidate, setResumeCandidate };
}

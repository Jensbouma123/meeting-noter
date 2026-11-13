import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, loadSettings, loadSavedTitle, type AppSettings } from '@/components/meeting';
import { getSessionMetadata } from '@/lib/meeting/session-store';
import { loadAutosavedSession, type AutosavedSession } from '@/lib/meeting/persist';

export function useHydratedSessionState(initialSessionId?: string) {
  const [title, setTitle] = useState('Untitled meeting');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [resumeCandidate, setResumeCandidate] = useState<AutosavedSession | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration from localStorage */
    setTitle(
      initialSessionId
        ? (getSessionMetadata(initialSessionId)?.title ?? 'Untitled meeting')
        : loadSavedTitle(),
    );
    setSettings(loadSettings());
    try {
      const candidate = loadAutosavedSession();
      setResumeCandidate(
        candidate && (!initialSessionId || candidate.sessionId === initialSessionId) ? candidate : null,
      );
    } catch {
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialSessionId]);

  return { title, setTitle, settings, setSettings, resumeCandidate, setResumeCandidate };
}

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { saveSettings, saveTitle, type AppSettings } from '@/components/meeting';
import { renameSession } from '@/lib/meeting/session-store';
import type { CaptureMode } from '@/lib/meeting';

interface SessionEditsParams {
  initialSessionId?: string;
  settings: AppSettings;
  setTitle: Dispatch<SetStateAction<string>>;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
}

export function useSessionEdits({ initialSessionId, settings, setTitle, setSettings }: SessionEditsParams) {
  const changeTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
    if (initialSessionId) {
      try {
        renameSession(initialSessionId, newTitle);
      } catch {
        return;
      }
    } else {
      saveTitle(newTitle);
    }
  }, [initialSessionId, setTitle]);

  const changeSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [setSettings]);

  const changeMode = useCallback(
    (newMode: CaptureMode) => {
      const updated = { ...settings, mode: newMode };
      setSettings(updated);
      saveSettings(updated);
    },
    [settings, setSettings]
  );

  return { changeTitle, changeSettings, changeMode };
}

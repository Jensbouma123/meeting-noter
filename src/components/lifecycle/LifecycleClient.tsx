'use client';

import { useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Alert } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { useMeeting } from '@/components/meeting/store';
import { useServerHeartbeat } from '@/lib/lifecycle/useServerHeartbeat';

export function LifecycleClient() {
  const status = useMeeting((state) => state.status);
  const t = useT('lifecycle');
  const language = useLanguage();
  const [failed, setFailed] = useState(false);

  useServerHeartbeat(status === 'live' || status === 'paused' || status === 'connecting');

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let stopped = false;
    let failures = 0;
    const ping = async () => {
      try {
        const response = await fetch('/api/app/status', { cache: 'no-store' });
        if (!response.ok) throw new Error('status unavailable');
        failures = 0;
        if (!stopped) setFailed(false);
      } catch {
        failures += 1;
        if (failures >= 3 && !stopped) setFailed(true);
      }
    };
    void ping();
    const timer = window.setInterval(ping, 20_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return failed ? <Alert layout="banner" variant="warning" role="status">{t('connectionLost')}</Alert> : null;
}

function useLanguage(): 'en' | 'nl' {
  const contextLanguage = useContext(LanguageContext);
  const storedLanguage = useSyncExternalStore(subscribeSettings, readStoredLanguage, serverLanguage);
  return contextLanguage ?? storedLanguage;
}

function serverLanguage(): 'en' | 'nl' {
  return 'nl';
}

function readStoredLanguage(): 'en' | 'nl' {
  try {
    const settings = JSON.parse(localStorage.getItem('mn.settings') ?? '{}');
    if (settings.language === 'en' || settings.language === 'nl') return settings.language;
  } catch {}
  return navigator.language.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

function subscribeSettings(onChange: () => void) {
  const sync = (event: StorageEvent) => {
    if (event.key === 'mn.settings') onChange();
  };
  window.addEventListener('storage', sync);
  return () => window.removeEventListener('storage', sync);
}

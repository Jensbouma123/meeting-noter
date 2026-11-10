'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@jensbouma123/acciva-ui';
import { findNewerRelease } from '@/lib/update/version.mjs';

const CURRENT = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
const DISMISS_KEY = 'mn.updateDismissed';

/** Dismissible "new version" notice. Asks GitHub only for release metadata. */
export function UpdateBanner() {
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void findNewerRelease(CURRENT).then((rel) => {
      if (cancelled || !rel) return;
      try {
        if (localStorage.getItem(DISMISS_KEY) === rel.version) return;
      } catch {}
      setLatest(rel.version);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!latest) return null;
  return (
    <Alert
      layout="banner"
      variant="info"
      role="status"
      dismissible
      onDismiss={() => {
        try {
          localStorage.setItem(DISMISS_KEY, latest);
        } catch {}
        setLatest(null);
      }}
    >
      Nieuwe versie beschikbaar ({latest}) — sluit de app en start opnieuw via Start Meeting Noter om te updaten.
    </Alert>
  );
}

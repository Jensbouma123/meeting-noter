'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { MIGRATED_EVENT, startServerSync, type MigrationResult } from '@/lib/meeting/server-sync';

/**
 * Starts the browser-to-disk meetings sync (`server-sync.ts`) once per tab and
 * confirms the one-time move of the browser's meetings into the DB.
 */
export function MeetingsSync() {
  const { toast } = useToast();
  const t = useT('lifecycle');
  // `toast` and `t` change identity across renders; the listener must stay put.
  const ui = useRef({ toast, t });
  useEffect(() => {
    ui.current = { toast, t };
  });

  useEffect(() => {
    const onMigrated = (event: Event) => {
      const { toast, t } = ui.current;
      const { imported, skipped, dataDir } = (event as CustomEvent<MigrationResult>).detail;
      const count = imported + skipped;
      toast({
        variant: 'success',
        title: t('meetingsMigratedTitle'),
        description: (count > 0 ? t('meetingsMigrated') : t('meetingsMigratedNone'))
          .replace('{count}', String(count))
          .replace('{dir}', dataDir),
        duration: 10_000,
      });
    };
    window.addEventListener(MIGRATED_EVENT, onMigrated);
    void startServerSync();
    return () => window.removeEventListener(MIGRATED_EVENT, onMigrated);
  }, []);

  return null;
}

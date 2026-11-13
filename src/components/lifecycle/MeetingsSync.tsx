'use client';

import { useEffect } from 'react';
import { useToast } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { MIGRATED_EVENT } from '@/lib/meeting/sync-migrate';
import { startServerSync } from '@/lib/meeting/sync-control';
import { type MigrationResult } from '@/lib/meeting/types/server-sync';

/**
 * Starts the browser-to-disk meetings sync (`server-sync.ts`) once per tab and
 * confirms the one-time move of the browser's meetings into the DB.
 */
export function MeetingsSync() {
  const { toast } = useToast();
  const t = useT('lifecycle');
  useEffect(() => {
    void startServerSync();
  }, []);

  useEffect(() => {
    const onMigrated = (event: Event) => {
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
    return () => window.removeEventListener(MIGRATED_EVENT, onMigrated);
  }, [toast, t]);

  return null;
}

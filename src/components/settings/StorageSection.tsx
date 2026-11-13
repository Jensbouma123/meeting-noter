'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, ConfirmDialog, Select, useToast } from '@jensbouma123/acciva-ui';
import { Trash2 } from 'lucide-react';
import { clearAutosavedSession } from '@/lib/meeting/autosave';
import { isCaptureActive } from '@/lib/meeting/transcript-session';
import { deleteSession, sweepMeetingStorage } from '@/lib/meeting/session-delete';
import { listSessions } from '@/lib/meeting/session-crud';
import { deleteAllOnServer } from '@/lib/meeting/sync-control';
import { getTranscriptSessionId } from '@/lib/meeting/transcript-session';
import { getPersistentStorageStatus, requestPersistentStorage } from '@/lib/meeting/persistent-storage';
import { RETENTION_OPTIONS, parseRetention, purgeExpiredSessions } from '@/lib/meeting/retention';
import { useT } from '@/lib/i18n/useT';
import type { SettingsSectionProps } from './types';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

export function StorageSection({
  settings,
  onSettingsChange,
}: SettingsSectionProps) {
  const t = useT('settings');
  const { toast } = useToast();
  const [sessionCount, setSessionCount] = useState(() => listSessions().length);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    void getPersistentStorageStatus().then((p) => live && setPersisted(p));
    return () => {
      live = false;
    };
  }, []);

  const requestStorageProtection = async () => {
    setPersisted(await requestPersistentStorage());
  };

  const changeRetention = (value: string) => {
    const retention = parseRetention(value);
    onSettingsChange({ ...settings, retention });
    if (purgeExpiredSessions(retention) > 0) {
      setSessionCount(listSessions().length);
      window.dispatchEvent(new Event('mn:sessions-changed'));
    }
  };

  const deleteAllMeetings = () => {
    for (const session of listSessions()) {
      deleteSession(session.sessionId);
    }
    if (!isCaptureActive()) clearAutosavedSession();
    sweepMeetingStorage(isCaptureActive() ? getTranscriptSessionId() : null);
    if (!isCaptureActive()) void deleteAllOnServer();
    const remaining = listSessions().length;
    setSessionCount(remaining);
    setConfirmOpen(false);
    window.dispatchEvent(new Event('mn:sessions-changed'));
    toast.success(remaining > 0 ? t('deleteRecordedKept') : t('allMeetingsDeleted'));
  };

  return (
    <>
      <Alert variant="success" layout="inline" title={t('deviceStorageTitle')}>
        {t('deviceStorageDescription')}
      </Alert>

      <SettingsGroup>
        <SettingsRow
          label={t('savedMeetings')}
          description={t('meetingCount').replace('{count}', String(sessionCount))}
          control={
            <Button
              variant="danger"
              size={{ base: 'md', md: 'sm' }}
              leadingIcon={<Trash2 className="size-3.5" />}
              onClick={() => setConfirmOpen(true)}
              disabled={sessionCount === 0}
              className="max-sm:w-full"
            >
              {t('deleteAllMeetings')}
            </Button>
          }
        />
        <SettingsRow
          label={t('retention')}
          description={t('retentionDescription')}
          htmlFor="setting-retention"
          control={
            <Select
              id="setting-retention"
              options={RETENTION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={settings.retention}
              onChange={changeRetention}
              aria-label={t('retentionAria')}
            />
          }
        />
        <SettingsRow
          label={t('browserStorage')}
          description={
            persisted === null
              ? t('browserStorageUnknown')
              : persisted
                ? t('browserStorageOn')
                : t('browserStorageOff')
          }
          control={
            persisted === false ? (
              <Button variant="outline" size={{ base: 'md', md: 'sm' }} onClick={requestStorageProtection} className="max-sm:w-full">
                {t('protectNow')}
              </Button>
            ) : null
          }
        />
      </SettingsGroup>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={deleteAllMeetings}
        title={t('deleteAllMeetingsTitle')}
        description={t('deleteAllMeetingsDescription')}
        confirmText={t('deleteAllMeetings')}
        variant="danger"
      />
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, ConfirmDialog, Select, useToast } from '@jensbouma123/acciva-ui';
import { Trash2 } from 'lucide-react';
import { clearAutosavedSession } from '@/lib/meeting/persist';
import { isCaptureActive } from '@/lib/meeting/store';
import { deleteSession, listSessions } from '@/lib/meeting/session-store';
import type { AppSettings } from '@/components/meeting/types';
import { getPersistentStorageStatus, requestPersistentStorage } from '@/lib/meeting/persistent-storage';
import { RETENTION_OPTIONS, parseRetention, purgeExpiredSessions } from '@/lib/meeting/retention';
import { SettingsGroup, SettingsRow } from './SettingsRow';

export function StorageSection({
  settings,
  onSettingsChange,
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
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

  const protect = async () => {
    setPersisted(await requestPersistentStorage());
  };

  const changeRetention = (value: string) => {
    const retention = parseRetention(value);
    onSettingsChange({ ...settings, retention });
    // Apply right away so shortening the period is not a surprise at next start.
    if (purgeExpiredSessions(retention) > 0) {
      setSessionCount(listSessions().length);
      window.dispatchEvent(new Event('mn:sessions-changed'));
    }
  };

  const clearAll = () => {
    // deleteSession refuses the meeting being recorded; keep it (and its autosave).
    for (const session of listSessions()) {
      deleteSession(session.sessionId);
    }
    if (!isCaptureActive()) clearAutosavedSession();
    const remaining = listSessions().length;
    setSessionCount(remaining);
    setConfirmOpen(false);
    window.dispatchEvent(new Event('mn:sessions-changed'));
    toast.success(remaining > 0 ? 'Meetings deleted. The one being recorded was kept.' : 'All meetings deleted');
  };

  return (
    <>
      <Alert variant="success" layout="inline" title="Everything stays on this device">
        Transcripts, speaker names and the speech model are stored only in this browser. Nothing
        is uploaded.
      </Alert>

      <SettingsGroup>
        <SettingsRow
          label="Saved meetings"
          description={`${sessionCount} meeting${sessionCount === 1 ? '' : 's'} in this browser.`}
          control={
            <Button
              variant="secondary"
              size={{ base: 'md', md: 'sm' }}
              leadingIcon={<Trash2 className="size-3.5" />}
              onClick={() => setConfirmOpen(true)}
              disabled={sessionCount === 0}
              className="max-sm:w-full"
            >
              Delete all meetings
            </Button>
          }
        />
        <SettingsRow
          label="Meetings automatisch verwijderen na"
          description="Oudere meetings worden bij het starten van de app verwijderd, met hun transcript."
          htmlFor="setting-retention"
          control={
            <Select
              id="setting-retention"
              options={RETENTION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={settings.retention}
              onChange={changeRetention}
              aria-label="Meetings automatisch verwijderen na"
            />
          }
        />
        <SettingsRow
          label="Bescherming tegen opschonen door de browser"
          description={
            persisted === null
              ? 'Deze browser kan dit niet aangeven.'
              : persisted
                ? 'Aan: de browser verwijdert je meetings niet uit zichzelf.'
                : 'Uit: de browser mag opslag opruimen bij weinig ruimte.'
          }
          control={
            persisted === false ? (
              <Button variant="secondary" size={{ base: 'md', md: 'sm' }} onClick={protect} className="max-sm:w-full">
                Nu beschermen
              </Button>
            ) : null
          }
        />
      </SettingsGroup>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={clearAll}
        title="Delete all meetings?"
        description="This permanently removes every saved transcript from this browser. This can't be undone."
        confirmText="Delete all meetings"
        variant="danger"
      />
    </>
  );
}

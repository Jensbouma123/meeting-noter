'use client';

import { useState } from 'react';
import { Alert, Button, ConfirmDialog, useToast } from '@jensbouma123/acciva-ui';
import { Trash2 } from 'lucide-react';
import { clearAutosavedSession } from '@/lib/meeting/persist';
import { isCaptureActive } from '@/lib/meeting/store';
import { deleteSession, listSessions } from '@/lib/meeting/session-store';
import { SettingsGroup, SettingsRow } from './SettingsRow';

export function StorageSection() {
  const { toast } = useToast();
  const [sessionCount, setSessionCount] = useState(() => listSessions().length);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

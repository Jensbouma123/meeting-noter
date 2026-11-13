'use client';

import { Alert, Button, ConfirmDialog, Text, VStack } from '@jensbouma123/acciva-ui';
import { useEffect, useEffectEvent, useState } from 'react';
import { useT } from '@/lib/i18n/useT';
import type { UpdateStatus } from './types';
import { useUpdate } from './useUpdate';

export function UpdateDialog({ open, onClose, isRecording = false }: { open: boolean; onClose: () => void; isRecording?: boolean }) {
  const t = useT('update');
  const update = useUpdate(isRecording);
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const applyUpdate = useEffectEvent(() => update.apply());

  useEffect(() => {
    if (!confirmed || !open) return;
    let active = true;
    let started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch('/api/app/update/status');
        if (!response.ok) throw new Error('status');
        const next = await response.json() as UpdateStatus;
        if (!active) return;
        setStatus(next);
        if (next.state === 'failed') { setFailed(true); return; }
        if (next.state === 'done') return;
        if (next.phase === 'restarting' && Date.now() - started > 120_000) { setFailed(true); return; }
      } catch {
        if (!active) return;
        if (Date.now() - started > 120_000) { setFailed(true); return; }
        setStatus((current) => current ? { ...current, phase: 'restarting' } : current);
      }
      timer = setTimeout(poll, 1000);
    };
    void (async () => {
      try {
        const next = await applyUpdate();
        if (!active) return;
        setStatus(next);
        started = Date.now();
        timer = setTimeout(poll, 1000);
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; clearTimeout(timer); };
  }, [confirmed, open]);

  useEffect(() => {
    if (!confirmed || !open || !status?.toVersion) return;
    let active = true;
    const health = async () => {
      try {
        const response = await fetch('/api/app/status');
        const data = await response.json() as { version?: string };
        if (active && data.version === status.toVersion) window.location.reload();
      } catch { void 0; }
    };
    const timer = setInterval(() => void health(), 1000);
    return () => { active = false; clearInterval(timer); };
  }, [confirmed, open, status?.toVersion]);

  const info = update.info;
  const failedText = status?.code === 'rolled-back' ? t('rolledBack').replace('{version}', status.fromVersion ?? '') : t('failed');
  const phaseKey = status?.phase === 'downloading' ? 'phaseDownloading' : status?.phase === 'installing' ? 'phaseInstalling' : status?.phase === 'restarting' ? 'phaseRestarting' : status?.phase === 'model' ? 'phaseModel' : 'phaseStarting';

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => setConfirmed(true)}
      title={t('confirmTitle').replace('{version}', info?.latest ?? '')}
      description={update.blockedRecording ? t('blockedRecording') : failed ? failedText : status?.state === 'done' ? t(status.restartRequired ? 'restartRequired' : 'done').replace('{version}', status.toVersion ?? '') : confirmed ? t(phaseKey) : t('confirmBody')}
      confirmText={confirmed ? t('updating') : t('confirm')}
      cancelText={t('cancel')}
      variant="primary"
      loading={confirmed}
    >
      {confirmed && <VStack spacing="sm" className="w-full">
        {failed && <Alert variant="danger" layout="inline">{failedText}</Alert>}
        {failed && status?.detail && <Text size="sm">{status.detail}</Text>}
        {status?.percent !== null && status?.percent !== undefined && <Text size="sm">{status.percent}%</Text>}
        {(failed || status?.state === 'done') && <Button variant="secondary" onClick={() => { setConfirmed(false); setFailed(false); setStatus(null); }}>{failed ? t('retry') : t('cancel')}</Button>}
      </VStack>}
    </ConfirmDialog>
  );
}

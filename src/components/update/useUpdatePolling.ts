'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import type { UpdateStatus } from './types';

export function useUpdatePolling({
  confirmed,
  open,
  apply,
}: {
  confirmed: boolean;
  open: boolean;
  apply: () => Promise<UpdateStatus>;
}) {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const applyUpdate = useEffectEvent(() => apply());

  useEffect(() => {
    if (!confirmed || !open) return;
    let active = true;
    let started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch('/api/app/update/status');
        if (!response.ok) throw new Error('status');
        const next = (await response.json()) as UpdateStatus;
        if (!active) return;
        setStatus(next);
        if (next.state === 'failed') {
          setFailed(true);
          return;
        }
        if (next.state === 'done') return;
        if (next.phase === 'restarting' && Date.now() - started > 120_000) {
          setFailed(true);
          return;
        }
      } catch {
        if (!active) return;
        if (Date.now() - started > 120_000) {
          setFailed(true);
          return;
        }
        setStatus((current) => (current ? { ...current, phase: 'restarting' } : current));
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
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [confirmed, open]);

  useEffect(() => {
    if (!confirmed || !open || !status?.toVersion) return;
    let active = true;
    const health = async () => {
      try {
        const response = await fetch('/api/app/status');
        const data = (await response.json()) as { version?: string };
        if (active && data.version === status.toVersion) window.location.reload();
      } catch {
        void 0;
      }
    };
    const timer = setInterval(() => void health(), 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [confirmed, open, status?.toVersion]);

  return { status, setStatus, failed, setFailed };
}

'use client';

import { useEffect, useState } from 'react';
import { CURRENT_VERSION } from '@/components/update/constants';
import { SAMPLE_NOTES, usePreview } from './preview';
import type { WhatsNewData } from './whatsNew.types';

const URL_PATH = '/api/app/whats-new';

export function useWhatsNew() {
  const preview = usePreview();
  const [data, setData] = useState<WhatsNewData | null>(null);

  useEffect(() => {
    if (preview === 'whats-new') {
      setData({ version: CURRENT_VERSION, notes: SAMPLE_NOTES, pageUrl: null });
      return;
    }
    if (preview) return;
    let active = true;
    void (async () => {
      try {
        const res = await fetch(URL_PATH);
        if (!res.ok) return;
        const body = await res.json() as { show?: boolean; version?: string; notes?: string | null; pageUrl?: string | null };
        if (active && body.show && body.version && body.notes) setData({ version: body.version, notes: body.notes, pageUrl: body.pageUrl ?? null });
      } catch { void 0; }
    })();
    return () => { active = false; };
  }, [preview]);

  const close = () => {
    setData(null);
    if (preview) return;
    void fetch(URL_PATH, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Meeting-Noter': '1' }, body: '{}' }).catch(() => undefined);
  };

  return { data, close };
}

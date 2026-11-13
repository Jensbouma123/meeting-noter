'use client';

import { useEffect, useState } from 'react';
import { CURRENT_VERSION } from '@/components/update/constants';
import { SAMPLE_NOTES, usePreview } from './preview';
import type { WhatsNewData } from './whatsNew.types';

const PREVIEW_DATA: WhatsNewData = { version: CURRENT_VERSION, notes: SAMPLE_NOTES, pageUrl: null };
const URL_PATH = '/api/app/whats-new';

export function useWhatsNew() {
  const preview = usePreview();
  const [fetched, setData] = useState<WhatsNewData | null>(null);
  const [previewClosed, setPreviewClosed] = useState(false);
  const data = preview === 'whats-new' ? (previewClosed ? null : PREVIEW_DATA) : fetched;

  useEffect(() => {
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
    if (preview) { setPreviewClosed(true); return; }
    setData(null);
    void fetch(URL_PATH, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Meeting-Noter': '1' }, body: '{}' }).catch(() => undefined);
  };

  return { data, close };
}

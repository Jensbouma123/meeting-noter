'use client';

import { useT } from '@/lib/i18n/useT';
import { ReleaseNotesDialog } from './ReleaseNotesDialog';
import { useWhatsNew } from './useWhatsNew';

export function WhatsNewDialog() {
  const t = useT('update');
  const { data, close } = useWhatsNew();
  if (!data) return null;
  return <ReleaseNotesDialog open onClose={close} title={t('whatsNewTitle').replace('{version}', data.version)} notes={data.notes} pageUrl={data.pageUrl} />;
}

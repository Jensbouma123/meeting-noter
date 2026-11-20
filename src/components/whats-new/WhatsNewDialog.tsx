'use client';

import { usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n/useT';
import { isDevRoute } from '@/lib/routes/is-dev-route';
import { ReleaseNotesDialog } from './ReleaseNotesDialog';
import { useWhatsNew } from './useWhatsNew';

export function WhatsNewDialog() {
  const t = useT('update');
  const { data, close } = useWhatsNew();
  const devRoute = isDevRoute(usePathname());
  if (!data || devRoute) return null;
  return (
    <ReleaseNotesDialog
      open
      onClose={close}
      title={t('whatsNewTitle').replace('{version}', data.version)}
      notes={data.notes}
      pageUrl={data.pageUrl}
    />
  );
}

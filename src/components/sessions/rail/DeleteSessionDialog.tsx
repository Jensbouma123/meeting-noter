import { ConfirmDialog } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { SessionDialogProps } from './types';

export function DeleteSessionDialog({ session, onClose, onConfirm }: SessionDialogProps) {
  const t = useT('sidebar');
  return (
    <ConfirmDialog
      open={session !== null}
      onClose={onClose}
      onConfirm={() => {
        if (session) onConfirm(session.sessionId);
      }}
      variant="danger"
      title={t('deleteTitle')}
      description={<>{t('deleteDescription').replace('{title}', session?.title ?? '')}</>}
      confirmText={t('deleteConfirm')}
      cancelText={t('cancel')}
    />
  );
}

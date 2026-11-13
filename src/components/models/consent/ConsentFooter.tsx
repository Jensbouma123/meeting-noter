import { Download } from 'lucide-react';
import { Button } from '@jensbouma123/acciva-ui';
import { cancelDownloads } from '@/lib/asr/browser';
import { recordConsent, resetConsent, setDialogVisible } from '@/lib/asr/browser/model-registry';
import { useT } from '@/lib/i18n/useT';
import type { ConsentFooterProps } from './types';

export function ConsentFooter({ preparing, userDeclined, primaryLabel, onStartDownloads, onDismiss }: ConsentFooterProps) {
  const t = useT('models');
  const hideDialog = () => {
    setDialogVisible(false);
    onDismiss?.();
  };

  if (preparing) {
    return (
      <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" size={{ base: 'md', md: 'sm' }} onClick={hideDialog}>
          {t('action.continueBackground')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {userDeclined && (
          <Button
            variant="ghost"
            size={{ base: 'md', md: 'sm' }}
            onClick={() => {
              resetConsent();
              setDialogVisible(false);
            }}
          >
            {t('action.forgetChoice')}
          </Button>
        )}
        <Button
          variant="outline"
          size={{ base: 'md', md: 'sm' }}
          onClick={() => {
            recordConsent('declined', []);
            setDialogVisible(false);
            cancelDownloads();
            onDismiss?.();
          }}
        >
          {t('action.notNow')}
        </Button>
      </div>

      <Button
        variant="primary"
        size={{ base: 'md', md: 'sm' }}
        leadingIcon={<Download className="size-4" />}
        onClick={onStartDownloads}
        className="w-full sm:w-auto"
      >
        {primaryLabel}
      </Button>
    </div>
  );
}

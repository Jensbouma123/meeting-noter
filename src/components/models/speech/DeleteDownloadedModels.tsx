import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Alert, Button, ConfirmDialog, HStack, Text, VStack } from '@jensbouma123/acciva-ui';
import { deleteDownloadedModels, type DeleteModelCacheResult } from '@/lib/asr/browser';
import { resetBrowserASR } from '@/lib/meeting/asr/reset';
import { useT } from '@/lib/i18n/useT';
import { isPreparing } from '../preparation/describePreparation';
import type { DeleteDownloadedModelsProps } from './types';

export function DeleteDownloadedModels({ models, preparation }: DeleteDownloadedModelsProps) {
  const t = useT('models');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<DeleteModelCacheResult | null>(null);

  const downloading = models.some((e) => e.status === 'downloading') || isPreparing(preparation);
  const anyCached = models.some((entry) => entry.status === 'cached');
  const anyPartialBytes =
    models.some((entry) => entry.progress.loadedBytes > 0) || preparation.downloadLoadedBytes > 0;

  const deleteModels = () => {
    setConfirmOpen(false);
    setBusy(true);
    setResult(null);
    resetBrowserASR();
    void deleteDownloadedModels()
      .then(setResult)
      .catch(() => setResult({ deleted: false }))
      .finally(() => setBusy(false));
  };

  return (
    <VStack spacing="xs" className="w-full">
      <HStack spacing="sm" justify="between" align="center" wrap>
        <Text size="xs" variant="muted">
          {anyCached ? t('privacy.cached') : anyPartialBytes ? t('privacy.partial') : t('privacy.empty')}
        </Text>
        <Button
          variant="secondary"
          size={{ base: 'md', md: 'sm' }}
          leadingIcon={<Trash2 className="size-3.5" />}
          disabled={busy}
          onClick={() => setConfirmOpen(true)}
        >
          {busy ? t('action.deleting') : downloading ? t('action.cancelDelete') : t('action.delete')}
        </Button>
      </HStack>

      {result && (
        <Alert variant={result.deleted ? 'success' : 'danger'} layout="inline">
          {result.deleted ? t('delete.success') : t('delete.conflict')}
        </Alert>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={deleteModels}
        title={t('delete.title')}
        description={t('delete.body')}
        confirmText={t('delete.confirm')}
        variant="danger"
      />
    </VStack>
  );
}

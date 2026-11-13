import { initiateDownloads, retryDownload, type ModelEntry } from '@/lib/asr/browser';
import { recordConsent } from '@/lib/asr/browser/model-registry-consent';
import { setDialogVisible } from '@/lib/asr/browser/model-registry-dialog';

export function acceptConsentAndStartDownloads(entries: Record<string, ModelEntry>) {
  const keys = Object.keys(entries);
  recordConsent('accepted', keys);
  const failedKeys = keys.filter((key) => entries[key]?.status === 'failed');
  setDialogVisible(true);
  if (failedKeys.length > 0) {
    void Promise.all(failedKeys.map((key) => retryDownload(key))).catch(() => undefined);
  } else {
    void initiateDownloads().catch(() => undefined);
  }
}

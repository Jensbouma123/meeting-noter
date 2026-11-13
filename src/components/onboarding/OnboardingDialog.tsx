'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { CheckCircle2, Download } from 'lucide-react';
import { Button, Input, Modal, Text, VStack } from '@jensbouma123/acciva-ui';
import {
  formatBytes,
  initiateDownloads,
  retryDownload,
} from '@/lib/asr/browser';
import { useModelSizesKnown } from '@/components/models/useModelSizesKnown';
import { getServerSnapshot, getState } from '@/lib/asr/browser/model-registry-snapshot';
import { recordConsent } from '@/lib/asr/browser/model-registry-consent';
import { setDialogVisible } from '@/lib/asr/browser/model-registry-dialog';
import { subscribeRegistry } from '@/lib/asr/browser/model-registry-state';
import { ProgressTrack } from '@/components/common/ProgressTrack';
import { VocabularyAddField } from '@/components/settings/VocabularyAddField';
import type { AppSettings } from '@/components/meeting/types';
import { useT } from '@/lib/i18n/useT';
import { useVocabulary } from '@/lib/vocabulary/store';
import { addNameToVocabulary } from '@/lib/vocabulary/names';
import { finishOnboarding, useOnboardingOpen } from '@/lib/onboarding/store';

const STEPS = ['welcome', 'who', 'models', 'words', 'done'] as const;
type StepId = (typeof STEPS)[number];
const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

/**
 * First-run welcome: what the app does, the speech-model download, the
 * user's own words, and where to find them later. Shown once; every step can
 * be skipped. It reuses the model registry's consent + download logic, so the
 * regular consent dialog stays hidden while this is open.
 */
export function OnboardingDialog({
  settings,
  onSettingsChange,
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
  const open = useOnboardingOpen();
  if (!open) return null;
  return <OnboardingSteps settings={settings} onSettingsChange={onSettingsChange} />;
}

function OnboardingSteps({
  settings,
  onSettingsChange,
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
  const t = useT('onboarding');
  const [stepId, setStepId] = useState<StepId>('welcome');
  const step = STEPS.indexOf(stepId) + 1;
  const { entries: words } = useVocabulary();
  const { entries } = useSyncExternalStore(subscribeRegistry, getState, getServerSnapshot);
  const sizeKnown = useModelSizesKnown(entries);
  const list = Object.values(entries).filter((e) => e.status !== 'unavailable');
  const modelsReady = list.length > 0 && list.every((e) => e.status === 'cached');
  const downloading = list.filter((e) => e.status === 'downloading');
  const failed = list.some((e) => e.status === 'failed');
  const missing = list.filter((e) => e.status !== 'cached');
  const totalBytes = missing.reduce((sum, e) => sum + e.estimatedSizeBytes, 0);
  const loaded = downloading.reduce((sum, e) => sum + e.progress.loadedBytes, 0);
  const total = downloading.reduce((sum, e) => sum + e.progress.totalBytes, 0);
  const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;

  // This dialog owns the download question while it is open, so the regular
  // consent dialog must not appear on top of it.
  useEffect(() => {
    setDialogVisible(false);
  }, []);

  const startDownload = () => {
    const keys = Object.keys(entries);
    recordConsent('accepted', keys);
    const failedKeys = keys.filter((k) => entries[k]?.status === 'failed');
    const run = failedKeys.length > 0
      ? Promise.all(failedKeys.map((k) => retryDownload(k)))
      : initiateDownloads();
    void run.catch(() => {
      // The registry entry carries the error; the step shows it.
    });
  };

  // Models already on disk: nothing to ask, skip straight past that step.
  const move = (delta: 1 | -1) => {
    let i = STEPS.indexOf(stepId) + delta;
    if (STEPS[i] === 'models' && modelsReady) i += delta;
    setStepId(STEPS[i]);
  };
  const next = () => move(1);
  const back = () => move(-1);
  const isLast = stepId === 'done';

  const sizeText = sizeKnown ? formatBytes(totalBytes) : '…';

  return (
    <Modal
      open
      onClose={finishOnboarding}
      size="lg"
      title={t(`${stepId}.title`)}
      description={fill(t('step'), { n: step, total: STEPS.length })}
      footer={
        <div className="dialog-actions flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {isLast ? (
            <span />
          ) : (
            <Button variant="ghost" size={{ base: 'md', md: 'sm' }} onClick={finishOnboarding}>
              {t('skip')}
            </Button>
          )}
          <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row">
            {step > 1 && !isLast && (
              <Button variant="outline" size={{ base: 'md', md: 'sm' }} onClick={back}>
                {t('back')}
              </Button>
            )}
            {isLast ? (
              <Button variant="primary" size={{ base: 'md', md: 'sm' }} onClick={finishOnboarding} className="w-full sm:w-auto">
                {t('finish')}
              </Button>
            ) : (
              <Button variant="primary" size={{ base: 'md', md: 'sm' }} onClick={next} className="w-full sm:w-auto">
                {t('next')}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <VStack spacing="md" className="w-full">
        {stepId === 'welcome' && <Text size="sm">{t('welcome.body')}</Text>}

        {stepId === 'who' && (
          <VStack spacing="sm" className="w-full">
            <Text size="sm">{t('who.body')}</Text>
            <Input
              id="onboarding-owner-name"
              aria-label={t('who.label')}
              value={settings.ownerName}
              onChange={(e) => onSettingsChange({ ...settings, ownerName: e.target.value })}
              placeholder={t('who.placeholder')}
              onBlur={() => addNameToVocabulary(settings.ownerName)}
              autoComplete="name"
            />
          </VStack>
        )}

        {stepId === 'models' && (
          <VStack spacing="sm" className="w-full">
            {modelsReady ? (
              <div className="flex items-center gap-2" role="status">
                <CheckCircle2 className="size-4 shrink-0 text-success" />
                <Text size="sm">{t('models.ready')}</Text>
              </div>
            ) : (
              <>
                <Text size="sm">{fill(t('models.body'), { size: sizeText })}</Text>
                {downloading.length > 0 && (
                  <VStack spacing="xs" className="w-full">
                    <ProgressTrack value={percent} label={t('models.downloading')} />
                    <Text size="xs" variant="muted" role="status">
                      {t('models.downloading')} {percent}%
                    </Text>
                  </VStack>
                )}
                {failed && (
                  <Text size="sm" variant="danger" role="alert">
                    {t('models.failed')}
                  </Text>
                )}
                {downloading.length === 0 && (
                  <div>
                    <Button
                      variant="primary"
                      size={{ base: 'md', md: 'sm' }}
                      leadingIcon={<Download className="size-4" />}
                      disabled={list.length === 0}
                      onClick={startDownload}
                    >
                      {failed ? t('models.retry') : fill(t('models.download'), { size: sizeText })}
                    </Button>
                  </div>
                )}
              </>
            )}
          </VStack>
        )}

        {stepId === 'words' && (
          <VStack spacing="sm" className="w-full">
            <Text size="sm">{t('words.body')}</Text>
            <VocabularyAddField
              id="onboarding-words"
              placeholder="Framna"
            />
            {words.length > 0 && (
              <Text size="xs" variant="muted">
                {fill(t('words.inList'), { list: words.map((w) => w.word).join(', ') })}
              </Text>
            )}
          </VStack>
        )}

        {stepId === 'done' && (
          <VStack spacing="sm" className="w-full">
            <Text size="sm">{t('done.body')}</Text>
            <Text size="xs" variant="muted">
              {t('done.reopen')}
            </Text>
          </VStack>
        )}
      </VStack>
    </Modal>
  );
}

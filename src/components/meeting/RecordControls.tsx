'use client';

import { Circle, Download, Pause, Play, Square } from 'lucide-react';
import { Button } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { MODEL_TINT, ROUND, STOP_TINT } from './bottomDockStyles';
import { formatElapsed } from './formatElapsed';
import type { RecordControlsProps } from './RecordControls.types';

export function RecordControls({
  isStopping,
  isRecordingActive,
  isPaused,
  needsModel,
  recordDisabled,
  recordTooltip,
  finishingLabel,
  elapsedSeconds,
  onStart,
  onStop,
  onPause,
  onResume,
}: RecordControlsProps) {
  const t = useT('dock');

  if (isStopping) {
    return (
      <Button
        variant="ghost"
        size="md"
        disabled
        loading
        tooltip={t('finishingTip')}
        aria-label={finishingLabel}
        className={`shrink-0 whitespace-nowrap tabular-nums ${ROUND}`}
      >
        {finishingLabel}
      </Button>
    );
  }

  if (isRecordingActive) {
    return (
      <>
        <Button
          variant="ghost"
          size="md"
          onClick={onStop}
          tooltip={t('stopTip')}
          aria-label={`${t('stop')}, ${formatElapsed(elapsedSeconds)}${isPaused ? `, ${t('paused')}` : ''}`}
          leadingIcon={<Square className="!size-3.5 fill-current" />}
          className={`btn-record-spring shrink-0 tabular-nums ${ROUND} ${STOP_TINT}`}
        >
          <span role="timer">{formatElapsed(elapsedSeconds)}</span>
        </Button>
        <Button
          variant="ghost"
          size="md"
          iconOnly
          onClick={isPaused ? onResume : onPause}
          tooltip={isPaused ? t('resumeTip') : t('pauseTip')}
          aria-label={isPaused ? t('resume') : t('pause')}
          leadingIcon={
            isPaused ? (
              <Play className="ml-0.5 fill-current text-primary-600 dark:text-primary-400" />
            ) : (
              <Pause className="fill-current" />
            )
          }
          className={`shrink-0 ${ROUND}`}
        />
      </>
    );
  }

  return (
    <Button
      variant={needsModel ? 'ghost' : 'danger'}
      size="md"
      onClick={onStart}
      disabled={recordDisabled}
      tooltip={recordTooltip}
      aria-label={needsModel ? t('downloadModel') : recordTooltip}
      leadingIcon={needsModel ? <Download /> : <Circle className="!size-3 fill-current" />}
      className={`btn-record-spring shrink-0 whitespace-nowrap ${ROUND} ${needsModel ? MODEL_TINT : ''}`}
    >
      {needsModel ? t('downloadModel') : t('record')}
    </Button>
  );
}

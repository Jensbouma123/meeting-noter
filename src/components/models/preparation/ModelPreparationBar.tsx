'use client';

import { Text } from '@jensbouma123/acciva-ui';
import { ProgressTrack } from '@/components/common/ProgressTrack';
import { useT } from '@/lib/i18n/useT';
import { describePreparation, describePreparationDetail } from './describePreparation';
import type { ModelPreparationState } from './types';

export function ModelPreparationBar({ state }: { state: ModelPreparationState }) {
  const t = useT('models');
  const labelKey = describePreparation(state);
  if (labelKey === null) return null;
  const label = labelKey.startsWith('status.preparing')
    ? `${t('status.preparing')}${labelKey.slice('status.preparing'.length)}`
    : labelKey;
  const percent = state.engine.stage === 'downloading' ? state.downloadPercent : state.engine.percent;

  const detail = describePreparationDetail(state);

  return (
    <div className="flex w-full flex-col gap-1">
      <ProgressTrack value={percent} label={label} />
      <Text size="xs" variant="muted" font="mono" className="tabular-nums">
        {label}
      </Text>
      {detail && (
        <Text size="xs" variant="subtle" className="break-words">
          {detail}
        </Text>
      )}
    </div>
  );
}

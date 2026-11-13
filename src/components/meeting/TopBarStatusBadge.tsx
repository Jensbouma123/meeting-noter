import { Badge, Button } from '@jensbouma123/acciva-ui';
import { Download, TriangleAlert } from 'lucide-react';
import type { Status } from '@/lib/meeting';
import type { ModelProgressView, ModelReadiness } from './modelReadiness.types';
import type { TopBarStatusBadgeProps } from './TopBarStatusBadge.types';

function modelPillLabel(
  t: (key: string) => string,
  modelReadiness: ModelReadiness,
  modelProgress: ModelProgressView
): string {
  if (modelReadiness === 'failed') return t('modelFailed');
  if (modelProgress.stage) return modelProgress.label;
  if (modelReadiness === 'downloading' || modelReadiness === 'loading') {
    return t('modelPreparing');
  }
  return t('modelMissing');
}

function RecordingStatusBadge({ t, status }: { t: (key: string) => string; status: Status }) {
  switch (status) {
    case 'live':
      return (
        <Badge variant="success" className="mn-chip-success" dot size="sm">
          {t('recording')}
        </Badge>
      );
    case 'paused':
      return (
        <Badge variant="warning" className="mn-chip-warning" dot size="sm">
          {t('paused')}
        </Badge>
      );
    case 'requesting':
      return (
        <Badge variant="warning" className="mn-chip-warning" size="sm">
          {t('waiting')}
        </Badge>
      );
    case 'connecting':
      return (
        <Badge variant="warning" className="mn-chip-warning" size="sm">
          {t('starting')}
        </Badge>
      );
    case 'stopping':
      return (
        <Badge variant="neutral" size="sm">
          {t('stopping')}
        </Badge>
      );
    default:
      return (
        <Badge variant="danger" className="mn-chip-danger" size="sm">
          {t('recordingError')}
        </Badge>
      );
  }
}

export function TopBarStatusBadge({
  t,
  status,
  modelReadiness,
  modelProgress,
  onOpenSettings,
}: TopBarStatusBadgeProps) {
  if (status !== 'idle') return <RecordingStatusBadge t={t} status={status} />;
  if (modelReadiness === 'ready') return null;

  const failed = modelReadiness === 'failed';
  return (
    <Button
      variant={failed ? 'danger' : 'outline'}
      size="xs"
      onClick={() => onOpenSettings('advanced')}
      tooltip={t('openAdvanced')}
      leadingIcon={
        failed ? <TriangleAlert className="size-3.5" /> : <Download className="size-3.5" />
      }
    >
      {modelPillLabel(t, modelReadiness, modelProgress)}
    </Button>
  );
}

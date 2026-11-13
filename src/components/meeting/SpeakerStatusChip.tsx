'use client';

import { useT } from '@/lib/i18n/useT';
import { Button, Tooltip } from '@jensbouma123/acciva-ui';
import { TriangleAlert } from 'lucide-react';
import type { SpeakerStatusChipProps } from './SpeakerStatusChip.types';

export function SpeakerStatusChip({ status, onOpenSettings }: SpeakerStatusChipProps) {
  const t = useT('topbar');
  if (status?.phase !== 'unavailable') return null;

  const reason = status.reason;
  const unavailable = t('speakerUnavailable');
  return (
    <Tooltip content={reason ? `${unavailable}: ${reason}` : unavailable}>
      <Button
        variant="outline"
        size="xs"
        onClick={() => onOpenSettings('advanced')}
        leadingIcon={<TriangleAlert className="size-3.5 text-warning" aria-hidden="true" />}
        aria-label={`${unavailable}${reason ? `: ${reason}` : ''}. ${t('openAdvanced')}`}
        data-testid="speaker-status"
        data-phase="unavailable"
        className="touch-target-44 max-w-full"
      >
        <span className="hidden sm:inline">{unavailable}</span>
        {reason && <span className="hidden max-w-48 truncate text-muted-foreground xl:inline">{reason}</span>}
      </Button>
    </Tooltip>
  );
}

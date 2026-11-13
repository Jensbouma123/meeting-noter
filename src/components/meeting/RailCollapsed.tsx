'use client';

import { PanelRightOpen, Users } from 'lucide-react';
import { Badge, Button } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { RailCollapsedProps } from './RightRail.types';

export function RailCollapsed({ speakerCount, onExpand }: RailCollapsedProps) {
  const t = useT('rail');
  return (
    <div className="flex h-full w-12 flex-col items-center gap-3 py-3">
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        className="touch-target-44"
        onClick={onExpand}
        tooltip={t('showRail')}
        aria-label={t('showRail')}
        leadingIcon={<PanelRightOpen className="size-4" aria-hidden="true" />}
      />
      <Users className="size-4 text-muted-foreground" aria-hidden="true" />
      {speakerCount > 0 && (
        <Badge variant="neutral" size="xs">
          {speakerCount}
        </Badge>
      )}
    </div>
  );
}

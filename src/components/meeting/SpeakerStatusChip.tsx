'use client';

import type { ReactNode } from 'react';
import type { DiarizationStatus } from '@/lib/meeting/types';
import { Badge, Button, Tooltip } from '@jensbouma123/acciva-ui';
import { AudioLines, Loader2, TriangleAlert } from 'lucide-react';
import type { SettingsSectionId } from '@/components/settings/sections';

interface SpeakerStatusChipProps {
  status: DiarizationStatus | undefined;
  onOpenSettings: (section?: SettingsSectionId) => void;
}

/** Icon + label; below `sm` only the icon shows (the tooltip carries the text). */
function ChipBody({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </>
  );
}

export function SpeakerStatusChip({ status, onOpenSettings }: SpeakerStatusChipProps) {
  const phase = status?.phase ?? 'off';
  if (phase === 'off') return null;

  if (phase === 'waiting' || phase === 'loading') {
    const tip = status?.reason ?? 'Speaker detection is getting ready';
    return (
      <Tooltip content={tip}>
        <Badge
          variant="warning"
          size="sm"
          aria-label="Identifying speakers"
          data-testid="speaker-status"
          data-phase={phase}
        >
          <ChipBody
            icon={<Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />}
            label="Identifying speakers..."
          />
        </Badge>
      </Tooltip>
    );
  }

  if (phase === 'active') {
    const tip =
      status?.backend === 'wasm' ? 'CPU - labels may lag ~5 s' : 'GPU';
    return (
      <Tooltip content={tip}>
        <Badge
          variant="success"
          size="sm"
          aria-label="Speakers live"
          data-testid="speaker-status"
          data-phase="active"
        >
          <ChipBody icon={<AudioLines className="size-3" aria-hidden="true" />} label="Speakers live" />
        </Badge>
      </Tooltip>
    );
  }

  const reason = status?.reason;
  return (
    <Tooltip content={reason ? `Speaker detection unavailable: ${reason}` : 'Speaker detection unavailable'}>
      <Button
        variant="secondary"
        size="xs"
        onClick={() => onOpenSettings('speech-model')}
        leadingIcon={<TriangleAlert className="size-3.5 text-warning" aria-hidden="true" />}
        aria-label={`Speaker detection unavailable${reason ? `: ${reason}` : ''}. Open model settings`}
        data-testid="speaker-status"
        data-phase="unavailable"
        className="touch-target-44 max-w-full"
      >
        <span className="hidden sm:inline">Speaker detection unavailable</span>
        {reason && <span className="hidden max-w-48 truncate text-muted-foreground xl:inline">{reason}</span>}
      </Button>
    </Tooltip>
  );
}

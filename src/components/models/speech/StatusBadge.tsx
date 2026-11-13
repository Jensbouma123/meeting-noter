import { Badge } from '@jensbouma123/acciva-ui';
import type { ModelEntry } from '@/lib/asr/browser';
import { useT } from '@/lib/i18n/useT';
import { SPEECH_STATUS_BADGE } from './constants';

export function StatusBadge({ status }: { status: ModelEntry['status'] }) {
  const t = useT('models');
  const badge = SPEECH_STATUS_BADGE[status];
  if (!badge) return null;
  return (
    <Badge variant={badge.variant} className={`mn-chip-${badge.variant}`} size="sm" dot>
      {t(badge.label)}
    </Badge>
  );
}

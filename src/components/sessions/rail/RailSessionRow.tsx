import { useSyncExternalStore } from 'react';
import { Badge, ListItem } from '@jensbouma123/acciva-ui';
import { isSessionRecording } from '@/lib/meeting/session-delete';
import { subscribe as subscribeMeetingStore } from '@/lib/meeting/store-core';
import { openCount } from '@/lib/meeting/notes';
import { useT } from '@/lib/i18n/useT';
import { FolderSuggestionChip } from './FolderSuggestionChip';
import { RailSessionRowMenu } from './RailSessionRowMenu';
import { formatDuration, formatTime } from './formatters';
import { getRailBadgeState } from './getRailBadgeState';
import { useRailRowMenu } from './useRailRowMenu';
import type { RailSessionRowProps } from './types';

export function RailSessionRow(props: RailSessionRowProps) {
  const { session, isActive, pathLabel, suggestion, suggesting, onOpen, onClear, onDelete, onMove, onSuggest } = props;
  const t = useT('sidebar');
  useSyncExternalStore(subscribeMeetingStore, () => isSessionRecording(session.sessionId), () => false);
  const locked = isSessionRecording(session.sessionId);
  const badgeState = getRailBadgeState(session, locked);
  const count = openCount(session.sessionId);
  const base = `${formatTime(session.createdAt)} · ${formatDuration(session.durationSeconds)}`;
  const subtitle = pathLabel ? `${pathLabel} · ${base}` : base;
  const { menuOpen, setMenuOpen, openMenuOnContext } = useRailRowMenu();
  return (
    <div className="group relative w-full" onContextMenu={openMenuOnContext}>
      <ListItem
        title={session.title}
        subtitle={subtitle}
        selected={isActive}
        onClick={onOpen}
        trailing={
          <>
            {count > 0 && (
              <Badge variant="neutral" size="xs">
                {t('openCount').replace('{n}', String(count))}
              </Badge>
            )}
            {badgeState === 'recording' ? (
              <Badge variant="danger" className="mn-chip-danger" size="xs" dot>
                {t('recording')}
              </Badge>
            ) : badgeState === 'draft' ? (
              <Badge variant="warning" className="mn-chip-warning" size="xs">
                {t('notRecorded')}
              </Badge>
            ) : undefined}
          </>
        }
        className="w-full pr-10"
      />
      {suggestion && <FolderSuggestionChip title={session.title} suggestion={suggestion} />}
      <div className="absolute right-1 top-1/2 -translate-y-1/2">
        <RailSessionRowMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          title={session.title}
          isActive={isActive}
          locked={locked}
          suggesting={suggesting}
          onOpen={onOpen}
          onMove={onMove}
          onSuggest={onSuggest}
          onClear={onClear}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

import { useSyncExternalStore } from 'react';
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, ListItem, Text } from '@jensbouma123/acciva-ui';
import { ArrowRight, Eraser, FolderInput, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { isSessionRecording } from '@/lib/meeting/session-store';
import { subscribe as subscribeMeetingStore } from '@/lib/meeting/store';
import { openCount } from '@/lib/meeting/notes';
import { useT } from '@/lib/i18n/useT';
import { useFoldersT } from '../folders/useFoldersT';
import { formatDuration, formatTime } from './formatters';
import { getRailBadgeState } from './getRailBadgeState';
import type { RailSessionRowProps } from './types';

export function RailSessionRow({ session, isActive, onOpen, onClear, onDelete, onMove, pathLabel }: RailSessionRowProps) {
  const t = useT('sidebar');
  const tf = useFoldersT();
  useSyncExternalStore(subscribeMeetingStore, () => isSessionRecording(session.sessionId), () => false);
  const recording = isSessionRecording(session.sessionId);
  const badgeState = getRailBadgeState(session, recording);
  const locked = isSessionRecording(session.sessionId);
  const count = openCount(session.sessionId);
  const base = `${formatTime(session.createdAt)} · ${formatDuration(session.durationSeconds)}`;
  const subtitle = pathLabel ? `${pathLabel} · ${base}` : base;
  return (
    <div className="group relative w-full">
      <ListItem
        title={session.title}
        subtitle={subtitle}
        selected={isActive}
        onClick={onOpen}
        leading={
          session.isDraft ? (
            <span aria-hidden="true" className="text-muted-foreground">
              <Pencil className="size-4" />
            </span>
          ) : undefined
        }
        trailing={<>
          {count > 0 && <Badge variant="neutral" size="xs">{t('openCount').replace('{n}', String(count))}</Badge>}
          {badgeState === 'recording' ? (
            <Badge variant="danger" size="xs" dot>{t('recording')}</Badge>
          ) : badgeState === 'draft' ? (
            <Badge variant="warning" size="xs">{t('notRecorded')}</Badge>
          ) : undefined}
        </>}
        className="w-full pr-10"
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              tooltip={t('more').replace('{title}', session.title)}
              leadingIcon={<MoreHorizontal className="size-4" />}
              className="touch-target-44"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isActive && (
              <DropdownMenuItem icon={<ArrowRight className="size-4" />} onClick={onOpen}>
                {t('open')}
              </DropdownMenuItem>
            )}
            {onMove && (
              <DropdownMenuItem icon={<FolderInput className="size-4" />} onClick={onMove}>
                {tf('moveTo')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="danger" icon={<Eraser className="size-4" />} disabled={locked} onClick={onClear}>
              {t('clear')}
            </DropdownMenuItem>
            {locked && (
              <Text size="xs" variant="muted" className="px-2 py-1">
                {t('stopFirst')}
              </Text>
            )}
            <DropdownMenuItem variant="danger" icon={<Trash2 className="size-4" />} disabled={locked} onClick={onDelete}>
              {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

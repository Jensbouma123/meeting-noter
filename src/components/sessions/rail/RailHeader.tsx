import { Badge, Button, HStack, Heading } from '@jensbouma123/acciva-ui';
import { PanelLeftClose, PanelLeftOpen, Plus, Video } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import type { RailHeaderProps } from './types';

export function RailHeader({ sessionCount, open, onNewSession, onToggle }: RailHeaderProps) {
  const t = useT('sidebar');
  return (
    <HStack as="header" spacing="sm" justify="between" className="h-14 box-border shrink-0 border-b border-border-subtle px-3">
      <HStack spacing="sm" className="min-w-0 flex-1">
        <Video className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Heading as="span" size="xs" variant="muted" weight="semibold" truncate>
          {t('meetings')}
        </Heading>
        <Badge variant="neutral" size="sm">
          {sessionCount}
        </Badge>
      </HStack>
      <HStack spacing="xs" className="shrink-0">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={onNewSession}
          tooltip={t('new')}
          aria-label={t('new')}
          leadingIcon={<Plus className="size-4" />}
          className="touch-target-44"
        />
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={onToggle}
          tooltip={open ? t('hide') : t('show')}
          leadingIcon={open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          className="hidden touch-target-44 lg:inline-flex"
        />
      </HStack>
    </HStack>
  );
}

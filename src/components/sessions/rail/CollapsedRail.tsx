import { Button, HStack, VStack } from '@jensbouma123/acciva-ui';
import { PanelLeftOpen, Plus } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import type { CollapsedRailProps } from './types';

export function CollapsedRail({ onNewSession, onToggle }: CollapsedRailProps) {
  const t = useT('sidebar');
  return (
    <VStack spacing="lg" align="center" className="h-full">
      <HStack as="header" align="center" justify="center" className="h-14 w-full box-border shrink-0 border-b border-border-subtle">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={onToggle}
          tooltip={t('show')}
          leadingIcon={<PanelLeftOpen className="size-4" />}
          className="touch-target-44"
        />
      </HStack>
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
    </VStack>
  );
}

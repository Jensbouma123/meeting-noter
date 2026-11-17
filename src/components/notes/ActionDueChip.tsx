import { useState } from 'react';
import { Button, Input, Popover, VStack } from '@jensbouma123/acciva-ui';
import { CalendarDays } from 'lucide-react';
import { updateAction } from '@/lib/meeting/notes';
import { CHIP } from './constants';
import type { ActionDueChipProps } from './ActionDueChip.types';

export function ActionDueChip({ item, t, sessionId }: ActionDueChipProps) {
  const [dueOpen, setDueOpen] = useState(false);
  return (
    <Popover
      open={dueOpen}
      onOpenChange={setDueOpen}
      onClose={() => setDueOpen(false)}
      dismissOnOutsideClick
      placement="bottom"
      maxWidth={220}
      title={t('due')}
      content={
        <VStack spacing="sm" className="w-full">
          <Input
            autoFocus
            aria-label={t('due')}
            type="date"
            value={item.due ?? ''}
            onChange={(event) => updateAction(sessionId, item.id, { due: event.target.value || undefined })}
            className="w-full min-w-0"
          />
          {item.due && (
            <Button
              size="sm"
              variant="ghost"
              className="whitespace-nowrap"
              onClick={() => {
                updateAction(sessionId, item.id, { due: undefined });
                setDueOpen(false);
              }}
            >
              {t('clearDue')}
            </Button>
          )}
        </VStack>
      }
    >
      <button type="button" className={CHIP} aria-label={`${t('due')}: ${item.due ?? t('noDue')}`}>
        <CalendarDays aria-hidden="true" className="size-3 shrink-0" />
        <span className="truncate">{item.due ?? t('due')}</span>
      </button>
    </Popover>
  );
}

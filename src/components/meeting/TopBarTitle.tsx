import { useState, useCallback } from 'react';
import { Button, HStack, Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { Check, PanelLeftOpen, Pencil } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { formatMeetingDate } from './topBarFormat';
import type { TopBarTitleProps } from './TopBarTitle.types';

function focusAndSelectTitle(input: HTMLInputElement | null) {
  input?.focus();
  input?.select();
}

export function TopBarTitle({ title, dateMs, onTitleChange }: TopBarTitleProps) {
  const t = useT('topbar');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);

  const commitTitle = useCallback(() => {
    const trimmed = titleDraft.trim();
    const finalTitle = trimmed.length > 0 ? trimmed : t('titleUntitled');
    setTitleDraft(finalTitle);
    onTitleChange(finalTitle);
    setIsEditingTitle(false);
  }, [titleDraft, onTitleChange, t]);

  const cancelTitleEdit = useCallback(() => {
    setTitleDraft(title);
    setIsEditingTitle(false);
  }, [title]);

  return (
    <HStack spacing="xs" className="min-w-0 flex-1 overflow-hidden max-sm:basis-full">
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        tooltip={t('showMeetings')}
        leadingIcon={<PanelLeftOpen className="size-4" />}
        className="touch-target-44 shrink-0 lg:hidden"
        onClick={() => window.dispatchEvent(new Event('mn:open-sessions'))}
      />
      <h1 className="sr-only">{title}</h1>

      {isEditingTitle ? (
        <HStack spacing="xs" className="min-w-0 flex-1">
          <Input
            ref={focusAndSelectTitle}
            size="sm"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') cancelTitleEdit();
            }}
            maxLength={80}
            aria-label={t('meetingTitle')}
            className="min-w-0 flex-1 sm:max-w-xs"
          />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={commitTitle}
            tooltip={t('saveName')}
            leadingIcon={<Check className="size-4 text-success" />}
            className="touch-target-44 shrink-0"
          />
        </HStack>
      ) : (
        <VStack spacing="none" className="min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTitleDraft(title);
              setIsEditingTitle(true);
            }}
            tooltip={t('renameMeeting')}
            leadingIcon={<Pencil className="size-3 text-muted-foreground" />}
            className="group min-w-0 justify-start"
          >
            <span className="truncate text-sm font-semibold sm:text-base">{title}</span>
          </Button>
          {dateMs ? (
            <Text as="span" size="xs" variant="muted" className="truncate pl-3 leading-none">
              {formatMeetingDate(dateMs)}
            </Text>
          ) : null}
        </VStack>
      )}
    </HStack>
  );
}

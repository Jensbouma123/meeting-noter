import { useState } from 'react';
import {
  Badge,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  HStack,
  Text,
} from '@jensbouma123/acciva-ui';
import { Eraser, MoreHorizontal, Search, Settings, Share2, Users } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { ShortcutsHelp } from './ShortcutsHelp';
import type { TopBarActionsProps } from './TopBarActions.types';

export function TopBarActions({
  onOpenSettings,
  onClearTranscript,
  clearDisabled,
  onOpenShare,
  updateAvailable,
  modelFailed,
}: TopBarActionsProps) {
  const t = useT('topbar');
  const [clearOpen, setClearOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <>
      <HStack spacing="xs" align="center" data-testid="topbar-actions" className="min-w-0 shrink-0 gap-0.5 sm:gap-1">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip={t('showSpeakers')}
          leadingIcon={<Users className="size-4" />}
          className="touch-target-44 lg:hidden"
          onClick={() => window.dispatchEvent(new Event('mn:open-speakers'))}
        />

        <Button
          variant="outline"
          size="sm"
          leadingIcon={<Share2 className="size-4" />}
          onClick={onOpenShare}
          className="touch-target-44"
        >
          {t('share')}
        </Button>

        {onClearTranscript && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                tooltip={t('moreActions')}
                aria-label={t('moreActions')}
                leadingIcon={<MoreHorizontal className="size-4" />}
                className="touch-target-44"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem icon={<Search className="size-4" />} onClick={() => window.dispatchEvent(new Event('mn:search'))}>
                {t('search')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                {t('shortcuts')}
              </DropdownMenuItem>
              {updateAvailable && <DropdownMenuItem onClick={() => onOpenSettings('about')}>
                {t('installUpdate')} <Badge size="sm" variant="info">{t('new')}</Badge>
              </DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="danger" icon={<Eraser className="size-4" />} disabled={clearDisabled} onClick={() => setClearOpen(true)}>
                {t('clear')}
              </DropdownMenuItem>
              {clearDisabled && (
                <Text size="xs" variant="muted" className="px-2 py-1">
                  {t('stopBeforeClear')}
                </Text>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={() => onOpenSettings()}
          tooltip={t('settings')}
          leadingIcon={<span className="relative"><Settings className="size-4" />{(updateAvailable || modelFailed) && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-danger" aria-label={t('new')} />}</span>}
          className="touch-target-44"
        />
      </HStack>
      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={() => {
          setClearOpen(false);
          onClearTranscript?.();
        }}
        variant="danger"
        title={t('clearConfirmTitle')}
        description={t('clearConfirmDescription')}
        confirmText={t('clear')}
        cancelText={t('cancel')}
      />
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}

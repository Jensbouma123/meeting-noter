'use client';

import {
  Badge,
  Button,
  Divider,
  HStack,
  Modal,
  Text,
  VStack,
} from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { SHORTCUTS } from './shortcuts';
import type { ShortcutsHelpProps } from './ShortcutsHelp.types';

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  const t = useT('dialogs');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('shortcuts.title')}
      description={t('shortcuts.description')}
      size="sm"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          {t('shortcuts.closeButton')}
        </Button>
      }
    >
      <VStack spacing="none" className="w-full">
        {SHORTCUTS.map((s, i) => (
          <VStack key={s.label} spacing="sm" className="w-full">
            {i > 0 && <Divider />}
            <HStack spacing="md" justify="between" align="center">
              <Text size="sm" variant="muted" className="min-w-0">
                {t(s.label)}
              </Text>
              <HStack spacing="xs" className="shrink-0">
                {s.keys.map((k) => (
                  <kbd key={k} className="contents">
                    <Badge variant="neutral" size="sm" className="font-mono">
                      {k}
                    </Badge>
                  </kbd>
                ))}
              </HStack>
            </HStack>
          </VStack>
        ))}
      </VStack>
    </Modal>
  );
}

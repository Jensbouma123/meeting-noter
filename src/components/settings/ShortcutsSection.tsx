'use client';

import { Badge, HStack } from '@jensbouma123/acciva-ui';
import { SHORTCUTS } from '@/components/meeting/shortcuts';
import { useT } from '@/lib/i18n/useT';
import { SettingsGroup, SettingsRow } from './SettingsRow';

export function ShortcutsSection() {
  const t = useT('dialogs');
  return (
    <SettingsGroup>
      {SHORTCUTS.map((s) => (
        <SettingsRow
          key={s.label}
          label={t(s.label)}
          control={
            <HStack spacing="xs" className="flex-wrap">
              {s.keys.map((k) => (
                <Badge key={k} variant="neutral" size="sm" className="font-mono">
                  {k}
                </Badge>
              ))}
            </HStack>
          }
        />
      ))}
    </SettingsGroup>
  );
}

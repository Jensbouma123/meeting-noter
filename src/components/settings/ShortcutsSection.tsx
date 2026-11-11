'use client';

import { Badge, HStack } from '@jensbouma123/acciva-ui';
import { SHORTCUTS } from '@/components/meeting/ShortcutsHelp';
import { SettingsGroup, SettingsRow } from './SettingsRow';

export function ShortcutsSection() {
  return (
    <SettingsGroup>
      {SHORTCUTS.map((s) => (
        <SettingsRow
          key={s.label}
          label={`shortcut:${s.label}`}
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

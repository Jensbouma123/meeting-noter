'use client';

import { Text, VStack } from '@jensbouma123/acciva-ui';
import type { SettingsStackedRowProps } from './types';

export function SettingsStackedRow({
  label,
  description,
  children,
}: SettingsStackedRowProps) {
  return (
    <VStack spacing="sm" className="w-full p-4">
      <VStack spacing="xs" className="min-w-0">
        <Text size="sm" weight="medium">
          {label}
        </Text>
        {description && (
          <Text size="xs" variant="muted">
            {description}
          </Text>
        )}
      </VStack>
      {children}
    </VStack>
  );
}

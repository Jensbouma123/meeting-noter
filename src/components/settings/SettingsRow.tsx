'use client';

import { Text, VStack } from '@jensbouma123/acciva-ui';
import type { SettingsRowProps } from './types';

export function SettingsRow({
  label,
  description,
  control,
  htmlFor,
}: SettingsRowProps) {
  return (
    <div className="flex w-full flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <VStack spacing="xs" className="min-w-0 flex-1">
        {htmlFor ? (
          <Text as="label" size="sm" weight="medium" {...({ htmlFor } as object)}>
            {label}
          </Text>
        ) : (
          <Text size="sm" weight="medium">
            {label}
          </Text>
        )}
        {description && (
          <Text size="xs" variant="muted">
            {description}
          </Text>
        )}
      </VStack>
      <div className="min-w-0 max-sm:w-full sm:shrink-0">{control}</div>
    </div>
  );
}

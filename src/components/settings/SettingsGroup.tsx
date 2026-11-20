'use client';

import { Card, VStack } from '@jensbouma123/acciva-ui';
import type { SettingsGroupProps } from './types';

export function SettingsGroup({ children }: SettingsGroupProps) {
  return (
    <Card variant="bordered" padding="none" className="w-full overflow-hidden">
      <VStack spacing="none" className="w-full divide-y divide-border-subtle">
        {children}
      </VStack>
    </Card>
  );
}

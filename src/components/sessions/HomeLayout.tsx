'use client';

import { HStack, VStack } from '@jensbouma123/acciva-ui';
import { SessionSidebar } from './SessionSidebar';
import { useRailOpenState } from './useRailOpenState';
import type { HomeLayoutProps } from './HomeLayout.types';

export function HomeLayout({
  activeSessionId,
  onOpenSession,
  onNewSession,
  children,
  sidebarOpen: controlledOpen,
  onSidebarToggle: controlledToggle,
}: HomeLayoutProps) {
  const { open, toggle } = useRailOpenState(controlledOpen, controlledToggle);

  return (
    <HStack as="div" spacing="none" align="stretch" className="h-dvh w-full max-w-full overflow-hidden bg-background text-foreground">
      <SessionSidebar
        activeSessionId={activeSessionId}
        onOpenSession={onOpenSession}
        onNewSession={onNewSession}
        open={open}
        onToggle={toggle}
      />
      <VStack as="main" spacing="none" fill className="min-w-0 overflow-hidden">
        {children}
      </VStack>
    </HStack>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { HStack, VStack } from '@jensbouma123/acciva-ui';
import { SessionSidebar } from './SessionList';

/* -------------------------------------------------------------------------- */
/* HomeLayout — session rail + main content, the app's only shell.            */
/* -------------------------------------------------------------------------- */

const RAIL_KEY = 'mn.sessionRailOpen';

export interface HomeLayoutProps {
  /** When truthy, show a meeting view (session open). Otherwise show homescreen. */
  activeSessionId?: string | null;
  /** Navigate to a specific session (empty string signals "new session" dialog). */
  onOpenSession: (sessionId: string) => void;
  /** Trigger the "create new session" dialog. */
  onNewSession: () => void;
  /** The main content rendered when a session is open. */
  children?: React.ReactNode;
  /** Optional controlled rail state; when absent the layout owns (and persists) it. */
  sidebarOpen?: boolean;
  /** Optional controlled toggle. */
  onSidebarToggle?: () => void;
}

export function HomeLayout({
  activeSessionId,
  onOpenSession,
  onNewSession,
  children,
  sidebarOpen: controlledOpen,
  onSidebarToggle: controlledToggle,
}: HomeLayoutProps) {
  const [ownOpen, setOwnOpen] = useState(true);

  // Hydrate the persisted rail state after mount (never during render).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(RAIL_KEY) === 'false') {
        /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration */
        setOwnOpen(false);
      }
    } catch { /* storage unavailable */ }
  }, []);

  const sidebarOpen = controlledOpen ?? ownOpen;
  const onSidebarToggle =
    controlledToggle ??
    (() => {
      const next = !ownOpen;
      setOwnOpen(next);
      try { window.localStorage.setItem(RAIL_KEY, String(next)); } catch { /* ignore */ }
    });

  return (
    <HStack
      as="div"
      spacing="none"
      align="stretch"
      className="h-dvh w-full max-w-full overflow-hidden bg-background text-foreground"
    >
      {/* Left rail — session list (a Drawer below lg, a docked aside above) */}
      <SessionSidebar
        activeSessionId={activeSessionId}
        onOpenSession={onOpenSession}
        onNewSession={onNewSession}
        open={sidebarOpen}
        onToggle={onSidebarToggle}
      />

      {/* Main content area */}
      <VStack
        as="main"
        spacing="none"
        fill
        className="min-w-0 overflow-hidden"
      >
        {children}
      </VStack>
    </HStack>
  );
}

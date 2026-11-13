import type { ReactNode } from 'react';

export interface HomeLayoutProps {
  activeSessionId?: string | null;
  onOpenSession: (sessionId: string) => void;
  onNewSession: (folderId?: string) => void;
  children?: ReactNode;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

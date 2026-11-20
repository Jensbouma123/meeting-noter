import type { ReactNode } from 'react';

export interface AskAssistantMenuLayoutProps {
  twoColumn: boolean;
  assistantHeading: string;
  promptHeading: string;
  assistantSlot: ReactNode;
  promptSlot: ReactNode;
}

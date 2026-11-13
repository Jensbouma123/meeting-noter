import type React from 'react';
import type { useSpeakerStats } from '@/lib/meeting';
import type { Segment } from '@/lib/meeting/types';

export type SpeakerRow = ReturnType<typeof useSpeakerStats>[number];

export type RailTab = 'participants' | 'summary';

export interface RightRailProps {
  sessionId: string;
  segments?: Segment[];
}

export interface SpeakerListProps {
  rows: SpeakerRow[];
  sessionId: string;
  onAssigned: (added: number) => void;
}

export interface RailTabsProps {
  active: RailTab;
  onChange: (tab: RailTab) => void;
  count: number;
  trailing?: React.ReactNode;
}

export interface RailPeopleSectionProps {
  sessionId: string;
  rows: SpeakerRow[];
  onAssigned: (added: number) => void;
}

export interface RailTabPanelProps {
  sessionId: string;
  activeTab: RailTab;
  rows: SpeakerRow[];
  segments: Segment[];
  className: string;
  onAssigned: (added: number) => void;
}

export interface RailCollapsedProps {
  speakerCount: number;
  onExpand: () => void;
}

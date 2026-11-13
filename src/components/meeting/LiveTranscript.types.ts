import type { RefObject } from 'react';
import type { VirtualListHandle } from '@jensbouma123/acciva-ui';
import type { Segment, Speaker, Status, SystemVia } from '@/lib/meeting';
import type { SettingsSectionId } from '@/components/settings/types';
import type { ModelReadiness } from './modelReadiness.types';
import type { getSpeakerColor } from './speaker-theme';

export interface LiveTranscriptProps {
  sessionId?: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  status: Status;
  autoScrollEnabled: boolean;
  systemVia?: SystemVia;
  onStartRecording: () => void;
  modelReady: boolean;
  modelReadiness?: ModelReadiness;
  onOpenSettings: (section?: SettingsSectionId) => void;
}

export interface TranscriptLine {
  kind: 'line';
  seg: Segment;
  turnStart: boolean;
}

export interface TranscriptOverlap {
  kind: 'overlap';
  id: string;
  start: number;
  columns: { speaker: string; segs: Segment[] }[];
}

export type TranscriptItem = TranscriptLine | TranscriptOverlap;

export type SpeakerColor = ReturnType<typeof getSpeakerColor>;

export interface SpeakerStyle {
  label: string;
  colorIndex: number;
  color: SpeakerColor;
}

export interface TranscriptRowBaseProps {
  index: number;
  isLast: boolean;
  rowClass: string;
  sessionId?: string;
  speakers: Record<string, Speaker>;
}

export interface TranscriptLineRowProps extends TranscriptRowBaseProps {
  item: TranscriptLine;
}

export interface TranscriptOverlapRowProps extends TranscriptRowBaseProps {
  item: TranscriptOverlap;
}

export interface TranscriptEmptyStateProps {
  modelReady: boolean;
  modelReadiness?: LiveTranscriptProps['modelReadiness'];
  onStartRecording: () => void;
  onOpenSettings: LiveTranscriptProps['onOpenSettings'];
}

export interface UseLiveEdgeOptions {
  listRef: RefObject<VirtualListHandle | null>;
  showList: boolean;
  autoScrollEnabled: boolean;
  segments: Segment[];
  status: Status;
}

export interface UseTranscriptSearchJumpOptions {
  listRef: RefObject<VirtualListHandle | null>;
  getScrollElement: () => HTMLElement | null;
  lines: TranscriptItem[];
  segments: Segment[];
}

import type { RefObject } from 'react';
import type { Segment } from '@/lib/meeting';

export interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PickedSelection {
  heard: string;
  rect: Box;
  bounds: Box;
}

export interface ToolbarPlacement {
  top: number;
  left: number;
  side: 'above' | 'below';
  arrowX: number;
}

export interface FixWordActionProps {
  containerRef: RefObject<HTMLElement | null>;
  segments: readonly Segment[];
  onFix: (heard: string, word: string) => void;
}

export interface FixWordToolbarProps {
  barRef: RefObject<HTMLDivElement | null>;
  placement: ToolbarPlacement | null;
  onOpen: () => void;
}

export interface FixWordDialogProps {
  heard: string | null;
  draft: string;
  onDraftChange: (draft: string) => void;
  onClose: () => void;
  onSave: () => void;
}

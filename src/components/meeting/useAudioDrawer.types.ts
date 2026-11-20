import type { RefObject, TransitionEvent } from 'react';

export type AudioDrawerPhase = 'closed' | 'open' | 'closing';

export interface AudioDrawerState {
  id: string;
  phase: AudioDrawerPhase;
  open: boolean;
  toggle: () => void;
  close: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onTransitionEnd: (e: TransitionEvent<HTMLElement>) => void;
}

import type { AudioDrawerState } from './useAudioDrawer.types';

export interface InputControlsProps {
  drawer: AudioDrawerState;
  isLive: boolean;
  showCallAudioMissing: boolean;
  callAudioMissingReason: string;
  onOpenAdvanced: () => void;
}

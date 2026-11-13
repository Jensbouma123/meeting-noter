import type { TargetPrompt } from '../types';

export interface RecordingPromptsProps {
  initialSessionId?: string;
  ownerName: string;
  showParticipants: boolean;
  targetPrompt: TargetPrompt | null;
  onParticipantsAnswered: () => void;
  onCancelTarget: () => void;
  onAppend: () => void;
  onStartNew: () => void;
}

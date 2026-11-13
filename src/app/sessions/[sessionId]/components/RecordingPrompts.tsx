import { ParticipantsDialog } from '@/components/meeting/ParticipantsDialog';
import { RecordTargetDialog } from '@/components/meeting/RecordTargetDialog';
import { getParticipants, setParticipants, skipParticipants } from '@/lib/meeting/participants';
import type { RecordingPromptsProps } from './RecordingPrompts.types';

export function RecordingPrompts(props: RecordingPromptsProps) {
  const { initialSessionId, ownerName, showParticipants, targetPrompt } = props;
  const { onParticipantsAnswered, onCancelTarget, onAppend, onStartNew } = props;
  return (
    <>
      {showParticipants && initialSessionId && (
        <ParticipantsDialog
          ownerName={ownerName}
          initial={getParticipants(initialSessionId)}
          onSkip={() => {
            skipParticipants(initialSessionId);
            onParticipantsAnswered();
          }}
          onStart={(names) => {
            setParticipants(initialSessionId, names);
            onParticipantsAnswered();
          }}
        />
      )}
      {targetPrompt && (
        <RecordTargetDialog
          open
          {...targetPrompt}
          onCancel={onCancelTarget}
          onAppend={onAppend}
          onStartNew={onStartNew}
        />
      )}
    </>
  );
}

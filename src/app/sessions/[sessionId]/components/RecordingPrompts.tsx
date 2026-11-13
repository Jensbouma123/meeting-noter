import { ParticipantsDialog } from '@/components/meeting/ParticipantsDialog';
import { RecordTargetDialog } from '@/components/meeting/RecordTargetDialog';
import { rememberRosterNames } from '@/lib/folders/roster-save';
import { getParticipants, setParticipants, skipParticipants } from '@/lib/meeting/participants';
import { useSessionFolderRoster } from '../hooks/useSessionFolderRoster';
import type { RecordingPromptsProps } from './RecordingPrompts.types';

export function RecordingPrompts(props: RecordingPromptsProps) {
  const { initialSessionId, ownerName, showParticipants, targetPrompt } = props;
  const { onParticipantsAnswered, onCancelTarget, onAppend, onStartNew } = props;
  const { folders, folderId, folderName, roster } = useSessionFolderRoster(initialSessionId);
  return (
    <>
      {showParticipants && initialSessionId && (
        <ParticipantsDialog
          ownerName={ownerName}
          initial={getParticipants(initialSessionId)}
          roster={roster}
          folderName={folderName}
          onSkip={() => {
            skipParticipants(initialSessionId);
            onParticipantsAnswered();
          }}
          onStart={(names, rememberForFolder) => {
            setParticipants(initialSessionId, names);
            if (rememberForFolder) void rememberRosterNames(folders, folderId, names);
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

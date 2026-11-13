import { HStack, VStack } from '@jensbouma123/acciva-ui';
import { LiveTranscript, BottomDock, RightRail } from '@/components/meeting';
import { CaptureDiagnostics } from '@/components/meeting/CaptureDiagnostics';
import type { MeetingWorkspaceProps } from './MeetingWorkspace.types';

export function MeetingWorkspace(props: MeetingWorkspaceProps) {
  const { sessionId, segments, speakers, status, settings, modelReady, modelReadiness, modelProgress } = props;
  const { onStart, onStop, onPause, onResume, onOpenSettings, onModeChange, onSettingsChange } = props;
  return (
    <HStack as="div" spacing="none" align="stretch" fill className="w-full max-w-full overflow-hidden">
      <VStack spacing="none" fill className="relative min-w-0 w-full max-w-full overflow-hidden">
        <LiveTranscript
          sessionId={sessionId}
          segments={segments}
          speakers={speakers}
          status={status}
          autoScrollEnabled={settings.autoScroll}
          systemVia={settings.systemVia}
          onStartRecording={onStart}
          modelReady={modelReady}
          modelReadiness={modelReadiness}
          onOpenSettings={onOpenSettings}
        />
        <BottomDock
          status={status}
          mode={settings.mode}
          modelReadiness={modelReadiness}
          modelProgress={modelProgress}
          onModeChange={onModeChange}
          onStart={onStart}
          onStop={onStop}
          onPause={onPause}
          onResume={onResume}
          onOpenAdvanced={() => onOpenSettings('advanced')}
          micDeviceId={settings.micDeviceId}
          onMicDeviceChange={(micDeviceId) => onSettingsChange({ ...settings, micDeviceId })}
        />
        <CaptureDiagnostics />
      </VStack>
      <RightRail sessionId={sessionId} segments={segments} />
    </HStack>
  );
}

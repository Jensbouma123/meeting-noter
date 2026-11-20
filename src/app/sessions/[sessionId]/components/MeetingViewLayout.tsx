import { VStack } from '@jensbouma123/acciva-ui';
import { TopBar } from '@/components/meeting';
import { ModelRegistryProvider } from '@/components/models';
import { MeetingBanners } from './MeetingBanners';
import { MeetingDialogs } from './MeetingDialogs';
import { MeetingWorkspace } from './MeetingWorkspace';
import type { MeetingViewLayoutProps } from './MeetingViewLayout.types';

export function MeetingViewLayout({ state }: MeetingViewLayoutProps) {
  return (
    <ModelRegistryProvider>
      <VStack spacing="none" fill className="h-full w-full max-w-full overflow-hidden bg-background text-foreground">
        <TopBar
          title={state.title}
          onTitleChange={state.changeTitle}
          status={state.status}
          startedAt={state.startedAt}
          stats={state.stats}
          language={state.language}
          languageAuto={state.effectiveLang === 'auto'}
          selectedLang={state.effectiveLang}
          onPickLanguage={state.pickLanguage}
          onOpenSettings={state.openSettings}
          modelReadiness={state.modelReadiness}
          modelProgress={state.modelProgress}
          onClearTranscript={state.initialSessionId ? state.clearTranscript : undefined}
          clearDisabled={state.status !== 'idle' && state.status !== 'error'}
          onOpenShare={() => state.setShareOpen(true)}
          updateAvailable={state.updateAvailable}
          modelFailed={state.modelReadiness === 'failed'}
        />
        <MeetingBanners
          banner={state.banner}
          asrProblem={state.asrProblem}
          asrPostStop={state.asrPostStop}
          asrPhase={state.asrPhase}
          postStop={state.postStop}
          postStopDetail={state.postStopDetail}
          onOpenSettings={state.openSettings}
        />
        <MeetingWorkspace
          sessionId={state.shareSessionId}
          title={state.title}
          startedAt={state.startedAt}
          segments={state.segments}
          speakers={state.speakers}
          status={state.status}
          settings={state.settings}
          modelReady={state.modelReady}
          modelReadiness={state.modelReadiness}
          modelProgress={state.modelProgress}
          onStart={state.startRecording}
          onStop={state.stopRecording}
          onPause={state.pauseRecording}
          onResume={state.resumeRecording}
          onOpenSettings={state.openSettings}
          onModeChange={state.changeMode}
          onSettingsChange={state.changeSettings}
        />
        <MeetingDialogs
          title={state.title}
          segments={state.segments}
          speakers={state.speakers}
          settings={state.settings}
          onSettingsChange={state.changeSettings}
          settingsOpen={state.settingsOpen}
          settingsSection={state.settingsSection}
          onCloseSettings={() => state.setSettingsOpen(false)}
          shareOpen={state.shareOpen}
          onCloseShare={() => state.setShareOpen(false)}
          helpOpen={state.helpOpen}
          onCloseHelp={() => state.setHelpOpen(false)}
          prompts={{
            initialSessionId: state.initialSessionId,
            ownerName: state.settings.ownerName,
            showParticipants: state.participantsPrompt,
            targetPrompt: state.targetPrompt,
            onParticipantsAnswered: state.answerParticipants,
            onCancelTarget: () => state.setTargetPrompt(null),
            onAppend: () => void state.startInSession('append'),
            onStartNew: () => void state.startInSession('new'),
          }}
        />
      </VStack>
    </ModelRegistryProvider>
  );
}

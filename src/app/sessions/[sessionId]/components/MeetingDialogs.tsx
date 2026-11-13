import { SettingsSheet as MeetingSettings } from '@/components/meeting';
import { ShortcutsHelp } from '@/components/meeting/ShortcutsHelp';
import { OnboardingDialog } from '@/components/onboarding/OnboardingDialog';
import { ShareDialog } from '@/components/share/ShareDialog';
import { RecordingPrompts } from './RecordingPrompts';
import type { MeetingDialogsProps } from './MeetingDialogs.types';

export function MeetingDialogs(props: MeetingDialogsProps) {
  const { title, segments, speakers, settings, onSettingsChange, prompts } = props;
  return (
    <>
      <OnboardingDialog settings={settings} onSettingsChange={onSettingsChange} />
      <MeetingSettings
        open={props.settingsOpen}
        onClose={props.onCloseSettings}
        settings={settings}
        onSettingsChange={onSettingsChange}
        section={props.settingsSection}
      />
      <RecordingPrompts {...prompts} />
      <ShareDialog
        open={props.shareOpen}
        onClose={props.onCloseShare}
        title={title}
        segments={segments}
        speakers={speakers}
      />
      <ShortcutsHelp open={props.helpOpen} onClose={props.onCloseHelp} />
    </>
  );
}

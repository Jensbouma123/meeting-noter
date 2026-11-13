import { promptBrowserASRDownload } from '@/lib/meeting';
import { AsrProblemBanner } from './AsrProblemBanner';
import { OtherRecordingBanner } from './OtherRecordingBanner';
import { PostStopBanner } from './PostStopBanner';
import type { MeetingBannersProps } from './MeetingBanners.types';

export function MeetingBanners({
  banner,
  asrProblem,
  asrPostStop,
  asrPhase,
  postStop,
  postStopDetail,
  onOpenSettings,
}: MeetingBannersProps) {
  if (banner === 'other') return <OtherRecordingBanner />;
  if (banner === 'problem' && asrProblem) {
    return (
      <AsrProblemBanner
        problem={asrProblem}
        asrPhase={asrPhase}
        onDownloadModel={promptBrowserASRDownload}
        onOpenSettings={onOpenSettings}
      />
    );
  }
  if (banner === 'postStop') {
    return <PostStopBanner message={asrPostStop} postStop={postStop} detail={postStopDetail} />;
  }
  return null;
}

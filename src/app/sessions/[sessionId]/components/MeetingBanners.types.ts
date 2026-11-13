import type { BrowserASRPhase } from '@/lib/asr/browser/types';
import type { SettingsSectionId } from '@/components/settings/sections';
import type { BannerKind, PostStopProgress } from '../types';

export interface MeetingBannersProps {
  banner: BannerKind;
  asrProblem: string | null;
  asrPostStop: string | null;
  asrPhase: BrowserASRPhase;
  postStop: PostStopProgress;
  postStopDetail: string | null;
  onOpenSettings: (section?: SettingsSectionId) => void;
}

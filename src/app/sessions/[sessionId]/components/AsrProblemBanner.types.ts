import type { BrowserASRPhase } from '@/lib/asr/browser/types';
import type { SettingsSectionId } from '@/components/settings/types';

export interface AsrProblemBannerProps {
  problem: string;
  asrPhase: BrowserASRPhase;
  onDownloadModel: () => void;
  onOpenSettings: (section: SettingsSectionId) => void;
}

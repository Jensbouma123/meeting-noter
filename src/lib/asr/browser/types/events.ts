import type { BrowserASRLoadProgress } from './load-progress';
import type { BrowserLanguageInfo } from './language';
import type { BrowserSegment } from './segment';
import type { BrowserASRStatus } from './status';

export interface BrowserASREvents {
  onSegment(seg: BrowserSegment): void;
  onLanguage(lang: BrowserLanguageInfo): void;
  onStatusChange(status: BrowserASRStatus): void;
  onError(message: string): void;
  onLoadProgress?(progress: BrowserASRLoadProgress): void;
}

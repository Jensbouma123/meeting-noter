import type { Source } from './basics';
import type { FrameHandler, SourceNodes } from './capture';

export interface AttachHost {
  handler: FrameHandler;
  sources: Map<Source, SourceNodes>;
  watchShare(rms: number): void;
  watchMic(rms: number): void;
  setWarning(warning: string): void;
}

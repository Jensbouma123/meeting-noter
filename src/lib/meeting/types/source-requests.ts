import type { HelperSource } from '../helper-source';
import type { SystemInput } from './capture';

export interface SourceRequests {
  micP: Promise<MediaStream | HelperSource> | null;
  systemP: Promise<SystemInput> | null;
}

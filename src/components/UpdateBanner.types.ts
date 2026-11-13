import type { UpdateInfo } from './update/types';

export interface BannerState {
  info: UpdateInfo | null;
  preview: boolean;
  dismiss: (version: string) => void;
}

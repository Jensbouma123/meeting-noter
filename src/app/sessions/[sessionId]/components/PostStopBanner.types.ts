import type { PostStopProgress } from '../types';

export interface PostStopBannerProps {
  message: string | null;
  postStop: PostStopProgress;
  detail: string | null;
}

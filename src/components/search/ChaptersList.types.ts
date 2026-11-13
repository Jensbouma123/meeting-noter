import type { Chapter } from '@/lib/semantic-search/types';

export interface ChaptersListProps {
  chapters: Chapter[];
  onSeek: (seconds: number) => void;
}

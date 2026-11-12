'use client';

import { EmptyState, Text, VStack } from '@jensbouma123/acciva-ui';
import { formatClock } from '@/lib/meeting/export';
import { useT } from '@/lib/i18n/useT';
import type { Chapter } from '@/lib/semantic-search';

export interface ChaptersListProps {
  /** Chapters of one meeting, e.g. `index.chapters(meetingId)`. */
  chapters: Chapter[];
  /** Called with the chapter start in seconds when a chapter is clicked. */
  onSeek: (seconds: number) => void;
}

/** Topic chapters of one meeting. Clicking a chapter seeks to its start. */
export function ChaptersList({ chapters, onSeek }: ChaptersListProps) {
  const t = useT('search');
  if (chapters.length === 0) {
    return (
      <EmptyState
        title={t('noChapters')}
        description={t('noChaptersHint')}
      />
    );
  }

  return (
    <ol aria-label={t('chaptersLabel')} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {chapters.map((chapter) => (
        <li key={chapter.index} style={{ marginBottom: 4 }}>
          <button
            type="button"
            onClick={() => onSeek(chapter.start)}
            aria-label={t('chapterLabel')
              .replace('{n}', String(chapter.index + 1))
              .replace('{title}', chapter.title)
              .replace('{time}', formatClock(chapter.start))}
            className="focus-ring"
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 0,
              padding: '8px 4px',
              cursor: 'pointer',
              color: 'inherit',
              font: 'inherit',
            }}
          >
            <VStack spacing="none">
              <Text size="sm" variant="muted">
                {formatClock(chapter.start)} – {formatClock(chapter.end)}
              </Text>
              <Text weight="semibold">{chapter.title}</Text>
            </VStack>
          </button>
        </li>
      ))}
    </ol>
  );
}

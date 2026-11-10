'use client';

import { EmptyState, Text, VStack } from '@jensbouma123/acciva-ui';
import { formatClock } from '@/lib/meeting/export';
import type { Chapter } from '@/lib/semantic-search';

export interface ChaptersListProps {
  /** Chapters of one meeting, e.g. `index.chapters(meetingId)`. */
  chapters: Chapter[];
  /** Called with the chapter start in seconds when a chapter is clicked. */
  onSeek: (seconds: number) => void;
}

/** Topic chapters of one meeting. Clicking a chapter seeks to its start. */
export function ChaptersList({ chapters, onSeek }: ChaptersListProps) {
  if (chapters.length === 0) {
    return (
      <EmptyState
        title="No chapters"
        description="Chapters appear once the meeting is long enough to split by topic."
      />
    );
  }

  return (
    <ol aria-label="Chapters" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {chapters.map((chapter) => (
        <li key={chapter.index} style={{ marginBottom: 4 }}>
          <button
            type="button"
            onClick={() => onSeek(chapter.start)}
            aria-label={`Chapter ${chapter.index + 1}: ${chapter.title}, starts at ${formatClock(chapter.start)}`}
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

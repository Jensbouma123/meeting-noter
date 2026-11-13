// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ChaptersList } from './ChaptersList';
import { chapter } from './fixtures';

afterEach(cleanup);

describe('ChaptersList', () => {
  it('renders chapters with time ranges and seeks on click', () => {
    const onSeek = vi.fn();
    render(
      <ChaptersList
        chapters={[chapter(0, 0, 120, 'budget · hiring'), chapter(1, 120, 300, 'launch')]}
        onSeek={onSeek}
      />,
    );

    expect(screen.getByText('00:00 – 02:00')).toBeInTheDocument();
    expect(screen.getByText('launch')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Chapter 2: launch/ }));
    expect(onSeek).toHaveBeenCalledWith(120);
  });

  it('shows an empty state with no chapters', () => {
    render(<ChaptersList chapters={[]} onSeek={() => {}} />);
    expect(screen.getByText('No chapters')).toBeInTheDocument();
  });
});

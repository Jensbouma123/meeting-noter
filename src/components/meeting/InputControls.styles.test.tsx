// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { renderDock } from './BottomDock.testUtils';
import { ROUND, SEGMENT, SEGMENT_TRACK } from './bottomDockStyles';

afterEach(cleanup);

describe('mode segmented control styling', () => {
  it('track shares the Record button height and full radius', () => {
    renderDock('both');
    const record = screen.getByRole('button', { name: /record|opnemen/i });
    const track = screen.getAllByRole('radio')[0].parentElement?.parentElement?.parentElement as HTMLElement;
    expect(record.className).toContain('h-10');
    expect(record.className).toContain(ROUND);
    expect(track.className).toContain('[&>div]:h-10');
    expect(SEGMENT_TRACK).toContain('[&>div]:!rounded-full');
    expect(track.className).toContain(SEGMENT_TRACK);
  });

  it('segments fit inside the track and are fully rounded', () => {
    renderDock('both');
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.className).toContain('!h-8');
      expect(radio.className).toContain('!rounded-full');
      expect(radio.className).toContain(SEGMENT);
    }
  });
});

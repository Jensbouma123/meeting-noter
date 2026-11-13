// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Segment } from '@/lib/meeting';
import { LiveTranscript } from './LiveTranscript';
import { SCROLL_HEIGHT, resize, rowAt, scroller, stubVirtualListEnvironment } from './LiveTranscript.virtualList.testUtils';
import { seg, speakers, view } from './LiveTranscript.testUtils';

afterEach(cleanup);

describe('LiveTranscript virtualised list', () => {
  stubVirtualListEnvironment();

  const twoTurns = (text = 'first') => [
    seg('a', 'mic:0', 0, text),
    seg('b', 'mic:1', 10, 'second'),
  ];

  it('keeps rows from overlapping when a live partial grows', () => {
    const { container, rerender } = render(view(twoTurns()));
    const offset = () => rowAt(container, 1).style.transform;

    resize(rowAt(container, 0), 120);
    expect(offset()).toBe('translateY(120px)');

    rerender(view(twoTurns('word '.repeat(80))));
    resize(rowAt(container, 0), 300);
    expect(offset()).toBe('translateY(300px)');

    resize(rowAt(container, 0), 180);
    expect(offset()).toBe('translateY(180px)');
  });

  it('follows the bottom while live, stops when the user scrolls up, and jumps back', () => {
    const live = (segments: Segment[]) => (
      <LiveTranscript
        segments={segments}
        speakers={speakers}
        status="live"
        autoScrollEnabled
        onStartRecording={() => {}}
        modelReady
        onOpenSettings={() => {}}
      />
    );
    const { container, rerender } = render(live(twoTurns()));
    const el = scroller(container);
    expect(el.scrollTop).toBe(SCROLL_HEIGHT);
    expect(screen.queryByText('Jump to latest')).toBeNull();

    act(() => {
      el.scrollTop = 100;
      el.dispatchEvent(new Event('scroll'));
    });
    rerender(live([...twoTurns(), seg('c', 'mic:0', 20)]));
    expect(el.scrollTop).toBe(100);
    expect(screen.getByText('Jump to latest')).toBeTruthy();

    fireEvent.click(screen.getByText('Jump to latest'));
    expect(el.scrollTop).toBe(SCROLL_HEIGHT);
    expect(screen.queryByText('Jump to latest')).toBeNull();
    el.scrollTop = 0;
    const spacer = el.firstElementChild!;
    resize(spacer, 9000);
    expect(el.scrollTop).toBe(SCROLL_HEIGHT);
  });

  it('does not stick to the end on resize once auto-scroll is switched off', () => {
    const live = (enabled: boolean) => (
      <LiveTranscript
        segments={twoTurns()}
        speakers={speakers}
        status="live"
        autoScrollEnabled={enabled}
        onStartRecording={() => {}}
        modelReady
        onOpenSettings={() => {}}
      />
    );
    const { container, rerender } = render(live(true));
    const el = scroller(container);
    rerender(live(false));
    el.scrollTop = 0;
    resize(el.firstElementChild!, 9000);
    expect(el.scrollTop).toBe(0);
  });
});

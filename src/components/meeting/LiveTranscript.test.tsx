import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Segment, Speaker } from '@/lib/meeting';
import { LiveTranscript } from './LiveTranscript';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

const speakers: Record<string, Speaker> = {
  'mic:0': { id: 'mic:0', source: 'mic', label: 'Speaker 1', colorIndex: 0 },
  'mic:1': { id: 'mic:1', source: 'mic', label: 'Speaker 2', colorIndex: 1 },
};

const seg = (id: string, speaker: string, start: number, text = id): Segment => ({
  id,
  source: 'mic',
  speaker,
  text,
  start,
  end: start + 2,
  final: true,
});

function view(segments: Segment[]) {
  return (
    <LiveTranscript
      segments={segments}
      speakers={speakers}
      status="live"
      autoScrollEnabled={false}
      onStartRecording={() => {}}
      modelReady
      onOpenSettings={() => {}}
    />
  );
}

/** Each turn as [speaker, [timestamp, line id]...], in document order: a turn
 *  runs from a row that opens one (and names its speaker) to the next. */
function timeline(container: HTMLElement): [string, string[][]][] {
  const turns: [string, string[][]][] = [];
  for (const line of container.querySelectorAll('[data-seg-id]')) {
    const row = line.parentElement!;
    if (row.hasAttribute('data-turn-start')) turns.push([speakerShown(row), []]);
    turns[turns.length - 1][1].push([row.children[0].textContent ?? '', line.getAttribute('data-seg-id') ?? '']);
  }
  return turns;
}

/** The speaker name a row shows, or '' when it is kept invisible. */
function speakerShown(row: Element): string {
  const name = row.children[1].querySelector('.truncate')!;
  return name.classList.contains('invisible') ? '' : (name.textContent ?? '');
}

const rowOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-seg-id="${id}"]`)!.parentElement!;

afterEach(cleanup);

describe('LiveTranscript timeline', () => {
  it('shows lines in time order with a timestamp on every line', () => {
    const { container } = render(
      view([seg('b', 'mic:0', 12), seg('a', 'mic:0', 3), seg('c', 'mic:0', 40), seg('d', 'mic:0', 65)]),
    );
    expect(timeline(container)).toEqual([
      ['Speaker 1', [['00:03', 'a'], ['00:12', 'b'], ['00:40', 'c'], ['01:05', 'd']]],
    ]);
  });

  it('shows the speaker once per turn and starts a turn on every speaker change', () => {
    const { container } = render(
      view([seg('a', 'mic:0', 0), seg('b', 'mic:0', 3), seg('c', 'mic:1', 6), seg('d', 'mic:0', 9)]),
    );
    expect(timeline(container)).toEqual([
      ['Speaker 1', [['00:00', 'a'], ['00:03', 'b']]],
      ['Speaker 2', [['00:06', 'c']]],
      ['Speaker 1', [['00:09', 'd']]],
    ]);
    expect([...container.querySelectorAll('[data-seg-id]')].map((l) => speakerShown(l.parentElement!))).toEqual([
      'Speaker 1',
      '',
      'Speaker 2',
      'Speaker 1',
    ]);
  });

  it('starts a new turn after a pause over 30 s from the same speaker', () => {
    const { container } = render(view([seg('a', 'mic:0', 0), seg('b', 'mic:0', 40)]));
    expect(timeline(container).map(([, lines]) => lines.map(([, id]) => id))).toEqual([['a'], ['b']]);
  });

  it('moves a line into the right turn when diarization reassigns it late', () => {
    const lines = [seg('a', 'mic:0', 0), seg('b', 'mic:0', 3), seg('c', 'mic:0', 6)];
    const { container, rerender } = render(view(lines));
    expect(timeline(container)).toHaveLength(1);

    rerender(view([lines[0], { ...lines[1], speaker: 'mic:1' }, { ...lines[2], speaker: 'mic:1' }]));
    expect(timeline(container)).toEqual([
      ['Speaker 1', [['00:00', 'a']]],
      ['Speaker 2', [['00:03', 'b'], ['00:06', 'c']]],
    ]);
  });

  it('shows hh:mm:ss past the first hour', () => {
    const { container } = render(view([seg('a', 'mic:0', 3725)]));
    expect(timeline(container)).toEqual([['Speaker 1', [['01:02:05', 'a']]]]);
  });

  it('relabels a line in place when diarization reassigns it: same row, same shape', () => {
    const lines = [seg('a', 'mic:0', 0), seg('b', 'mic:0', 3), seg('c', 'mic:0', 6)];
    const { container, rerender } = render(view(lines));
    const before = rowOf(container, 'c');
    expect(speakerShown(before)).toBe('');
    expect(before.getAttribute('data-speaker')).toBe('mic:0');
    const shape = (row: Element) => [row.children.length, row.className.replace(/\bbefore:\S+/g, '').trim()];
    const shapeBefore = shape(before);

    rerender(view([lines[0], lines[1], { ...lines[2], speaker: 'mic:1' }]));
    const after = rowOf(container, 'c');
    // The same element, now naming its speaker: nothing was inserted above it.
    expect(after).toBe(before);
    expect(after.getAttribute('data-speaker')).toBe('mic:1');
    expect(speakerShown(after)).toBe('Speaker 2');
    expect(shape(after)).toEqual(shapeBefore);
    expect(container.querySelectorAll('[data-index]')).toHaveLength(3);
    expect(after.closest('[data-index]')!.getAttribute('data-index')).toBe('2');
  });

  it('never size-contains lines, and shows the speaker in the line\'s own row', () => {
    const { container, rerender } = render(view([seg('a', 'mic:0', 3, 'hi')]));
    const css = readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/content-visibility|contain-intrinsic|contain:\s*(size|strict|content)/);
    const row = rowOf(container, 'a');
    const [time, speaker, line] = Array.from(row.children);
    expect(time.textContent).toBe('00:03');
    expect(speaker.textContent).toContain('Speaker 1');
    expect(line.getAttribute('data-seg-id')).toBe('a');
    // A line that grows after first render stays a plain flow row (no fixed height).
    rerender(view([seg('a', 'mic:0', 3, 'hi '.repeat(200))]));
    const grown = rowOf(container, 'a');
    expect(grown.getAttribute('style')).toBeNull();
    expect(grown.className).not.toMatch(/(^|\s)(h-|max-h-|absolute|translate)/);
    expect(container.querySelector('[data-seg-id]')!.textContent).toContain('hi hi hi');
  });
});

// ---- Virtualisation: growing rows, follow-bottom, search scroll ----

type ROCallback = (entries: { target: Element; borderBoxSize?: { blockSize: number }[] }[]) => void;
const observers: { cb: ROCallback; targets: Set<Element> }[] = [];

class FakeResizeObserver {
  private entry: { cb: ROCallback; targets: Set<Element> };
  constructor(cb: ROCallback) {
    this.entry = { cb, targets: new Set() };
    observers.push(this.entry);
  }
  observe(el: Element) {
    this.entry.targets.add(el);
  }
  unobserve(el: Element) {
    this.entry.targets.delete(el);
  }
  disconnect() {
    this.entry.targets.clear();
  }
}

/** Fire every observer watching `el`, as the browser does when its box changes. */
function resize(el: Element, blockSize: number) {
  act(() => {
    for (const o of observers) {
      if (o.targets.has(el)) o.cb([{ target: el, borderBoxSize: [{ blockSize }] }]);
    }
  });
}

const rowAt = (container: HTMLElement, index: number) =>
  container.querySelector<HTMLElement>(`[data-index="${index}"]`)!;
const scroller = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[aria-label="Meeting transcript"]')!;

describe('LiveTranscript virtualised list', () => {
  const scrollHeight = 5000;
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.stubGlobal('CSS', { escape: (s: string) => s });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 400 });
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => scrollHeight });
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error restore jsdom defaults
    delete HTMLElement.prototype.clientHeight;
    // @ts-expect-error restore jsdom defaults
    delete HTMLElement.prototype.scrollHeight;
  });

  const twoTurns = (text = 'first') => [
    seg('a', 'mic:0', 0, text),
    seg('b', 'mic:1', 10, 'second'),
  ];

  it('keeps rows from overlapping when a live partial grows', () => {
    const { container, rerender } = render(view(twoTurns()));
    const offset = () => rowAt(container, 1).style.transform;

    resize(rowAt(container, 0), 120);
    expect(offset()).toBe('translateY(120px)');

    // The partial wraps onto more lines: the next row moves down with it.
    rerender(view(twoTurns('word '.repeat(80))));
    resize(rowAt(container, 0), 300);
    expect(offset()).toBe('translateY(300px)');

    // A line splitting off into a new turn keeps ids stable and re-measures.
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
    expect(el.scrollTop).toBe(scrollHeight);
    expect(screen.queryByText('Jump to latest')).toBeNull();

    // User scrolls up: following stops and the pill appears.
    act(() => {
      el.scrollTop = 100;
      el.dispatchEvent(new Event('scroll'));
    });
    rerender(live([...twoTurns(), seg('c', 'mic:0', 20)]));
    expect(el.scrollTop).toBe(100);
    expect(screen.getByText('Jump to latest')).toBeTruthy();

    // Jump to latest re-attaches; the spacer growing then re-pins the end.
    fireEvent.click(screen.getByText('Jump to latest'));
    expect(el.scrollTop).toBe(scrollHeight);
    expect(screen.queryByText('Jump to latest')).toBeNull();
    el.scrollTop = 0;
    const spacer = el.firstElementChild!;
    resize(spacer, 9000);
    expect(el.scrollTop).toBe(scrollHeight);
  });

  it('scrolls an unmounted search match into the window', () => {
    const many = Array.from({ length: 200 }, (_, i) =>
      seg(`s${i}`, i % 2 ? 'mic:1' : 'mic:0', i * 40, i === 150 ? 'needle in here' : `line ${i}`),
    );
    const { container } = render(view(many));
    expect(container.querySelector('[data-seg-id="s150"]')).toBeNull();
    expect(container.querySelectorAll('[data-index]').length).toBeLessThan(40);

    act(() => {
      window.dispatchEvent(new Event('mn:search'));
    });
    fireEvent.change(screen.getByPlaceholderText('Search transcript…'), { target: { value: 'needle' } });

    const line = container.querySelector('[data-seg-id="s150"]');
    expect(line).not.toBeNull();
    expect(line!.closest('[data-index]')!.getAttribute('data-index')).toBe('150');
    expect(line!.classList.contains('mn-search-active-turn')).toBe(true);
  });

  it('focuses the search field when it opens', () => {
    render(view(twoTurns()));
    act(() => {
      window.dispatchEvent(new Event('mn:search'));
    });
    expect(document.activeElement).toBe(screen.getByPlaceholderText('Search transcript…'));
  });

  it('closing search removes the bar and clears the active match ring', () => {
    const many = Array.from({ length: 200 }, (_, i) =>
      seg(`s${i}`, i % 2 ? 'mic:1' : 'mic:0', i * 40, i === 150 ? 'needle in here' : `line ${i}`),
    );
    const { container } = render(view(many));
    act(() => {
      window.dispatchEvent(new Event('mn:search'));
    });
    fireEvent.change(screen.getByPlaceholderText('Search transcript…'), { target: { value: 'needle' } });
    expect(container.querySelector('.mn-search-active-turn')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByPlaceholderText('Search transcript…')).toBeNull();
    expect(container.querySelector('.mn-search-active-turn')).toBeNull();
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
    // Still at the live edge, but auto-scroll is now off: a resize must not re-pin.
    rerender(live(false));
    el.scrollTop = 0;
    resize(el.firstElementChild!, 9000);
    expect(el.scrollTop).toBe(0);
  });

  it('shows a placeholder for an unconfirmed line and the name once confirmed', () => {
    const { container, rerender } = render(view([{ ...seg('p', 'mic:1', 0), unconfirmed: true }]));
    const pending = container.querySelector('[data-speaker-pending]');
    expect(pending?.getAttribute('aria-label')).toBe('Checking who said this…');
    expect(container.textContent).not.toContain('Speaker 2');
    rerender(view([seg('p', 'mic:1', 0)]));
    expect(container.querySelector('[data-speaker-pending]')).toBeNull();
    expect(container.textContent).toContain('Speaker 2');
  });
});

describe('LiveTranscript overlapping speech', () => {
  const overlap = { start: 4, end: 6, speakers: ['mic:0', 'mic:1'] };
  const transcript = [
    seg('a', 'mic:0', 0, 'so I think'),
    { ...seg('b', 'mic:0', 4, 'we should'), overlap },
    { ...seg('c', 'mic:1', 4.5, 'no wait'), overlap },
    seg('d', 'mic:1', 7, 'hear me out'),
  ];

  /** Each overlap row's columns as [speaker shown, line ids]. */
  const columns = (row: Element) =>
    [...row.querySelectorAll('[data-overlap-speaker]')].map((col) => [
      col.querySelector('.truncate')!.textContent,
      [...col.querySelectorAll('[data-seg-id]')].map((l) => l.getAttribute('data-seg-id')),
    ]);

  it('shows the overlap as one row, a column per speaker, then rejoins one column', () => {
    const { container } = render(view(transcript));
    const rows = [...container.querySelectorAll('[data-index]')];
    expect(rows).toHaveLength(3);

    const split = rows[1].querySelector('[data-overlap]')!;
    expect(split.getAttribute('aria-label')).toBe('Speaking at the same time: Speaker 1 and Speaker 2');
    // One timestamp for the columns side by side.
    expect(split.children[0].textContent).toBe('00:04');
    expect(columns(split)).toEqual([
      ['Speaker 1', ['b']],
      ['Speaker 2', ['c']],
    ]);
    // The lines either side are ordinary single-column turns.
    for (const [id, name] of [['a', 'Speaker 1'], ['d', 'Speaker 2']]) {
      const row = rowOf(container, id);
      expect(row.hasAttribute('data-turn-start')).toBe(true);
      expect(speakerShown(row)).toBe(name);
    }
  });

  // One source is one speech-model stream: while two people in the same audio
  // talk at once each word still gets one speaker, so the second voice the
  // diarizer heard can own none of the words. It showed as a column of '…'.
  it('shows an overlap whose words are all one speaker\'s as that speaker\'s lines', () => {
    const { container } = render(view([
      seg('a', 'mic:0', 0, 'name,'),
      { ...seg('b', 'mic:0', 4, 'about the four'), overlap },
      seg('c', 'mic:0', 7, 'galaxy thing'),
    ]));
    expect(container.querySelector('[data-overlap]')).toBeNull();
    expect(container.textContent).not.toContain('…');
    expect(timeline(container)).toEqual([['Speaker 1', [['00:00', 'a'], ['00:04', 'b'], ['00:07', 'c']]]]);
  });

  it('leaves out the column of an overlapping speaker no words were caught of', () => {
    const three = { start: 4, end: 6, speakers: ['mic:0', 'mic:2', 'mic:1'] };
    const { container } = render(view([
      { ...seg('b', 'mic:0', 4, 'we should'), overlap: three },
      { ...seg('c', 'mic:1', 4.5, 'no wait'), overlap: three },
    ]));
    const split = container.querySelector('[data-overlap]')!;
    expect(columns(split)).toEqual([
      ['Speaker 1', ['b']],
      ['Speaker 2', ['c']],
    ]);
    expect(split.getAttribute('aria-label')).toBe('Speaking at the same time: Speaker 1 and Speaker 2');
    expect(container.textContent).not.toContain('…');
  });

  // The screenshot: each column drew its speaker-colour bar and, inside it,
  // the grey rule every line has.
  it('draws one bar per column: the speaker colour, not the line\'s grey rule too', () => {
    const { container } = render(view(transcript));
    for (const col of container.querySelectorAll('[data-overlap-speaker]')) {
      const bar = col.querySelector(':scope > span[aria-hidden="true"]')!;
      expect(bar.className).toContain('sm:block');
      const rule = col.querySelector('.turn-block > div')!;
      expect(rule.className).toContain('border-l-2');
      // Where the colour bar shows, the column takes the line's rule away.
      expect(col.className.split(' ')).toEqual(
        expect.arrayContaining(['sm:[&_.turn-block>div]:border-l-0', 'sm:[&_.turn-block>div]:pl-0']),
      );
    }
    // An ordinary line keeps its grey rule.
    expect(rowOf(container, 'a').querySelector('[data-overlap-speaker]')).toBeNull();
  });

  it('shows the mic and the call talking at once as one split row, a column each', () => {
    const call: Segment = { ...seg('s', 'system:0', 8.5, 'no wait hear me'), source: 'system' };
    const { container } = render(
      <LiveTranscript
        segments={[seg('a', 'mic:0', 0, 'so I think'), seg('m', 'mic:0', 8, 'we should ship'), call]}
        speakers={{ ...speakers, 'system:0': { id: 'system:0', source: 'system', label: 'Caller', colorIndex: 2 } }}
        status="live"
        autoScrollEnabled={false}
        onStartRecording={() => {}}
        modelReady
        onOpenSettings={() => {}}
      />,
    );
    const split = container.querySelector('[data-overlap]')!;
    expect(split.getAttribute('aria-label')).toBe('Speaking at the same time: Speaker 1 and Caller');
    expect(columns(split)).toEqual([
      ['Speaker 1', ['m']],
      ['Caller', ['s']],
    ]);
    expect(speakerShown(rowOf(container, 'a'))).toBe('Speaker 1');
  });

  it('stacks the columns under one bracket on a phone instead of scrolling sideways', () => {
    const { container } = render(view(transcript));
    const split = container.querySelector('[data-overlap]')!;
    const bracket = split.querySelector('[data-overlap-bracket]')!;
    expect(bracket.className).toContain('sm:hidden');
    const grid = split.querySelector('[data-overlap-speaker]')!.parentElement as HTMLElement;
    expect(grid.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'flex-col', 'sm:grid']));
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(split.innerHTML).not.toContain('overflow-x');
  });

  it('shows a session saved before overlaps as single-column rows', () => {
    const legacy = transcript.map((line) => {
      const rest = { ...line };
      delete rest.overlap;
      return rest;
    });
    const { container } = render(view(legacy));
    expect(container.querySelector('[data-overlap]')).toBeNull();
    expect(container.querySelectorAll('[data-index]')).toHaveLength(4);
  });
});

describe('LiveTranscript line actions', () => {
  beforeEach(() => localStorage.clear());

  const withSession = (segments: Segment[]) => (
    <LiveTranscript
      sessionId="s1"
      segments={segments}
      speakers={speakers}
      status="live"
      autoScrollEnabled={false}
      onStartRecording={() => {}}
      modelReady
      onOpenSettings={() => {}}
    />
  );

  it('creates an action item from a line, linked to its segment', async () => {
    const { getNotes } = await import('@/lib/meeting/notes');
    render(withSession([seg('a', 'mic:0', 0, 'Send the report')]));
    fireEvent.click(screen.getByRole('button', { name: 'Line actions' }));
    fireEvent.click(screen.getByText('Create action item'));
    expect(getNotes('s1').actions).toMatchObject([{ text: 'Send the report', sourceSegmentId: 'a', done: false }]);
  });

  it('marks a line as a decision, linked to its segment', async () => {
    const { getNotes } = await import('@/lib/meeting/notes');
    render(withSession([seg('a', 'mic:0', 0, 'We ship Friday')]));
    fireEvent.click(screen.getByRole('button', { name: 'Line actions' }));
    fireEvent.click(screen.getByText('Mark as decision'));
    expect(getNotes('s1').decisions).toMatchObject([{ text: 'We ship Friday', sourceSegmentId: 'a' }]);
  });

  it('offers no actions without a sessionId', () => {
    render(view([seg('a', 'mic:0', 0)]));
    expect(screen.queryByRole('button', { name: 'Line actions' })).toBeNull();
  });
});

describe('LiveTranscript empty states', () => {
  it('speaks Dutch with informal je when the language is nl', () => {
    render(
      <LanguageContext.Provider value="nl">
        <LiveTranscript
          segments={[]}
          speakers={speakers}
          status="idle"
          autoScrollEnabled={false}
          onStartRecording={() => {}}
          modelReady
          onOpenSettings={() => {}}
        />
      </LanguageContext.Provider>,
    );
    expect(screen.getByText('Klaar om op te nemen')).toBeTruthy();
  });

  it('speaks English by default', () => {
    render(
      <LiveTranscript
        segments={[]}
        speakers={speakers}
        status="idle"
        autoScrollEnabled={false}
        onStartRecording={() => {}}
        modelReady
        onOpenSettings={() => {}}
      />,
    );
    expect(screen.getByText('Ready to record')).toBeTruthy();
  });
});

describe('LiveTranscript ready state', () => {
  it('Record button starts recording', () => {
    const onStart = vi.fn();
    render(
      <LanguageContext.Provider value="en">
        <LiveTranscript
          segments={[]}
          speakers={speakers}
          status="idle"
          autoScrollEnabled={false}
          onStartRecording={onStart}
          modelReady
          onOpenSettings={() => {}}
        />
      </LanguageContext.Provider>,
    );
    const record = screen.getByRole('button', { name: /record/i });
    // Outline, like the other secondary actions (e.g. Share): never the solid primary fill.
    expect(record.classList.contains('bg-transparent')).toBe(true);
    expect(record.classList.contains('bg-primary-600')).toBe(false);
    fireEvent.click(record);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

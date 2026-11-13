// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Segment } from '@/lib/meeting';
import { LiveTranscript } from './LiveTranscript';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { seg, speakers, view } from './LiveTranscript.testUtils';

afterEach(cleanup);

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
    expect(record.classList.contains('bg-transparent')).toBe(true);
    expect(record.classList.contains('bg-primary-600')).toBe(false);
    fireEvent.click(record);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

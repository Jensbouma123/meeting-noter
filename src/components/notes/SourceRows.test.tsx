// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { REVEAL_EVENT } from '@/lib/meeting/seek-event';
import { ActionRow } from './ActionRow';
import { DecisionRow } from './DecisionRow';

afterEach(cleanup);

const t = (key: string) => key;

function capture() {
  const onReveal = vi.fn();
  window.addEventListener(REVEAL_EVENT, onReveal);
  return { onReveal, stop: () => window.removeEventListener(REVEAL_EVENT, onReveal) };
}

describe('decision and action rows with a source', () => {
  it('a decision reveals its source segment', () => {
    const { onReveal, stop } = capture();
    render(
      <ul>
        <DecisionRow item={{ id: 'd1', text: 'Ship Friday', sourceSegmentId: 's1' }} sessionId="m1" t={t} />
      </ul>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'showInTranscript: Ship Friday' }));
    stop();
    expect((onReveal.mock.calls[0][0] as CustomEvent<string>).detail).toBe('s1');
  });

  it('an action reveals its source segment', () => {
    const { onReveal, stop } = capture();
    render(
      <ul>
        <ActionRow
          item={{ id: 'a1', text: 'Send notes', done: false, sourceSegmentId: 's2' }}
          speakers={[]}
          sessionId="m1"
          t={t}
        />
      </ul>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'showInTranscript: Send notes' }));
    stop();
    expect((onReveal.mock.calls[0][0] as CustomEvent<string>).detail).toBe('s2');
  });

  it('items without a source are not reveal buttons', () => {
    const { onReveal, stop } = capture();
    render(
      <ul>
        <DecisionRow item={{ id: 'd1', text: 'Plain decision' }} sessionId="m1" t={t} />
        <ActionRow item={{ id: 'a1', text: 'Plain action', done: false }} speakers={[]} sessionId="m1" t={t} />
      </ul>,
    );
    expect(screen.queryByRole('button', { name: /showInTranscript/ })).toBeNull();
    fireEvent.click(screen.getByText('Plain decision'));
    fireEvent.click(screen.getByText('Plain action'));
    stop();
    expect(onReveal).not.toHaveBeenCalled();
  });
});

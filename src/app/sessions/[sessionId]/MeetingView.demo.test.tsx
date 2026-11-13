// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { h } from './MeetingView.demo.mocks';
import MeetingView from './MeetingView';

afterEach(() => {
  cleanup();
  h.start.mockClear();
  h.state.status = 'idle';
  window.history.replaceState(null, '', '/');
});

describe('MeetingView ?demo=1 auto-start', () => {
  it('starts the recording once, and not again when the recording state changes', async () => {
    window.history.replaceState(null, '', '/sessions/s1?demo=1');
    const { rerender } = render(<MeetingView initialSessionId="s1" />);
    await waitFor(() => expect(h.start).toHaveBeenCalledTimes(1));

    h.state.status = 'live';
    rerender(<MeetingView initialSessionId="s1" />);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(h.start).toHaveBeenCalledTimes(1);
  });

  it('does not start a recording without ?demo=1', async () => {
    window.history.replaceState(null, '', '/sessions/s1');
    render(<MeetingView initialSessionId="s1" />);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(h.start).not.toHaveBeenCalled();
  });
});

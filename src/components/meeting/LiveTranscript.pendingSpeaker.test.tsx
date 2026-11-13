// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { seg, view } from './LiveTranscript.testUtils';

afterEach(cleanup);

describe('LiveTranscript pending speaker', () => {
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

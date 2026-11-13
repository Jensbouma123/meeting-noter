// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { stubVirtualListEnvironment } from './LiveTranscript.virtualList.testUtils';
import { seg, view } from './LiveTranscript.testUtils';

afterEach(cleanup);

describe('LiveTranscript search', () => {
  stubVirtualListEnvironment();

  const twoTurns = () => [seg('a', 'mic:0', 0, 'first'), seg('b', 'mic:1', 10, 'second')];

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
});

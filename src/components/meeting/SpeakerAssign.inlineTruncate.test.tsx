// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSpeakerAssign } from './SpeakerAssign.testUtils';

vi.mock('@/lib/meeting/participants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/meeting/participants')>();
  return { ...actual, useParticipants: () => [] };
});

afterEach(cleanup);

describe('SpeakerAssign inline long name', () => {
  it('truncates on one line and can shrink inside its column', () => {
    renderSpeakerAssign('Raphael van Marion');
    const button = screen.getByTestId('speaker-assign');
    const name = button.querySelector('span.truncate') as HTMLElement;
    expect(name).toHaveTextContent('Raphael van Marion');
    expect(name).toHaveClass('truncate', 'min-w-0');
    expect(button).toHaveClass('min-w-0', 'max-w-full');
    expect(screen.getByTestId('speaker-assign-wrap')).toHaveClass('min-w-0', 'w-full');
  });

  it('puts the full name in the native title when it is cut off', () => {
    const proto = HTMLElement.prototype;
    const spy = vi.spyOn(proto, 'scrollWidth', 'get').mockReturnValue(200);
    vi.spyOn(proto, 'clientWidth', 'get').mockReturnValue(80);
    renderSpeakerAssign('Raphael van Marion');
    expect(screen.getByTestId('speaker-assign').querySelector('span.truncate')).toHaveAttribute('title', 'Raphael van Marion');
    spy.mockRestore();
  });
});

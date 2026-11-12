// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { SpeakerAssign } from './SpeakerAssign';

vi.mock('@/lib/meeting/participants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/meeting/participants')>();
  return { ...actual, useParticipants: () => ['Jens'], unassignedParticipants: () => [] };
});

afterEach(cleanup);

describe('SpeakerAssign rail name layout', () => {
  it('lets the name fill the row and has no tooltip when it fits', () => {
    render(
      <LanguageContext.Provider value="en">
        <SpeakerAssign sessionId="s1" speakerId="1" label="Jens" source="system" otherLabels={[]} appearance="rail" />
      </LanguageContext.Provider>,
    );
    const button = screen.getByRole('button', { name: 'Change who this is: Jens' });
    expect(button).toHaveClass('flex-1', 'min-w-0', 'w-full');
    expect(button).not.toHaveAttribute('title');
    expect(button.querySelector('span')).toHaveClass('flex-1', 'min-w-0');
  });

  it('overrides the DropdownMenu wrapper (inline-block) so the button can grow', () => {
    render(
      <LanguageContext.Provider value="en">
        <SpeakerAssign sessionId="s1" speakerId="1" label="Jens" source="system" otherLabels={[]} appearance="rail" />
      </LanguageContext.Provider>,
    );
    const button = screen.getByRole('button', { name: 'Change who this is: Jens' });
    const menuRoot = button.parentElement as HTMLElement;
    expect(menuRoot).toHaveClass('inline-block'); // acciva-ui's shrink-to-fit wrapper
    const wrap = screen.getByTestId('speaker-assign-wrap');
    expect(menuRoot.parentElement).toBe(wrap);
    expect(wrap).toHaveClass('w-full', 'min-w-0', '[&>div]:block', '[&>div]:w-full');
    expect(button.querySelector('span')).toHaveClass('truncate');
  });
});

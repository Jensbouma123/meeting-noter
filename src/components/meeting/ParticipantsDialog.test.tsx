// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ParticipantsDialog } from './ParticipantsDialog';
import { setParticipants } from '@/lib/meeting/participants';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

function show(over: Partial<React.ComponentProps<typeof ParticipantsDialog>> = {}) {
  const onSkip = vi.fn();
  const onStart = vi.fn();
  render(
    <LanguageContext.Provider value="en">
      <ParticipantsDialog ownerName="Jens" initial={[]} onSkip={onSkip} onStart={onStart} {...over} />
    </LanguageContext.Provider>,
  );
  return { onSkip, onStart };
}
const box = (n: string) => screen.getByRole('checkbox', { name: n });
const search = () => screen.getByLabelText('Search people') as HTMLInputElement;
const seed = () => setParticipants('old', ['Anna', 'Piet', 'Sam', 'Els', 'Bram']);

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ||= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ||= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
});
beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('ParticipantsDialog', () => {
  it('lists known people with the owner checked', () => {
    show();
    expect(screen.getByText('Who is in this meeting?')).toBeInTheDocument();
    expect(box('Jens')).toBeChecked();
  });

  it('Skip starts immediately without saving names', () => {
    const { onSkip, onStart } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('checking and unchecking people drives the started names', () => {
    setParticipants('old', ['Marieke']);
    const { onStart } = show();
    fireEvent.click(box('Marieke'));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith(['Jens', 'Marieke']);
    cleanup();
    const second = show();
    fireEvent.click(box('Jens'));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(second.onStart).toHaveBeenCalledWith([]);
  });

  it('hides search at 5 people and shows it above 5', () => {
    setParticipants('old', ['Anna', 'Piet', 'Sam', 'Els']);
    show();
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    expect(screen.queryByLabelText('Search people')).toBeNull();
    cleanup();
    seed();
    show();
    expect(screen.getAllByRole('checkbox')).toHaveLength(6);
    expect(search()).toBeInTheDocument();
  });

  it('search filters the list', () => {
    seed();
    show();
    fireEvent.change(search(), { target: { value: 'an' } });
    expect(screen.getByRole('checkbox', { name: 'Anna' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Piet' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
  });

  it('an unmatched name shows an Add row on top that creates and checks the person', () => {
    seed();
    const { onStart } = show();
    fireEvent.change(search(), { target: { value: 'Zoë' } });
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Zoë');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(search().value).toBe('');
    expect(box('Zoë')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith(['Jens', 'Zoë']);
  });

  it('R starts at once, but not while typing', () => {
    seed();
    const { onStart } = show();
    fireEvent.keyDown(search(), { key: 'r' });
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'r' });
    expect(onStart).toHaveBeenCalledWith(['Jens']);
  });
});

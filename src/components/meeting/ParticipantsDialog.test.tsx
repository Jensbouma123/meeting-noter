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
const field = () => screen.getByLabelText('Add a name') as HTMLInputElement;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ||= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ||= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
});
beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('ParticipantsDialog', () => {
  it('shows the question with the owner as a removable chip', () => {
    const { onStart } = show();
    expect(screen.getByText('Who is in this meeting?')).toBeInTheDocument();
    const chips = screen.getByRole('list', { name: 'People in this meeting' });
    expect(chips).toHaveTextContent('Jens');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Jens' }));
    expect(screen.queryByRole('list', { name: 'People in this meeting' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith([]);
  });

  it('Skip starts immediately without saving names', () => {
    const { onSkip, onStart } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('Enter adds, commas split, and Enter on an empty field starts', () => {
    const { onStart } = show();
    fireEvent.change(field(), { target: { value: 'Anna, Piet' } });
    fireEvent.change(field(), { target: { value: 'Anna, Piet, Sam' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(screen.getByRole('list', { name: 'People in this meeting' })).toHaveTextContent('JensAnnaPietSam');
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onStart).toHaveBeenCalledWith(['Jens', 'Anna', 'Piet', 'Sam']);
  });

  it('offers recently used people as one-click suggestions', () => {
    setParticipants('old', ['Marieke', 'Jens']);
    const { onStart } = show();
    fireEvent.focus(field());
    expect(screen.getByText('Recently used')).toBeInTheDocument();
    // The owner is already a chip, so only Marieke is offered.
    fireEvent.click(screen.getByRole('option', { name: 'Marieke' }));
    expect(screen.getByRole('list', { name: 'People in this meeting' })).toHaveTextContent('JensMarieke');
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith(['Jens', 'Marieke']);
  });

  it('R starts at once, but not while typing', () => {
    const { onStart } = show();
    fireEvent.keyDown(field(), { key: 'r' });
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'r' });
    expect(onStart).toHaveBeenCalledWith(['Jens']);
  });
});

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
const option = (name: string) => screen.getByRole('option', { name });
const search = () => screen.getByRole('combobox', { name: 'Search people' }) as HTMLInputElement;
const seed = () => setParticipants('old', ['Anna', 'Piet', 'Sam', 'Els', 'Bram']);

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ||= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ||= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
});
beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('ParticipantsDialog', () => {
  it('lists known people with the owner selected', () => {
    show();
    expect(screen.getByText('Who is in this meeting?')).toBeInTheDocument();
    expect(option('Jens')).toHaveAttribute('aria-selected', 'true');
  });

  it('Skip starts immediately without saving names', () => {
    const { onSkip, onStart } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('ticking and unticking people drives the started names', () => {
    setParticipants('old', ['Marieke']);
    const { onStart } = show();
    fireEvent.click(option('Marieke'));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith(['Jens', 'Marieke'], false);
    cleanup();
    const second = show();
    fireEvent.click(option('Jens'));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(second.onStart).toHaveBeenCalledWith([], false);
  });

  it('always offers a search combobox and filters the options', () => {
    seed();
    show();
    expect(search()).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(6);
    fireEvent.change(search(), { target: { value: 'an' } });
    expect(option('Anna')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Piet' })).toBeNull();
  });

  it('an unmatched name offers an Add row that creates and ticks the person', () => {
    seed();
    const { onStart } = show();
    fireEvent.change(search(), { target: { value: 'Zoë' } });
    const add = option('Add Zoë');
    expect(add).toBeInTheDocument();
    fireEvent.click(add);
    expect(search().value).toBe('');
    expect(option('Zoë')).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith(['Jens', 'Zoë'], false);
  });

  it('selected people show as removable chips', () => {
    const { onStart } = show();
    fireEvent.change(search(), { target: { value: 'Marieke' } });
    fireEvent.click(option('Add Marieke'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Marieke' }));
    expect(screen.queryByRole('button', { name: 'Remove Marieke' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith(['Jens'], false);
  });

  it('offers the folder roster on top with nothing ticked', () => {
    const { onStart } = show({ roster: ['Anna', 'Piet'], folderName: 'Work' });
    expect(screen.getByText('Usual people in Work')).toBeInTheDocument();
    expect(option('Anna')).toHaveAttribute('aria-selected', 'false');
    expect(option('Piet')).toHaveAttribute('aria-selected', 'false');
    expect(option('Jens')).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(option('Anna'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Remember new people for this folder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith(['Anna'], true);
  });

  it('passes the remember choice only when ticked', () => {
    const { onStart } = show({ folderName: 'Work' });
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(1);
    fireEvent.click(boxes[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith(['Jens'], true);
  });

  it('R starts at once, but not while typing', () => {
    seed();
    const { onStart } = show();
    fireEvent.keyDown(search(), { key: 'r' });
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'r' });
    expect(onStart).toHaveBeenCalledWith(['Jens'], false);
  });

  it('renders the list inline and keeps footer buttons reachable while the input has focus', () => {
    show();
    search().focus();
    const list = screen.getByRole('listbox');
    expect(list.className).not.toContain('absolute');
    expect(list.className).toContain('max-h-');
    expect(search()).toHaveFocus();
    const start = screen.getByRole('button', { name: 'Start' });
    const skip = screen.getByRole('button', { name: 'Skip' });
    expect(start).toBeInTheDocument();
    skip.focus();
    expect(skip).toHaveFocus();
    expect(list.contains(start)).toBe(false);
  });
});

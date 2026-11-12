// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { ParticipantsEditor } from './ParticipantsEditor';

afterEach(cleanup);

function show(onChange = vi.fn(), names: string[] = [], suggestions = ['Jens', 'Anna']) {
  render(
    <LanguageContext.Provider value="en">
      <ParticipantsEditor id="people" names={names} suggestions={suggestions} onChange={onChange} />
    </LanguageContext.Provider>,
  );
  return { onChange, input: screen.getByRole('combobox', { name: 'Add a name' }) };
}

describe('ParticipantsEditor combobox', () => {
  it('filters known names and picks the active match with the keyboard', () => {
    const { onChange, input } = show();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ann' } });
    expect(screen.getByRole('option', { name: 'Anna' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Jens' })).toBeNull();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Anna']);
  });

  it('offers Add when no known name exactly matches and Enter creates it', () => {
    const { onChange, input } = show();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Noor' } });
    expect(screen.getByRole('option', { name: 'Add Noor' })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Noor']);
  });

  it('adds comma separated names in one pass', () => {
    const { onChange, input } = show();
    fireEvent.change(input, { target: { value: 'Noor, Piet' } });
    expect(onChange).toHaveBeenCalledWith(['Noor']);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['Piet']);
  });
});

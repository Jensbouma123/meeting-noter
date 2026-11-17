// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { ParticipantPicker } from './ParticipantPicker';

function Harness({
  people = ['Anna', 'Piet', 'Sam'],
  roster = [],
  folderName = null,
}: {
  people?: string[];
  roster?: string[];
  folderName?: string | null;
}) {
  const [known, setKnown] = useState(people);
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (name: string) =>
    setSelected((current) =>
      current.some((item) => item.toLowerCase() === name.toLowerCase())
        ? current.filter((item) => item.toLowerCase() !== name.toLowerCase())
        : [...current, name],
    );
  const create = (name: string) => {
    setKnown((current) => [...current, name]);
    setSelected((current) => [...current, name]);
  };
  return (
    <ParticipantPicker
      people={known}
      roster={roster}
      folderName={folderName}
      selected={selected}
      onToggle={toggle}
      onCreate={create}
    />
  );
}

function show(props: { people?: string[]; roster?: string[]; folderName?: string | null } = {}) {
  render(
    <LanguageContext.Provider value="en">
      <Harness {...props} />
    </LanguageContext.Provider>,
  );
}
const box = () => screen.getByRole('combobox', { name: 'Search people' });
const option = (name: string) => screen.getByRole('option', { name });

afterEach(cleanup);

describe('ParticipantPicker', () => {
  it('is a multiselectable combobox wired to its listbox', () => {
    show();
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    expect(box().getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
  });

  it('moves the active option with the arrow keys and toggles it with Space', () => {
    show();
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    expect(box()).toHaveAttribute('aria-activedescendant', option('Piet').id);
    fireEvent.keyDown(box(), { key: ' ' });
    expect(option('Piet')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(box(), { key: 'ArrowUp' });
    expect(box()).toHaveAttribute('aria-activedescendant', option('Anna').id);
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(option('Anna')).toHaveAttribute('aria-selected', 'true');
  });

  it('offers the typed name as an option that Enter creates', () => {
    show();
    fireEvent.change(box(), { target: { value: 'Zoë' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(option('Zoë')).toHaveAttribute('aria-selected', 'true');
    expect((box() as HTMLInputElement).value).toBe('');
  });

  it('Escape closes the list and clears the query, and focus reopens it', () => {
    show();
    fireEvent.change(box(), { target: { value: 'an' } });
    fireEvent.keyDown(box(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect((box() as HTMLInputElement).value).toBe('');
    fireEvent.focus(box());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('puts the folder roster in its own section above everyone else', () => {
    show({ roster: ['Anna', 'Piet'], folderName: 'Work' });
    const usual = screen.getByRole('group', { name: 'Usual people in Work' });
    expect(usual.contains(option('Anna'))).toBe(true);
    expect(usual.contains(option('Piet'))).toBe(true);
    expect(usual.contains(option('Sam'))).toBe(false);
    expect(screen.getByRole('group', { name: 'All people' }).contains(option('Sam'))).toBe(true);
  });

  it('reports toggles through onToggle and creations through onCreate', () => {
    const onToggle = vi.fn();
    const onCreate = vi.fn();
    render(
      <LanguageContext.Provider value="en">
        <ParticipantPicker
          people={['Anna']}
          roster={[]}
          folderName={null}
          selected={[]}
          onToggle={onToggle}
          onCreate={onCreate}
        />
      </LanguageContext.Provider>,
    );
    fireEvent.click(option('Anna'));
    expect(onToggle).toHaveBeenCalledWith('Anna');
    fireEvent.change(box(), { target: { value: 'Bram' } });
    fireEvent.click(option('Add Bram'));
    expect(onCreate).toHaveBeenCalledWith('Bram');
  });
  it('overlays the list absolutely so it does not push layout', () => {
    show();
    expect(screen.getByRole('listbox').className).toContain('absolute');
    expect(screen.getByRole('listbox').className).toContain('top-full');
  });

  it('closes on outside click and blur, reopens on focus', () => {
    show();
    box().focus();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.blur(box(), { relatedTarget: document.body });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.focus(box());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('stays open when focus moves within the picker', () => {
    show();
    fireEvent.blur(box(), { relatedTarget: screen.getByRole('listbox') });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});

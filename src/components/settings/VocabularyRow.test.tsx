// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addVocabularyEntries, getVocabulary, resetVocabularyForTests } from '@/lib/vocabulary/store';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { VocabularySection } from './VocabularySection';

beforeEach(() => {
  localStorage.clear();
  resetVocabularyForTests();
  addVocabularyEntries([
    { word: 'Framna', variants: ['Fromna'] },
    { word: 'Hezelaer', variants: [] },
  ]);
});
afterEach(cleanup);

const words = () => getVocabulary().entries.map((e) => e.word);
const startEdit = (word: string) => fireEvent.click(screen.getByRole('button', { name: `Edit ${word}` }));

describe('VocabularyRow editing', () => {
  it('edits a word inline with Enter', () => {
    render(<VocabularySection />);
    startEdit('Framna');
    const field = screen.getByLabelText('Word');
    fireEvent.change(field, { target: { value: 'Framna B.V.' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(words()).toEqual(['Framna B.V.', 'Hezelaer']);
    expect(screen.queryByLabelText('Word')).not.toBeInTheDocument();
  });

  it('cancels with Escape and keeps the word', () => {
    render(<VocabularySection />);
    startEdit('Framna');
    const field = screen.getByLabelText('Word');
    fireEvent.change(field, { target: { value: 'Other' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(words()).toEqual(['Framna', 'Hezelaer']);
    expect(screen.queryByLabelText('Word')).not.toBeInTheDocument();
  });

  it('refuses a duplicate and an empty word with a message', () => {
    render(<VocabularySection />);
    startEdit('Framna');
    const field = screen.getByLabelText('Word');
    fireEvent.change(field, { target: { value: 'hezelaer' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(screen.getByRole('alert')).toHaveTextContent('already in your list');
    fireEvent.change(field, { target: { value: '  ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(screen.getByRole('alert')).toHaveTextContent('cannot be empty');
    expect(words()).toEqual(['Framna', 'Hezelaer']);
  });

  it('adds and removes a misheard version', () => {
    render(<VocabularySection />);
    const field = screen.getByLabelText('Add a misheard version of Hezelaer');
    fireEvent.change(field, { target: { value: 'Hasselaar' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(getVocabulary().entries[1].variants).toEqual(['Hasselaar']);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Hasselaar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Fromna' }));
    expect(getVocabulary().entries.flatMap((e) => e.variants)).toEqual([]);
  });

  it('refuses a misheard version it already has', () => {
    render(<VocabularySection />);
    const field = screen.getByLabelText('Add a misheard version of Framna');
    fireEvent.change(field, { target: { value: 'fromna' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(screen.getByRole('alert')).toHaveTextContent('Already listed');
    expect(getVocabulary().entries[0].variants).toEqual(['Fromna']);
  });

  it('is labelled in Dutch', () => {
    render(
      <LanguageContext.Provider value="nl">
        <VocabularySection />
      </LanguageContext.Provider>,
    );
    expect(screen.getByRole('button', { name: 'Framna bewerken' })).toBeInTheDocument();
    expect(screen.getByLabelText('Foute versie van Framna toevoegen')).toBeInTheDocument();
  });
});

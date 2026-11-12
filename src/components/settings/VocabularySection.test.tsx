// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addFixedWord, getVocabulary, resetVocabularyForTests } from '@/lib/vocabulary/store';
import { VocabularySection } from './VocabularySection';

beforeEach(() => {
  localStorage.clear();
  resetVocabularyForTests();
});
afterEach(cleanup);

describe('VocabularySection', () => {
  it('explains itself in plain words, without technical terms', () => {
    render(<VocabularySection />);
    expect(screen.getByText(/always spell your way, like names/)).toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toMatch(/boost|trie|WER|bias|logit/i);
  });

  it('shows a friendly empty state with Framna as the example', () => {
    render(<VocabularySection />);
    expect(screen.getByText(/No words yet\. Try adding Framna/)).toBeInTheDocument();
    expect(screen.getByText(/choose Fix this word/)).toBeInTheDocument();
  });

  it('adds with Enter, splits on commas, and lists the words', () => {
    render(<VocabularySection />);
    const field = screen.getByLabelText('Add a word');
    fireEvent.change(field, { target: { value: 'Framna, Hezelaer, Acme Cloud, framna' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(getVocabulary().entries.map((e) => e.word)).toEqual(['Framna', 'Hezelaer', 'Acme Cloud']);
    expect(screen.getByRole('status')).toHaveTextContent('Added 3 words to your list.');
    expect(field).toHaveValue('');
    const list = screen.getByRole('list', { name: 'Your words' });
    expect(list).toHaveTextContent('Acme Cloud');
    expect(screen.queryByText(/No words yet/)).not.toBeInTheDocument();
  });

  it('adds with the Add button', () => {
    render(<VocabularySection />);
    fireEvent.change(screen.getByLabelText('Add a word'), { target: { value: 'Hezelaer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(getVocabulary().entries.map((e) => e.word)).toEqual(['Hezelaer']);
  });

  it('keeps the strength setting closed under Advanced', () => {
    render(<VocabularySection />);
    expect(document.querySelector('details')).not.toHaveAttribute('open');
  });

  it('shows misheard spellings saved from a transcript, and removes a word', () => {
    render(<VocabularySection />);
    act(() => {
      addFixedWord('Fromna', 'Framna');
    });
    expect(screen.getByText('Also fixes: Fromna')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Framna' }));
    expect(getVocabulary().entries).toEqual([]);
  });

  it('imports a .csv file', async () => {
    render(<VocabularySection />);
    const file = new File(['word,heard as\nFramna,from now; Fromna\n'], 'words.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText(/import words from a/i), { target: { files: [file] } });
    await waitFor(() => expect(getVocabulary().entries).toEqual([{ word: 'Framna', variants: ['from now', 'Fromna'] }]));
    expect(screen.getByRole('status')).toHaveTextContent('Added 1 word from words.csv.');
  });
});

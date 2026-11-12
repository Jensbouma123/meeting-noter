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
    expect(screen.getByText(/spell your way — for example your company name, like Framna/)).toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toMatch(/boost|trie|WER|bias|logit/i);
  });

  it('adds pasted words, one per line or comma-separated, and lists them', () => {
    render(<VocabularySection />);
    fireEvent.change(screen.getByLabelText('Words to add'), {
      target: { value: 'Framna, Hezelaer\nAcme Cloud\nframna' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add words/i }));

    expect(getVocabulary().entries.map((e) => e.word)).toEqual(['Framna', 'Hezelaer', 'Acme Cloud']);
    expect(screen.getByRole('status')).toHaveTextContent('Added 3 words to your list.');
    expect(screen.getByLabelText('Words to add')).toHaveValue('');
    const list = screen.getByRole('list', { name: 'Your words' });
    expect(list).toHaveTextContent('Framna');
    expect(list).toHaveTextContent('Acme Cloud');
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

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS_SECTIONS } from '@/components/settings/sections';
import { resetVocabularyForTests } from '@/lib/vocabulary/store';
import { SettingsSheet } from './SettingsSheet';
import { DEFAULT_SETTINGS } from './types';

vi.mock('@/components/models', () => ({ useAnyModelFailed: () => false }));
vi.mock('@/components/settings/GeneralSection', () => ({ GeneralSection: () => <div>general</div> }));
vi.mock('@/components/settings/AdvancedSection', () => ({ AdvancedSection: () => <div>advanced</div> }));
vi.mock('@/components/settings/StorageSection', () => ({ StorageSection: () => <div>storage</div> }));
vi.mock('@/components/settings/AboutSection', () => ({ AboutSection: () => <div>about</div> }));

beforeEach(() => {
  localStorage.clear();
  resetVocabularyForTests();
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  window.matchMedia = window.matchMedia ?? ((() => ({
    matches: true, addEventListener() {}, removeEventListener() {},
  })) as unknown as typeof window.matchMedia);
});
afterEach(cleanup);

describe('SettingsSheet vocabulary tab', () => {
  it('lists a Vocabulary section and shows Your words when it is chosen', () => {
    expect(SETTINGS_SECTIONS.map((s) => s.id)).toContain('vocabulary');
    render(<SettingsSheet open onClose={() => {}} settings={DEFAULT_SETTINGS} onSettingsChange={() => {}} />);
    fireEvent.click(screen.getAllByRole('tab', { name: /Vocabulary/ })[0]);
    expect(screen.getByLabelText('Words to add')).toBeInTheDocument();
  });
});

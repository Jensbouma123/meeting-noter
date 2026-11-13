// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { ParticipantsDialog } from './ParticipantsDialog';
import { RecordTargetDialog } from './RecordTargetDialog';
import { ShortcutsHelp } from './ShortcutsHelp';
import { ShareDialog } from '@/components/share/ShareDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import type { DialogCase as Case } from './dialogs.a11y.types';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ||= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ||= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const CASES: Case[] = [
  {
    name: 'participants prompt',
    title: { en: 'Who is in this meeting?', nl: 'Wie zijn er in deze meeting?' },
    render: (onClose) => (
      <ParticipantsDialog ownerName="Jens" initial={[]} onSkip={onClose} onStart={() => {}} />
    ),
  },
  {
    name: 'record target',
    title: { en: 'This session already has a recording', nl: 'Deze sessie heeft al een opname' },
    render: (onClose) => (
      <RecordTargetDialog
        open
        title="Standup"
        durationSeconds={90}
        onCancel={onClose}
        onAppend={() => {}}
        onStartNew={() => {}}
      />
    ),
  },
  {
    name: 'shortcuts',
    title: { en: 'Keyboard shortcuts', nl: 'Sneltoetsen' },
    render: (onClose) => <ShortcutsHelp open onClose={onClose} />,
  },
  {
    name: 'share',
    title: { en: 'Share this meeting', nl: 'Deel deze meeting' },
    render: (onClose) => (
      <ShareDialog open onClose={onClose} title="Standup" segments={[]} speakers={{}} />
    ),
  },
  {
    name: 'settings',
    title: { en: 'Settings', nl: 'Instellingen' },
    render: (onClose) => (
      <SettingsDialog open onClose={onClose} activeSection="general" onSectionChange={() => {}}>
        <p>content</p>
      </SettingsDialog>
    ),
  },
];

function escape(dialog: HTMLElement) {
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
}

for (const testCase of CASES) {
  describe(`${testCase.name} dialog`, () => {
    for (const language of ['en', 'nl'] as const) {
      it(`is a modal dialog named “${testCase.title[language]}” in ${language}`, () => {
        const onClose = vi.fn();
        render(
          <LanguageContext.Provider value={language}>
            {testCase.render(onClose)}
          </LanguageContext.Provider>,
        );
        const dialog = screen.getByRole('dialog', { name: testCase.title[language] });
        expect(dialog).toHaveAttribute('open');
        expect(dialog.contains(document.activeElement)).toBe(true);
      });
    }

    it('closes on Escape', () => {
      const onClose = vi.fn();
      render(
        <LanguageContext.Provider value="en">{testCase.render(onClose)}</LanguageContext.Provider>,
      );
      escape(screen.getByRole('dialog', { hidden: true }));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('offers a labelled way out for pointer and screen reader users', () => {
      render(
        <LanguageContext.Provider value="en">{testCase.render(vi.fn())}</LanguageContext.Provider>,
      );
      expect(screen.getByRole('button', { name: /close dialog|dialoog sluiten/i, hidden: true })).toBeInTheDocument();
    });
  });
}

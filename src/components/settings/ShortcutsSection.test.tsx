// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ShortcutsSection } from './ShortcutsSection';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { SHORTCUTS } from '@/components/meeting/shortcuts';
import { t } from '@/lib/i18n';

describe('ShortcutsSection', () => {
  afterEach(cleanup);

  it.each(['en', 'nl'] as const)('renders translated shortcut labels in %s', (language) => {
    render(
      <LanguageContext.Provider value={language}>
        <ShortcutsSection />
      </LanguageContext.Provider>,
    );

    for (const shortcut of SHORTCUTS) {
      const label = t('dialogs', shortcut.label, language);
      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.queryByText(shortcut.label)).toBeNull();
    }
  });
});

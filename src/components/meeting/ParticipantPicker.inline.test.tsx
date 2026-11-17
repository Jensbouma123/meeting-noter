// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { ParticipantPicker } from './ParticipantPicker';

afterEach(cleanup);

describe('ParticipantPicker inline placement', () => {
  it('places the list in normal flow with a capped height', () => {
    render(
      <LanguageContext.Provider value="en">
        <ParticipantPicker
          people={['Anna']}
          roster={[]}
          folderName={null}
          selected={[]}
          onToggle={vi.fn()}
          onCreate={vi.fn()}
          placement="inline"
        />
      </LanguageContext.Provider>,
    );
    fireEvent.focus(screen.getByRole('combobox'));
    const cls = screen.getByRole('listbox').className;
    expect(cls).not.toContain('absolute');
    expect(cls).toContain('max-h-');
  });
});

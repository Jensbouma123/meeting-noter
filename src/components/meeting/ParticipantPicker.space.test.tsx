// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { ParticipantPicker } from './ParticipantPicker';

afterEach(cleanup);

describe('ParticipantPicker space handling', () => {
  it('lets a space be typed while the mouse hovers an option', () => {
    const onToggle = vi.fn();
    render(
      <LanguageContext.Provider value="en">
        <ParticipantPicker people={['Anna', 'Piet']} roster={[]} folderName={null} selected={[]}
          onToggle={onToggle} onCreate={vi.fn()} />
      </LanguageContext.Provider>,
    );
    fireEvent.mouseEnter(screen.getByRole('option', { name: 'Anna' }));
    const notPrevented = fireEvent.keyDown(screen.getByRole('combobox'), { key: ' ' });
    expect(notPrevented).toBe(true);
    expect(onToggle).not.toHaveBeenCalled();
  });
});

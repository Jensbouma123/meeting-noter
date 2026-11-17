// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import type { FolderRow } from '@/lib/meeting-db/types';
import { FolderSettingsDialog } from './FolderSettingsDialog';

const row = (id: string, parentId: string | null, roster: string[], inheritRoster: boolean): FolderRow => ({
  id,
  parentId,
  name: id,
  sort: 0,
  createdAt: 0,
  updatedAt: 0,
  roster,
  inheritRoster,
  context: '',
});

const team = row('Team', null, ['Anna', 'Piet'], false);
const q1 = row('Q1', 'Team', [], true);
const rows = [team, q1];

function show(folder: FolderRow) {
  const onClose = vi.fn();
  const onSave = vi.fn();
  render(
    <LanguageContext.Provider value="en">
      <FolderSettingsDialog folder={folder} folders={rows} onClose={onClose} onSave={onSave} />
    </LanguageContext.Provider>,
  );
  return { onClose, onSave };
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ||= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ||= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});
afterEach(cleanup);

describe('FolderSettingsDialog', () => {
  it('shows the inherited roster read-only while inheritance is on', () => {
    show(q1);
    expect(screen.getByRole('dialog', { name: 'Settings for “Q1”' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Inherit from parent folder' })).toBeChecked();
    expect(screen.getByText('Inherited from “Team”')).toBeInTheDocument();
    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Anna from this folder' })).toBeNull();
    expect(screen.queryByLabelText('Add a person')).toBeNull();
  });

  it('saves the folder context text', () => {
    const { onSave } = show(q1);
    fireEvent.change(screen.getByLabelText('About this folder'), { target: { value: 'design syncs' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith([], true, 'design syncs');
  });

  it('edits its own roster once inheritance is switched off', () => {
    const { onSave } = show(q1);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Inherit from parent folder' }));
    fireEvent.change(screen.getByLabelText('Add a person'), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Sam')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(['Sam'], false, '');
  });

  it('removes roster names and saves the remaining people', () => {
    const { onSave } = show(team);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Piet from this folder' }));
    expect(screen.queryByText('Piet')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(['Anna'], false, '');
  });

  it('closes without saving on Cancel', () => {
    const { onClose, onSave } = show(team);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

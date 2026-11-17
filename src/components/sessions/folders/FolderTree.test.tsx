// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import { fake } from './test-support/fakeFolderServer';
import { renderTree, renderTreeWith } from './test-support/FolderHarness';
import { session } from './test-support/fixtures';
import './FolderTree.testSupport';

describe('FolderTree', () => {
  it('renders nested folders with the filed meeting and collapses', async () => {
    renderTree();
    expect(await screen.findByText('Standup')).toBeInTheDocument();
    expect(screen.getByText('Q1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Work/, expanded: true }));
    expect(screen.queryByText('Q1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Work/, expanded: false }));
    expect(screen.getByText('Q1')).toBeInTheDocument();
  });

  it('shows the meeting count badge on a folder with filed meetings', async () => {
    renderTree();
    const q1 = await screen.findByRole('button', { name: /^Q1/ });
    expect(within(q1).getByText('1')).toBeInTheDocument();
  });

  it('keeps empty folders visible when there are no meetings', async () => {
    fake.server.meetings = {};
    renderTreeWith([]);
    expect(await screen.findByRole('button', { name: /^Work/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Q1/ })).toBeInTheDocument();
  });

  it('has no root drop zone', async () => {
    renderTree();
    await screen.findByText('Standup');
    expect(screen.queryByText('Top level')).toBeNull();
  });

  it('shows five meetings per folder, newest first, and loads ten more on demand', async () => {
    const many = Array.from(
      { length: 17 },
      (_, i) => ({ ...session, sessionId: `s${i}`, title: `Meet ${i}`, createdAt: i }) as SessionMetadata,
    );
    fake.server.meetings = Object.fromEntries(many.map((m) => [m.sessionId, 'b']));
    renderTreeWith(many);
    await screen.findByText('Meet 16');
    expect(screen.getAllByText(/^Meet \d+$/).map((e) => e.textContent)).toEqual([
      'Meet 16',
      'Meet 15',
      'Meet 14',
      'Meet 13',
      'Meet 12',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(screen.getAllByText(/^Meet \d+$/)).toHaveLength(15);
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(screen.getAllByText(/^Meet \d+$/)).toHaveLength(17);
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });
});

// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LIST, mockFetch, renderSection, resetRenderedSection } from './AssistantSection.test-support';

describe('AssistantSection', () => {
  afterEach(resetRenderedSection);

  it('shows a labelled placeholder with a logo per assistant while loading', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );
    renderSection();
    for (const [id, name] of [
      ['claude-desktop', 'Claude Desktop'],
      ['claude-code', 'Claude Code'],
      ['codex', 'Codex CLI'],
    ]) {
      const card = screen.getByTestId(`assistant-placeholder-${id}`);
      expect(card.getAttribute('aria-label')).toBe(name);
      expect(card.querySelector(`[data-testid="assistant-logo-${id}"]`)?.getAttribute('aria-hidden')).toBe('true');
    }
    expect(screen.getByText('Looking for AI assistants…')).toBeTruthy();
  });

  it('shows the same logos on loaded cards and drops the placeholders', async () => {
    mockFetch(() => LIST);
    renderSection();
    await screen.findByText('Connected');
    expect(screen.queryByTestId('assistant-placeholder-codex')).toBeNull();
    expect(screen.queryByText('Looking for AI assistants…')).toBeNull();
    for (const id of ['claude-desktop', 'claude-code', 'codex'])
      expect(screen.getByTestId(`assistant-logo-${id}`)).toBeTruthy();
  });

  it('shows statuses per assistant', async () => {
    mockFetch(() => LIST);
    renderSection();
    expect(await screen.findByText('Connected')).toBeTruthy();
    expect(screen.getAllByText('Not connected')).toHaveLength(2);
    expect(screen.getByText('Copy command')).toBeTruthy();
  });
});

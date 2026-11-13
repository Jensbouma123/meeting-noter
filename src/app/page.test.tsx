// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Home from './page';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/lib/meeting/session-crud', () => ({
  createDraftSession: vi.fn(),
  listSessions: () => [],
}));
vi.mock('@/lib/meeting/session-reset', () => ({ clearIdleSession: vi.fn() }));
vi.mock('@/components/sessions', () => ({
  HomeLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  NewSessionDialog: () => null,
}));

afterEach(cleanup);

describe('Home welcome screen', () => {
  it('shows the title, the three steps as one ordered list, and the New meeting button', () => {
    render(
      <LanguageContext.Provider value="en">
        <Home />
      </LanguageContext.Provider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Welcome to Meeting Noter' })).toBeInTheDocument();

    const steps = screen.getByRole('region', { name: 'How it works' });
    expect(within(steps).getByRole('list')).toBeInTheDocument();
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3);

    expect(screen.getByRole('button', { name: 'New meeting' })).toBeInTheDocument();
  });

  it('renders the steps without hand-typed numbers (the list supplies them)', () => {
    render(
      <LanguageContext.Provider value="nl">
        <Home />
      </LanguageContext.Provider>,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent(/^Start een meeting$/);
    expect(items[2]).toHaveTextContent(/^Deel de samenvatting met actiepunten$/);
  });
});

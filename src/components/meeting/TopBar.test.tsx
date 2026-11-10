// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { TopBar } from './TopBar';

vi.mock('./ThemeSwitcher', () => ({
  ThemeSwitcher: () => null,
}));

vi.mock('@/components/meeting/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/meeting/store')>();
  return { ...actual };
});

function view(status: 'live' | 'idle' = 'live') {
  return (
    <ToastProvider>
      <TopBar
          title="Standup"
          onTitleChange={() => {}}
          status={status}
          startedAt={Date.now()}
          stats={null}
          language={{ code: 'en', name: 'English', locked: false, confidence: 1 }}
          languageAuto
          selectedLang="auto"
          onPickLanguage={() => {}}
          onOpenSettings={() => {}}
          modelReadiness="ready"
          modelProgress={{ stage: null, label: '', percent: null, detail: null }}
          segments={[]}
          speakers={{}}
          onClearTranscript={() => {}}
        />
    </ToastProvider>
  );
}

afterEach(cleanup);

describe('TopBar phone layout (390px)', () => {
  it('wraps instead of clipping the right-most action', () => {
    const { container } = render(view());
    const header = screen.getByTestId('meeting-topbar');
    // Wraps to a second row on phones; never a fixed single row that clips.
    expect(header.className).toMatch(/flex-wrap/);
    expect(header.className).toMatch(/overflow-hidden/);
    expect(header.className).toMatch(/h-auto/);
    // Desktop stays a single 3.5rem row.
    expect(header.className).toMatch(/sm:h-14/);
    // Title takes the full first row on phones so status + actions fit below.
    const title = header.firstElementChild as HTMLElement;
    expect(title.className).toMatch(/basis-full/);
    // Status and actions rows exist and can shrink without clipping.
    expect(screen.getByTestId('topbar-status').className).toMatch(/min-w-0/);
    expect(screen.getByTestId('topbar-actions').className).toMatch(/min-w-0/);
    // Settings (right-most) action is still mounted, not dropped.
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    void container;
  });

  it('renders the idle state without overflow classes regressing', () => {
    render(view('idle'));
    expect(screen.getByTestId('meeting-topbar').className).toMatch(/max-w-full/);
  });
});

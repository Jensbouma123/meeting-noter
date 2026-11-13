// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { TopBar } from './TopBar';
import type { ModelProgressView, ModelReadiness } from './modelReadiness.types';

vi.mock('@/components/meeting/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/meeting/store')>();
  return { ...actual };
});

function view(
  status: 'live' | 'idle' = 'live',
  modelReadiness: ModelReadiness = 'ready',
  modelProgress: ModelProgressView = { stage: null, label: '', percent: null, detail: null },
) {
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
          modelReadiness={modelReadiness}
          modelProgress={modelProgress}
          onClearTranscript={() => {}}
          onOpenShare={() => {}}
          updateAvailable
          modelFailed
        />
    </ToastProvider>
  );
}

afterEach(cleanup);

describe('TopBar title editing', () => {
  it('focuses the title input with its text selected when editing starts', () => {
    render(view('idle'));
    fireEvent.click(screen.getByRole('button', { name: 'Standup' }));
    const input = screen.getByRole('textbox', { name: 'Meeting title' }) as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Standup'.length);
  });
});

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
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' }).querySelector('[aria-label="New"]')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export transcript' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Theme' })).not.toBeInTheDocument();
    void container;
  });

  it('renders the idle state without overflow classes regressing', () => {
    render(view('idle'));
    expect(screen.getByTestId('meeting-topbar').className).toMatch(/max-w-full/);
    expect(screen.queryByText('Ready')).not.toBeInTheDocument();
  });

  it('shows the model download progress button while the model loads', () => {
    render(
      view('idle', 'downloading', {
        stage: 'downloading',
        label: 'Downloading model 42%',
        percent: 42,
        detail: null,
      }),
    );
    expect(screen.getByRole('button', { name: 'Downloading model 42%' })).toBeInTheDocument();
  });

  it('shows the redesigned menu items and update badge', () => {
    render(view());
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Install new version')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Clear transcript')).toBeInTheDocument();
  });
});

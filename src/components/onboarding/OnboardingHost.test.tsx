// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ONBOARDING_STORAGE_KEY } from '@/lib/onboarding/store';
import { registerOnboardingTestEnv } from './OnboardingDialog.testSupport';
import { OnboardingHost } from './OnboardingHost';

const registerModelsOnce = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@/components/models/registerModelsOnce', () => ({ registerModelsOnce }));
const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

registerOnboardingTestEnv();

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('OnboardingHost', () => {
  it('shows onboarding on a fresh start at / and registers the models it offers', () => {
    render(<OnboardingHost />);
    expect(screen.getByText('Step 1 of 9')).toBeInTheDocument();
    expect(registerModelsOnce).toHaveBeenCalled();
  });

  it('never shows on /dev routes, whose fresh eval origins have no onboarding state', () => {
    for (const path of ['/dev/echo-eval', '/dev/echo-eval/grid']) {
      nav.pathname = path;
      const { unmount } = render(<OnboardingHost />);
      expect(screen.queryByText('Step 1 of 9')).not.toBeInTheDocument();
      unmount();
    }
    nav.pathname = '/';
  });

  it('stays closed once onboarding was finished', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    render(<OnboardingHost />);
    expect(screen.queryByText('Step 1 of 9')).not.toBeInTheDocument();
  });

  it('is mounted once in the root layout and not again by the meeting page', () => {
    expect(source('src/app/layout.tsx').match(/<OnboardingHost \/>/g)).toHaveLength(1);
    const meeting = source('src/app/sessions/[sessionId]/components/MeetingDialogs.tsx');
    expect(meeting).not.toMatch(/Onboarding/);
  });
});

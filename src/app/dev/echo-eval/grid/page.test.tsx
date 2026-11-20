// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EchoEvalGridPage from './page';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('shards=2&limit=12&set=meetings'),
}));

describe('EchoEvalGridPage', () => {
  it('starts every shard frame on first render without waiting for shard 0 to report', () => {
    render(<EchoEvalGridPage />);
    const srcs = screen.getAllByTitle(/^echo-eval shard \d$/).map((f) => f.getAttribute('src'));
    expect(srcs).toEqual([
      '/dev/echo-eval?limit=12&set=meetings&autostart=1&shard=0&shards=2',
      '/dev/echo-eval?limit=12&set=meetings&autostart=1&shard=1&shards=2',
    ]);
  });
});

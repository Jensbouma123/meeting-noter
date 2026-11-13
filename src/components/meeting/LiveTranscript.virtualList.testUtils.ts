import { act } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

type ROCallback = (entries: { target: Element; borderBoxSize?: { blockSize: number }[] }[]) => void;
const observers: { cb: ROCallback; targets: Set<Element> }[] = [];

class FakeResizeObserver {
  private entry: { cb: ROCallback; targets: Set<Element> };
  constructor(cb: ROCallback) {
    this.entry = { cb, targets: new Set() };
    observers.push(this.entry);
  }
  observe(el: Element) {
    this.entry.targets.add(el);
  }
  unobserve(el: Element) {
    this.entry.targets.delete(el);
  }
  disconnect() {
    this.entry.targets.clear();
  }
}

export function resize(el: Element, blockSize: number) {
  act(() => {
    for (const o of observers) {
      if (o.targets.has(el)) o.cb([{ target: el, borderBoxSize: [{ blockSize }] }]);
    }
  });
}

export const rowAt = (container: HTMLElement, index: number) =>
  container.querySelector<HTMLElement>(`[data-index="${index}"]`)!;
export const scroller = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[aria-label="Meeting transcript"]')!;

export const SCROLL_HEIGHT = 5000;

export function stubVirtualListEnvironment() {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.stubGlobal('CSS', { escape: (s: string) => s });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 400 });
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => SCROLL_HEIGHT });
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error restore jsdom defaults
    delete HTMLElement.prototype.clientHeight;
    // @ts-expect-error restore jsdom defaults
    delete HTMLElement.prototype.scrollHeight;
  });
}

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom is missing these; components (sidebar, theme, charts, motion) need them.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver =
  IntersectionObserverStub as unknown as typeof IntersectionObserver;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

if (!Element.prototype.getBoundingClientRect) {
  Element.prototype.getBoundingClientRect = () => ({}) as DOMRect;
}

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom doesn't lay pages out, so it has no scrolling; the call itself is what tests check.
Element.prototype.scrollIntoView = vi.fn();
// Nor media queries; pages render as if in the light theme.
window.matchMedia = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

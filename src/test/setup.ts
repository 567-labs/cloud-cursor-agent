/**
 * Test setup file
 *
 * This file is automatically run before all tests.
 * It sets up mocks and test utilities for the test environment.
 */

import { afterEach, mock } from "bun:test";

// Polyfill vi.mock for Bun's test runner
// Bun doesn't support vi.mock natively, so we add it to the global vi object
if (typeof globalThis.vi === "undefined") {
  (globalThis as any).vi = {};
}

// Add mock method to vi that uses Bun's mock.module
(globalThis as any).vi.mock = (modulePath: string, factory?: () => any) => {
  if (factory) {
    mock.module(modulePath, factory);
  } else {
    mock.module(modulePath, () => ({}));
  }
};

// Mock Ink components since we're testing in a non-terminal environment
// Ink components will be mocked in individual test files as needed

// Cleanup after each test
// Note: React Testing Library cleanup is handled in component test files
afterEach(() => {
  // Reset any global state if needed
});

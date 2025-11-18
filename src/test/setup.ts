/**
 * Test setup file
 *
 * This file is automatically run before all tests.
 * It sets up mocks and test utilities for the test environment.
 */

import { afterEach } from "bun:test";

// Mock Ink components since we're testing in a non-terminal environment
// Ink components will be mocked in individual test files as needed

// Cleanup after each test
// Note: React Testing Library cleanup is handled in component test files
afterEach(() => {
  // Reset any global state if needed
});

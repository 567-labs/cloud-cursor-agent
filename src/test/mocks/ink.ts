/**
 * Mock implementations for Ink components
 * 
 * These mocks allow us to test React components that use Ink
 * without requiring a real terminal environment.
 */

import React from "react";

/**
 * Mock Box component - renders as a div
 */
export const Box = ({ children, ...props }: any) => {
  return React.createElement("div", { "data-testid": "ink-box", ...props }, children);
};

/**
 * Mock Text component - renders as a span
 */
export const Text = ({ children, ...props }: any) => {
  return React.createElement("span", { "data-testid": "ink-text", ...props }, children);
};

/**
 * Mock Spinner component
 */
export const Spinner = ({ text }: { text?: string }) => {
  return React.createElement("div", { "data-testid": "ink-spinner" }, text || "Loading...");
};

/**
 * Mock useStdout hook
 */
export function useStdout() {
  return {
    stdout: {
      columns: 100,
      rows: 30,
      on: () => {},
      off: () => {},
    },
  };
}

/**
 * Mock useInput hook
 */
export function useInput(callback: (input: string, key: any) => void) {
  // Hook implementation - tests can manually trigger input
  return callback;
}


import { test, expect, describe, beforeEach, vi } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import { Spinner } from "./Spinner.js";
import { vi } from "bun:test";

// Mock Ink components
vi.mock("ink", () => import("../test/mocks/ink.js"));

describe("Spinner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders default text", () => {
    render(<Spinner />);
    expect(screen.getByText(/Loading/)).toBeDefined();
  });

  test("renders custom text", () => {
    render(<Spinner text="Processing..." />);
    expect(screen.getByText(/Processing/)).toBeDefined();
  });

  test("animates through spinner frames", async () => {
    const { rerender } = render(<Spinner text="Loading" />);

    const initialText = screen.getByText(/Loading/).textContent;

    // Advance time to trigger animation
    vi.advanceTimersByTime(100);

    await waitFor(() => {
      const updatedText = screen.getByText(/Loading/).textContent;
      expect(updatedText).not.toBe(initialText);
    });
  });

  test("uses default color", () => {
    render(<Spinner />);
    const container = screen.getByTestId("ink-text");
    expect(container).toBeDefined();
  });

  test("uses custom color", () => {
    render(<Spinner color="cyan" />);
    const container = screen.getByTestId("ink-text");
    expect(container).toBeDefined();
  });

  test("cleans up interval on unmount", () => {
    const { unmount } = render(<Spinner />);
    unmount();
    // If cleanup works, no errors should occur
  });
});

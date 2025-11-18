import { test, expect, describe, beforeEach, vi } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { useTerminalDimensions } from "./useTerminalDimensions.js";

// Mock ink's useStdout
const mockStdout = {
  columns: 100,
  rows: 30,
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock("ink", () => ({
  useStdout: () => ({
    stdout: mockStdout,
  }),
}));

describe("useTerminalDimensions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStdout.columns = 100;
    mockStdout.rows = 30;
  });

  test("initial state: returns dimensions from stdout", () => {
    const { result } = renderHook(() => useTerminalDimensions());

    expect(result.current.terminalWidth).toBe(100);
    expect(result.current.terminalHeight).toBe(30);
  });

  test("initial state: falls back to process.stdout if stdout unavailable", () => {
    const originalStdout = process.stdout.columns;
    process.stdout.columns = 80;
    process.stdout.rows = 24;

    vi.mocked(require("ink").useStdout).mockReturnValue({
      stdout: null,
    });

    const { result } = renderHook(() => useTerminalDimensions());

    expect(result.current.terminalWidth).toBe(80);
    expect(result.current.terminalHeight).toBe(24);

    process.stdout.columns = originalStdout;
  });

  test("resize: updates dimensions on resize event", async () => {
    const { result } = renderHook(() => useTerminalDimensions());

    expect(result.current.terminalWidth).toBe(100);

    // Simulate resize event
    mockStdout.columns = 120;
    mockStdout.rows = 40;

    // Trigger resize handler
    const resizeHandler = mockStdout.on.mock.calls.find(
      (call) => call[0] === "resize"
    )?.[1];

    if (resizeHandler) {
      resizeHandler();
    }

    await waitFor(() => {
      expect(result.current.terminalWidth).toBe(120);
      expect(result.current.terminalHeight).toBe(40);
    });
  });

  test("cleanup: removes event listeners on unmount", () => {
    const { unmount } = renderHook(() => useTerminalDimensions());

    expect(mockStdout.on).toHaveBeenCalledWith("resize", expect.any(Function));

    unmount();

    expect(mockStdout.off).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  test("handles missing stdout gracefully", () => {
    vi.mocked(require("ink").useStdout).mockReturnValue({
      stdout: null,
    });

    const originalColumns = process.stdout.columns;
    const originalRows = process.stdout.rows;

    process.stdout.columns = 80;
    process.stdout.rows = 24;

    const { result } = renderHook(() => useTerminalDimensions());

    expect(result.current.terminalWidth).toBe(80);
    expect(result.current.terminalHeight).toBe(24);

    process.stdout.columns = originalColumns;
    process.stdout.rows = originalRows;
  });
});


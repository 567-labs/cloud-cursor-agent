import { test, expect, describe, beforeEach, vi } from "bun:test";
import { openInBrowser } from "./browser.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Mock child_process.exec
vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

vi.mock("util", () => ({
  promisify: vi.fn((fn) => fn),
}));

describe("openInBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("opens URL on macOS using 'open' command", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "darwin",
      writable: true,
    });

    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((command, callback: any) => {
      expect(command).toContain('open "');
      callback(null, "", "");
      return {} as any;
    });

    await openInBrowser("https://example.com");

    expect(mockExec).toHaveBeenCalled();

    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
    });
  });

  test("opens URL on Windows using 'start' command", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "win32",
      writable: true,
    });

    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((command, callback: any) => {
      expect(command).toContain('start "');
      callback(null, "", "");
      return {} as any;
    });

    await openInBrowser("https://example.com");

    expect(mockExec).toHaveBeenCalled();

    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
    });
  });

  test("opens URL on Linux using 'xdg-open' command", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "linux",
      writable: true,
    });

    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((command, callback: any) => {
      expect(command).toContain('xdg-open "');
      callback(null, "", "");
      return {} as any;
    });

    await openInBrowser("https://example.com");

    expect(mockExec).toHaveBeenCalled();

    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
    });
  });

  test("throws error when exec fails", async () => {
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((command, callback: any) => {
      callback(new Error("Command failed"), "", "");
      return {} as any;
    });

    await expect(openInBrowser("https://example.com")).rejects.toThrow(
      "Failed to open browser"
    );
  });

  test("handles non-Error exceptions", async () => {
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((command, callback: any) => {
      callback("String error", "", "");
      return {} as any;
    });

    await expect(openInBrowser("https://example.com")).rejects.toThrow(
      "Failed to open browser"
    );
  });

  test("quotes URL in command", async () => {
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((command, callback: any) => {
      expect(command).toContain('"https://example.com"');
      callback(null, "", "");
      return {} as any;
    });

    await openInBrowser("https://example.com");
  });
});

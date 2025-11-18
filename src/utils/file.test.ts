import { test, expect, describe, beforeEach, vi } from "bun:test";
import { readPlanFile } from "./file.js";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { stdin } from "process";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

// Mock path
vi.mock("path", () => ({
  resolve: vi.fn((path) => `/resolved/${path}`),
}));

// Mock process.stdin
vi.mock("process", () => ({
  stdin: {
    setEncoding: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}));

describe("readPlanFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("reads file from disk when path is provided", async () => {
    const mockReadFile = vi.mocked(readFile);
    mockReadFile.mockResolvedValue("Plan content");

    const content = await readPlanFile("plan.md");

    expect(mockReadFile).toHaveBeenCalledWith("/resolved/plan.md", "utf-8");
    expect(content).toBe("Plan content");
  });

  test("strips frontmatter from markdown files", async () => {
    const mockReadFile = vi.mocked(readFile);
    const contentWithFrontmatter = `---
title: Plan
---
Actual plan content`;
    mockReadFile.mockResolvedValue(contentWithFrontmatter);

    const content = await readPlanFile("plan.md");

    expect(content).toBe("Actual plan content");
  });

  test("strips frontmatter with different line endings", async () => {
    const mockReadFile = vi.mocked(readFile);
    const contentWithFrontmatter = `---\r\ntitle: Plan\r\n---\r\nActual plan content`;
    mockReadFile.mockResolvedValue(contentWithFrontmatter);

    const content = await readPlanFile("plan.md");

    expect(content).toBe("Actual plan content");
  });

  test("does not strip frontmatter from non-markdown files", async () => {
    const mockReadFile = vi.mocked(readFile);
    const contentWithFrontmatter = `---
title: Plan
---
Actual plan content`;
    mockReadFile.mockResolvedValue(contentWithFrontmatter);

    const content = await readPlanFile("plan.txt");

    expect(content).toBe(contentWithFrontmatter.trim());
  });

  test("trims content", async () => {
    const mockReadFile = vi.mocked(readFile);
    mockReadFile.mockResolvedValue("  Plan content  ");

    const content = await readPlanFile("plan.md");

    expect(content).toBe("Plan content");
  });

  test("handles file not found error", async () => {
    const mockReadFile = vi.mocked(readFile);
    const error = new Error("File not found");
    (error as any).code = "ENOENT";
    mockReadFile.mockRejectedValue(error);

    await expect(readPlanFile("nonexistent.md")).rejects.toThrow(
      "File not found: nonexistent.md"
    );
  });

  test("handles other read errors", async () => {
    const mockReadFile = vi.mocked(readFile);
    mockReadFile.mockRejectedValue(new Error("Permission denied"));

    await expect(readPlanFile("plan.md")).rejects.toThrow(
      "Failed to read file plan.md"
    );
  });

  test("handles stdin input when path is '-'", async () => {
    const mockStdin = vi.mocked(stdin);
    let dataCallback: ((chunk: string) => void) | null = null;
    let endCallback: (() => void) | null = null;

    mockStdin.on.mockImplementation((event: string, callback: any) => {
      if (event === "data") {
        dataCallback = callback;
      } else if (event === "end") {
        endCallback = callback;
      }
      return stdin;
    });

    const promise = readPlanFile("-");

    // Simulate stdin data
    if (dataCallback) {
      dataCallback("Plan content from stdin");
    }

    // Simulate stdin end
    if (endCallback) {
      endCallback();
    }

    const content = await promise;
    expect(content).toBe("Plan content from stdin");
  });

  test("strips frontmatter from stdin input", async () => {
    const mockStdin = vi.mocked(stdin);
    let dataCallback: ((chunk: string) => void) | null = null;
    let endCallback: (() => void) | null = null;

    mockStdin.on.mockImplementation((event: string, callback: any) => {
      if (event === "data") {
        dataCallback = callback;
      } else if (event === "end") {
        endCallback = callback;
      }
      return stdin;
    });

    const promise = readPlanFile("-");

    if (dataCallback) {
      dataCallback(`---
title: Plan
---
Actual content`);
    }

    if (endCallback) {
      endCallback();
    }

    const content = await promise;
    expect(content).toBe("Actual content");
  });

  test("handles stdin errors", async () => {
    const mockStdin = vi.mocked(stdin);
    let errorCallback: ((error: Error) => void) | null = null;

    mockStdin.on.mockImplementation((event: string, callback: any) => {
      if (event === "error") {
        errorCallback = callback;
      }
      return stdin;
    });

    const promise = readPlanFile("-");

    if (errorCallback) {
      errorCallback(new Error("Stdin read failed"));
    }

    await expect(promise).rejects.toThrow("Failed to read stdin");
  });
});

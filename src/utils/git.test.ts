import { test, expect, describe, beforeEach, vi } from "bun:test";
import { parseGitRemoteUrl, detectRepoAndRef, isGitRepository } from "./git.js";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

// Mock child_process
vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

// Mock path
vi.mock("path", () => ({
  join: vi.fn((...parts) => parts.join("/")),
}));

describe("parseGitRemoteUrl", () => {
  test("returns null for empty or falsy input", () => {
    expect(parseGitRemoteUrl("")).toBeNull();
    expect(parseGitRemoteUrl("   ")).toBeNull();
  });

  test("normalizes HTTPS URLs", () => {
    expect(parseGitRemoteUrl("https://github.com/org/repo")).toBe(
      "https://github.com/org/repo"
    );
    expect(parseGitRemoteUrl("https://github.com/org/repo.git")).toBe(
      "https://github.com/org/repo"
    );
  });

  test("normalizes SSH URLs with .git suffix", () => {
    expect(parseGitRemoteUrl("git@github.com:org/repo.git")).toBe(
      "https://github.com/org/repo"
    );
  });

  test("normalizes SSH URLs without .git suffix", () => {
    expect(parseGitRemoteUrl("git@github.com:org/repo")).toBe(
      "https://github.com/org/repo"
    );
  });

  test("normalizes GitHub short format", () => {
    expect(parseGitRemoteUrl("github.com/org/repo")).toBe(
      "https://github.com/org/repo"
    );
    expect(parseGitRemoteUrl("github.com/org/repo.git")).toBe(
      "https://github.com/org/repo"
    );
  });

  test("trims whitespace", () => {
    expect(parseGitRemoteUrl("  https://github.com/org/repo  ")).toBe(
      "https://github.com/org/repo"
    );
  });

  test("returns null for invalid formats", () => {
    expect(parseGitRemoteUrl("invalid-url")).toBeNull();
    expect(parseGitRemoteUrl("http://github.com/org/repo")).toBeNull();
  });
});

describe("isGitRepository", () => {
  test("returns true when .git directory exists", () => {
    const mockExistsSync = vi.mocked(existsSync);
    mockExistsSync.mockReturnValue(true);

    expect(isGitRepository("/workspace")).toBe(true);
    expect(mockExistsSync).toHaveBeenCalledWith("/workspace/.git");
  });

  test("returns false when .git directory does not exist", () => {
    const mockExistsSync = vi.mocked(existsSync);
    mockExistsSync.mockReturnValue(false);

    expect(isGitRepository("/workspace")).toBe(false);
  });

  test("uses current working directory by default", () => {
    const mockExistsSync = vi.mocked(existsSync);
    mockExistsSync.mockReturnValue(true);

    isGitRepository();

    expect(mockExistsSync).toHaveBeenCalled();
  });
});

describe("detectRepoAndRef", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when .git directory does not exist", async () => {
    const mockExistsSync = vi.mocked(existsSync);
    mockExistsSync.mockReturnValue(false);

    const result = await detectRepoAndRef("/workspace");

    expect(result).toBeNull();
  });

  test("returns null when remote origin is not configured", async () => {
    const mockExistsSync = vi.mocked(existsSync);
    const mockExecSync = vi.mocked(execSync);

    mockExistsSync.mockReturnValue(true);
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes("remote.origin.url")) {
        throw new Error("No remote");
      }
      return "";
    });

    const result = await detectRepoAndRef("/workspace");

    expect(result).toBeNull();
  });

  test("returns repository and branch when git info is available", async () => {
    const mockExistsSync = vi.mocked(existsSync);
    const mockExecSync = vi.mocked(execSync);

    mockExistsSync.mockReturnValue(true);
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes("remote.origin.url")) {
        return "https://github.com/org/repo";
      }
      if (command.includes("rev-parse --abbrev-ref HEAD")) {
        return "main";
      }
      return "";
    });

    const result = await detectRepoAndRef("/workspace");

    expect(result).toEqual({
      repository: "https://github.com/org/repo",
      ref: "main",
    });
  });

  test("returns commit hash when HEAD is detached", async () => {
    const mockExistsSync = vi.mocked(existsSync);
    const mockExecSync = vi.mocked(execSync);

    mockExistsSync.mockReturnValue(true);
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes("remote.origin.url")) {
        return "https://github.com/org/repo";
      }
      if (command.includes("rev-parse --abbrev-ref HEAD")) {
        return "HEAD";
      }
      if (command.includes("rev-parse HEAD")) {
        return "abc123def456";
      }
      return "";
    });

    const result = await detectRepoAndRef("/workspace");

    expect(result).toEqual({
      repository: "https://github.com/org/repo",
      ref: "abc123def456",
    });
  });

  test("returns null when remote URL cannot be parsed", async () => {
    const mockExistsSync = vi.mocked(existsSync);
    const mockExecSync = vi.mocked(execSync);

    mockExistsSync.mockReturnValue(true);
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes("remote.origin.url")) {
        return "invalid-url";
      }
      return "";
    });

    const result = await detectRepoAndRef("/workspace");

    expect(result).toBeNull();
  });

  test("handles errors gracefully", async () => {
    const mockExistsSync = vi.mocked(existsSync);
    mockExistsSync.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const result = await detectRepoAndRef("/workspace");

    expect(result).toBeNull();
  });
});

/**
 * Git detection utilities
 * Detects repository and ref information from a working directory
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

type ExecSyncError = NodeJS.ErrnoException & {
  stderr?: Buffer;
  stdout?: Buffer;
};

export class GitDetectionError extends Error {
  constructor(
    message: string,
    public hint?: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = "GitDetectionError";
  }
}

/**
 * Result of git detection
 */
export interface GitInfo {
  /** Repository URL (normalized to HTTPS format) */
  repository: string;
  /** Current branch, tag, or commit hash */
  ref: string;
}

/**
 * Parse a Git remote URL and normalize it to HTTPS format
 * Supports:
 * - HTTPS: https://github.com/org/repo.git
 * - SSH: git@github.com:org/repo.git
 * - GitHub short format: github.com/org/repo
 */
export function parseGitRemoteUrl(url: string): string | null {
  if (!url) {
    return null;
  }

  // Remove whitespace
  url = url.trim();

  // Already HTTPS format
  if (url.startsWith("https://")) {
    // Remove .git suffix if present
    return url.replace(/\.git$/, "");
  }

  // SSH format: git@github.com:org/repo.git
  const sshMatch = url.match(/^git@([^:]+):(.+)\.git?$/);
  if (sshMatch) {
    const [, host, path] = sshMatch;
    return `https://${host}/${path}`;
  }

  // SSH format without .git: git@github.com:org/repo
  const sshMatchNoGit = url.match(/^git@([^:]+):(.+)$/);
  if (sshMatchNoGit) {
    const [, host, path] = sshMatchNoGit;
    return `https://${host}/${path}`;
  }

  // GitHub short format: github.com/org/repo
  if (url.includes("github.com")) {
    if (!url.startsWith("http")) {
      return `https://${url.replace(/\.git$/, "")}`;
    }
  }

  return null;
}

/**
 * Detect repository and ref information from a working directory
 * @param workingDir - The directory to check (defaults to current working directory)
 * @returns Git information or null if directory is not a git repository
 * @throws GitDetectionError when git commands fail or repository is misconfigured
 */
export async function detectRepoAndRef(
  workingDir: string = process.cwd()
): Promise<GitInfo | null> {
  const gitDir = join(workingDir, ".git");
  if (!existsSync(gitDir)) {
    return null;
  }

  const remoteUrl = runGitCommand(
    "git config --get remote.origin.url",
    workingDir,
    "read the git remote named origin",
    "Set a remote with `git remote add origin <url>` or provide --repo manually."
  ).trim();

  if (!remoteUrl) {
    throw new GitDetectionError(
      "No origin remote is configured for this repository.",
      "Add a remote with `git remote add origin <url>` or pass --repo and --ref."
    );
  }

  const repository = parseGitRemoteUrl(remoteUrl);
  if (!repository) {
    throw new GitDetectionError(
      `Unable to parse git remote URL: ${remoteUrl}`,
      "Use HTTPS or SSH URLs (e.g., https://github.com/org/repo.git)."
    );
  }

  const branchOrHead = runGitCommand(
    "git rev-parse --abbrev-ref HEAD",
    workingDir,
    "determine the current branch",
    "Commit your work or check out a branch before launching an agent."
  ).trim();

  let ref = branchOrHead;
  if (ref === "HEAD") {
    ref = runGitCommand(
      "git rev-parse HEAD",
      workingDir,
      "read the current commit hash",
      "Make sure you have at least one commit. Alternatively, pass --ref."
    ).trim();
  }

  if (!ref) {
    throw new GitDetectionError(
      "Could not determine the current git ref.",
      "Make sure the repository has commits or specify --ref."
    );
  }

  return {
    repository,
    ref,
  };
}

/**
 * Check if a directory is a git repository
 */
export function isGitRepository(workingDir: string = process.cwd()): boolean {
  const gitDir = join(workingDir, ".git");
  return existsSync(gitDir);
}

function runGitCommand(
  command: string,
  cwd: string,
  actionDescription: string,
  hint?: string
): string {
  try {
    return execSync(command, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw createGitDetectionError(error, actionDescription, hint);
  }
}

function createGitDetectionError(
  error: unknown,
  actionDescription: string,
  defaultHint?: string
): GitDetectionError {
  if (error instanceof GitDetectionError) {
    return error;
  }

  if (isExecError(error) && error.code === "ENOENT") {
    return new GitDetectionError(
      "Git is not installed or not available in your PATH.",
      "Install Git and try again.",
      error
    );
  }

  const stderr = isExecError(error) ? bufferToMessage(error.stderr) : null;
  const stdout = isExecError(error) ? bufferToMessage(error.stdout) : null;
  const details = stderr || stdout || (error instanceof Error ? error.message : "");

  return new GitDetectionError(
    `Git command failed while trying to ${actionDescription}${details ? `: ${details}` : "."}`,
    defaultHint,
    error
  );
}

function isExecError(error: unknown): error is ExecSyncError {
  return typeof error === "object" && error !== null && ("stderr" in error || "stdout" in error);
}

function bufferToMessage(buffer?: Buffer): string | null {
  if (!buffer) {
    return null;
  }
  const text = buffer.toString("utf-8").trim();
  return text.length > 0 ? text : null;
}


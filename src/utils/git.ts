/**
 * Git detection utilities
 * Detects repository and ref information from a working directory
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

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
 * Parse a Git remote URL and normalize it to HTTPS format.
 *
 * Supports:
 * - HTTPS: `https://github.com/org/repo.git`
 * - SSH: `git@github.com:org/repo.git`
 * - GitHub short format: `github.com/org/repo`
 *
 * @param {string} url - Remote URL retrieved from `git config`.
 * @returns {string | null} Normalized HTTPS URL or `null` when parsing fails.
 * @example
 * parseGitRemoteUrl("git@github.com:buildwithcontext/app.git");
 * // => "https://github.com/buildwithcontext/app"
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
 * Detect repository and ref information from a working directory.
 *
 * Uses synchronous git commands for reliability, but wraps them in an async API
 * so the consumer can await the call alongside other async work.
 *
 * @param {string} [workingDir=process.cwd()] - Directory to inspect for git metadata.
 * @returns {Promise<GitInfo | null>} Repository URL and ref, or `null` if detection fails.
 * @example
 * const info = await detectRepoAndRef();
 * // => { repository: "https://github.com/org/repo", ref: "main" }
 */
export async function detectRepoAndRef(
  workingDir: string = process.cwd()
): Promise<GitInfo | null> {
  try {
    // Check if .git directory exists
    const gitDir = join(workingDir, ".git");
    if (!existsSync(gitDir)) {
      return null;
    }

    // Get the remote URL
    let remoteUrl: string;
    try {
      remoteUrl = execSync("git config --get remote.origin.url", {
        cwd: workingDir,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      // No remote origin configured
      return null;
    }

    // Parse and normalize the remote URL
    const repository = parseGitRemoteUrl(remoteUrl);
    if (!repository) {
      return null;
    }

    // Get current branch or commit
    let ref: string;
    try {
      // Try to get current branch name
      ref = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: workingDir,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();

      // If HEAD is detached, get the commit hash instead
      if (ref === "HEAD") {
        ref = execSync("git rev-parse HEAD", {
          cwd: workingDir,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();
      }
    } catch {
      // Fallback to HEAD commit hash
      try {
        ref = execSync("git rev-parse HEAD", {
          cwd: workingDir,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();
      } catch {
        return null;
      }
    }

    return {
      repository,
      ref,
    };
  } catch (error) {
    // Git detection failed
    return null;
  }
}

/**
 * Check if a directory is a git repository by verifying the `.git` folder exists.
 *
 * @param {string} [workingDir=process.cwd()] - Directory to inspect.
 * @returns {boolean} `true` when the directory appears to be a git repo.
 * @example
 * isGitRepository("/workspace");
 * // => true
 */
export function isGitRepository(workingDir: string = process.cwd()): boolean {
  const gitDir = join(workingDir, ".git");
  return existsSync(gitDir);
}


import { ValidationResult, success, failure } from "./common.js";

export const GITHUB_OWNER_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,38})$/;
export const GITHUB_REPO_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,99})$/;

/**
 * Validate a GitHub repository URL entered by a user.
 *
 * Accepts HTTPS (`https://github.com/org/repo`) and SSH (`git@github.com:org/repo`) formats
 * and normalizes obvious mistakes such as stray whitespace.
 *
 * @param {string} url - Raw repository URL provided by the user interface.
 * @returns {{ valid: boolean; error?: string }} Result describing whether the value passed basic checks.
 * @example
 * validateRepositoryUrl("https://github.com/buildwithcontext/app");
 * // => { valid: true }
 */
export function validateRepositoryUrl(url: string): ValidationResult {
  if (!url || typeof url !== "string") {
    return failure("Repository URL is required.");
  }

  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return failure("Repository URL cannot be empty.");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return failure("Repository URL is not a valid URL. Example: https://github.com/owner/repo");
    }

    if (parsedUrl.protocol !== "https:") {
      return failure("Use an https:// GitHub URL (e.g., https://github.com/owner/repo).");
    }

    if (parsedUrl.hostname.toLowerCase() !== "github.com") {
      return failure("Only github.com repositories are supported.");
    }

    const pathParts = parsedUrl.pathname
      .replace(/^\//, "")
      .replace(/\.git$/i, "")
      .replace(/\/+$/, "")
      .split("/")
      .filter(Boolean);

    if (pathParts.length < 2) {
      return failure("Repository URL must include both the owner and repository name (e.g., github.com/owner/repo).");
    }

    if (pathParts.length > 2) {
      return failure("Repository URL should only include the owner and repository. Remove extra path segments.");
    }

    const [owner, repo] = pathParts;

    if (!GITHUB_OWNER_REGEX.test(owner)) {
      return failure("Owner contains unsupported characters. Use letters, numbers, dots, underscores, or dashes.");
    }

    if (!GITHUB_REPO_REGEX.test(repo)) {
      return failure("Repository name contains unsupported characters. Use letters, numbers, dots, underscores, or dashes.");
    }

    return success();
  }

  const sshMatch = trimmed.match(/^git@github\.com:(.+)$/i);
  if (sshMatch) {
    const repoPart = sshMatch[1].replace(/\.git$/i, "").replace(/\/+$/, "");
    const segments = repoPart.split("/").filter(Boolean);

    if (segments.length !== 2) {
      return failure("SSH URLs must look like git@github.com:owner/repo.");
    }

    const [owner, repo] = segments;

    if (!GITHUB_OWNER_REGEX.test(owner)) {
      return failure("Owner contains unsupported characters. Use letters, numbers, dots, underscores, or dashes.");
    }

    if (!GITHUB_REPO_REGEX.test(repo)) {
      return failure("Repository name contains unsupported characters. Use letters, numbers, dots, underscores, or dashes.");
    }

    return success();
  }

  return failure("Invalid repository URL. Use https://github.com/owner/repo or git@github.com:owner/repo.");
}

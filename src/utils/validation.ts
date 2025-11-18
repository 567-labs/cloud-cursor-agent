/**
 * Input validation utilities
 */

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
export function validateRepositoryUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "Repository URL is required" };
  }

  const trimmed = url.trim();

  // HTTPS format: https://github.com/org/repo
  if (trimmed.startsWith("https://github.com/")) {
    const parts = trimmed.slice(19).split("/");
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { valid: true };
    }
  }

  // SSH format: git@github.com:org/repo.git or git@github.com:org/repo
  if (trimmed.startsWith("git@github.com:")) {
    const parts = trimmed.slice(15).replace(/\.git$/, "").split("/");
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { valid: true };
    }
  }

  return {
    valid: false,
    error: "Invalid repository URL. Expected format: https://github.com/org/repo or git@github.com:org/repo",
  };
}

/**
 * Validate a git ref value (branch name, tag, or commit hash).
 *
 * Ensures the string exists, is not empty after trimming, and does not include
 * characters that git disallows in ref names.
 *
 * @param {string} ref - Candidate git ref string from user input.
 * @returns {{ valid: boolean; error?: string }} Validation result with an error reason when invalid.
 */
export function validateRef(ref: string): { valid: boolean; error?: string } {
  if (!ref || typeof ref !== "string") {
    return { valid: false, error: "Ref is required" };
  }

  const trimmed = ref.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Ref cannot be empty" };
  }

  // Basic validation - refs shouldn't contain certain characters
  if (/[~^:?*\[\]\\]/.test(trimmed)) {
    return {
      valid: false,
      error: "Invalid ref format. Refs cannot contain certain special characters.",
    };
  }

  return { valid: true };
}

/**
 * Validate a file path string gathered from configuration.
 *
 * Currently checks only for presence and non-empty length once trimmed.
 *
 * @param {string} filePath - File path that may be relative or absolute.
 * @returns {{ valid: boolean; error?: string }} Validation result describing whether the path looks usable.
 */
export function validateFilePath(filePath: string): { valid: boolean; error?: string } {
  if (!filePath || typeof filePath !== "string") {
    return { valid: false, error: "File path is required" };
  }

  const trimmed = filePath.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "File path cannot be empty" };
  }

  return { valid: true };
}

/**
 * Validate an agent identifier, typically returned from the backend.
 *
 * Ensures the ID exists, trims it, and enforces a basic prefix/length check like `bc_abc123`.
 *
 * @param {string} id - Agent identifier supplied by the user.
 * @returns {{ valid: boolean; error?: string }} Flag describing if the ID matches the expected format.
 */
export function validateAgentId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== "string") {
    return { valid: false, error: "Agent ID is required" };
  }

  const trimmed = id.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Agent ID cannot be empty" };
  }

  // Agent IDs typically start with "bc_"
  if (!trimmed.startsWith("bc_") && trimmed.length < 3) {
    return {
      valid: false,
      error: "Invalid agent ID format. Expected format: bc_xxxxx",
    };
  }

  return { valid: true };
}

/**
 * Validate an API key string for obvious problems (empty, too short).
 *
 * These checks help minimize round trips before the key hits the network or backend.
 *
 * @param {string} apiKey - API key captured from local input.
 * @returns {{ valid: boolean; error?: string }} Result noting whether the key is plausibly valid.
 */
export function validateApiKey(apiKey: string): { valid: boolean; error?: string } {
  if (!apiKey || typeof apiKey !== "string") {
    return { valid: false, error: "API key is required" };
  }

  const trimmed = apiKey.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "API key cannot be empty" };
  }

  // Basic length check - API keys are typically longer
  if (trimmed.length < 10) {
    return {
      valid: false,
      error: "API key appears to be invalid (too short)",
    };
  }

  return { valid: true };
}


/**
 * Input validation utilities
 */

/**
 * Validate a GitHub repository URL
 * Accepts both HTTPS and SSH formats
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
 * Validate a git ref (branch, tag, or commit hash)
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
 * Validate a file path
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
 * Validate an agent ID
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
 * Validate API key format (basic check)
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


/**
 * Common validation helpers shared across validation modules.
 */

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

// Accept both formats: bc_abc123 (old) or bc-uuid-format (new UUID format)
export const AGENT_ID_REGEX = /^bc[-_][a-z0-9-]{5,}$/i;

/**
 * Build a successful validation result object.
 *
 * @returns {ValidationResult} Success tuple that callers can return directly.
 * @example
 * success();
 * // => { valid: true }
 */
export const success = (): ValidationResult => ({ valid: true });

/**
 * Build a failed validation result with a human-friendly error message.
 *
 * @param {string} error - Reason that describes what was invalid.
 * @returns {ValidationResult} Object containing the error explanation.
 * @example
 * failure("Repository URL is required.");
 * // => { valid: false, error: "Repository URL is required." }
 */
export const failure = (error: string): ValidationResult => ({
  valid: false,
  error,
});

/**
 * Validate a file path string gathered from configuration.
 *
 * Currently checks only for presence and non-empty length once trimmed.
 *
 * @param {string} filePath - File path that may be relative or absolute.
 * @returns {ValidationResult} Validation result describing whether the path looks usable.
 * @example
 * validateFilePath("./plan.md");
 * // => { valid: true }
 */
export function validateFilePath(filePath: string): ValidationResult {
  if (!filePath || typeof filePath !== "string") {
    return failure("File path is required.");
  }

  const trimmed = filePath.trim();

  if (trimmed.length === 0) {
    return failure("File path cannot be empty.");
  }

  return success();
}

/**
 * Validate an agent identifier, typically returned from the backend.
 *
 * Ensures the ID exists, trims it, and enforces a basic prefix/length check like `bc_abc123`.
 *
 * @param {string} id - Agent identifier supplied by the user.
 * @returns {ValidationResult} Flag describing if the ID matches the expected format.
 * @example
 * validateAgentId("bc_abc123");
 * // => { valid: true }
 */
export function validateAgentId(id: string): ValidationResult {
  if (!id || typeof id !== "string") {
    return failure("Agent ID is required.");
  }

  const trimmed = id.trim();

  if (trimmed.length === 0) {
    return failure("Agent ID cannot be empty.");
  }

  if (!AGENT_ID_REGEX.test(trimmed)) {
    return failure(
      "Agent ID must look like bc_123abc or bc-uuid-format (letters, numbers, and hyphens only, at least 5 characters after bc- or bc_)."
    );
  }

  return success();
}

/**
 * Validate an API key string for obvious problems (empty, too short).
 *
 * These checks help minimize round trips before the key hits the network or backend.
 *
 * @param {string} apiKey - API key captured from local input.
 * @returns {ValidationResult} Result noting whether the key is plausibly valid.
 * @example
 * validateApiKey("sk-proj-super-secret");
 * // => { valid: true }
 */
export function validateApiKey(apiKey: string): ValidationResult {
  if (!apiKey || typeof apiKey !== "string") {
    return failure("API key is required.");
  }

  const trimmed = apiKey.trim();

  if (trimmed.length === 0) {
    return failure("API key cannot be empty.");
  }

  // Basic length check - API keys are typically longer
  if (trimmed.length < 10) {
    return failure("API key appears to be invalid (too short).");
  }

  return success();
}

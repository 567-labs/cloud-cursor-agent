/**
 * Shared validation helpers and generic validators
 */

export type ValidationResult = { valid: true } | { valid: false; error: string };

export const success = (): ValidationResult => ({ valid: true });
export const failure = (error: string): ValidationResult => ({ valid: false, error });

/**
 * Validate a file path string gathered from configuration.
 *
 * Currently checks only for presence and non-empty length once trimmed.
 *
 * @param {string} filePath - File path that may be relative or absolute.
 * @returns {{ valid: boolean; error?: string }} Validation result describing whether the path looks usable.
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
 * Validate an API key string for obvious problems (empty, too short).
 *
 * These checks help minimize round trips before the key hits the network or backend.
 *
 * @param {string} apiKey - API key captured from local input.
 * @returns {{ valid: boolean; error?: string }} Result noting whether the key is plausibly valid.
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

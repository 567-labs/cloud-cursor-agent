import { ValidationResult, success, failure } from "./common.js";

export const AGENT_ID_REGEX = /^bc_[a-z0-9]{5,}$/i;

/**
 * Validate an agent identifier, typically returned from the backend.
 *
 * Ensures the ID exists, trims it, and enforces a basic prefix/length check like `bc_abc123`.
 *
 * @param {string} id - Agent identifier supplied by the user.
 * @returns {{ valid: boolean; error?: string }} Flag describing if the ID matches the expected format.
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
    return failure("Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_).");
  }

  return success();
}

/**
 * Git validation utilities.
 */

import { failure, success, type ValidationResult } from "./common";

export const INVALID_REF_CHARACTERS = /[\u0000-\u001F\u007F\s~^:?*\[\]\\]/;

/**
 * Validate a git ref value (branch name, tag, or commit hash).
 *
 * Ensures the string exists, is not empty after trimming, and does not include
 * characters that git disallows in ref names.
 *
 * @param {string} ref - Candidate git ref string from user input.
 * @returns {ValidationResult} Validation result with an error reason when invalid.
 * @example
 * validateRef("feature/login-flow");
 * // => { valid: true }
 */
export function validateRef(ref: string): ValidationResult {
  if (!ref || typeof ref !== "string") {
    return failure("Ref is required.");
  }

  const trimmed = ref.trim();

  if (trimmed.length === 0) {
    return failure("Ref cannot be empty.");
  }

  if (trimmed.length > 255) {
    return failure("Ref cannot exceed 255 characters.");
  }

  if (INVALID_REF_CHARACTERS.test(trimmed)) {
    return failure(
      "Ref cannot contain spaces or any of ~ ^ : ? * [ ] \\ characters."
    );
  }

  if (trimmed.startsWith("/") || trimmed.endsWith("/")) {
    return failure("Ref cannot start or end with a slash.");
  }

  if (trimmed.includes("//")) {
    return failure("Ref cannot contain consecutive slashes.");
  }

  if (
    trimmed.startsWith(".") ||
    trimmed.endsWith(".") ||
    trimmed.includes("..")
  ) {
    return failure("Ref cannot start, end, or contain consecutive periods.");
  }

  if (trimmed.startsWith("-")) {
    return failure("Ref cannot start with a dash.");
  }

  if (trimmed.includes("@{")) {
    return failure("Ref cannot contain the sequence '@{'.");
  }

  if (trimmed.endsWith(".lock")) {
    return failure("Ref cannot end with '.lock'.");
  }

  return success();
}

/**
 * Validate a branch name, enforcing git ref rules plus branch-specific constraints.
 *
 * @param {string} branch - Proposed branch name (for example, `feature/docs`).
 * @returns {ValidationResult} Result describing whether the branch can be created safely.
 * @example
 * validateBranchName("feature/add-jsdoc");
 * // => { valid: true }
 */
export function validateBranchName(branch: string): ValidationResult {
  const base = validateRef(branch);
  if (!base.valid) {
    return failure(base.error.replace(/^Ref/i, "Branch name"));
  }

  const trimmed = branch.trim();

  if (trimmed === "HEAD") {
    return failure(
      "Branch name cannot be 'HEAD' because it is reserved by git."
    );
  }

  if (/^refs\//i.test(trimmed)) {
    return failure(
      "Provide the branch name without the 'refs/' prefix (e.g., use main instead of refs/heads/main)."
    );
  }

  if (!/[A-Za-z]/.test(trimmed)) {
    return failure(
      "Branch name should include at least one letter to keep it descriptive."
    );
  }

  return success();
}
